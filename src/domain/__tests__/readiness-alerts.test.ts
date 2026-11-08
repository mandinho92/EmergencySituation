import { describe, expect, it } from "vitest";
import { computeAlerts } from "../preparedness/alerts";
import { buildHomeKitPlan } from "../preparedness/home-kit";
import { mergeKit, type KitLine } from "../preparedness/kit-lines";
import { computeReadiness, GLOBAL_WEIGHTS, isBagReady, type ReadinessInput } from "../preparedness/readiness";
import { defaultRisksFor, effectiveRisks } from "../locations/portugal";
import { member, settings, snapshot } from "./fixtures";

function baseInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  const plan = buildHomeKitPlan(snapshot({ members: [member({ category: "adult" }), member({ category: "adult" })] }), settings({ targetDays: 3 }));
  return {
    memberCount: 2,
    adultCount: 2,
    targetDays: 3,
    homeLines: mergeKit(plan.requirements, []),
    water: { requiredLiters: plan.water.totalLiters, haveLiters: 0, perDayTotal: plan.water.perDay.total },
    foodAutonomyDays: 0,
    bags: [],
    energy: { tier: "undecided", stationAcquired: false, hasStationSelected: false },
    plan: { meetingPointKinds: [], contactsCount: 0, hasLocation: false },
    communication: { hasPrimaryContact: false, hasOutOfRegionContact: false, channelsCount: 0, hasNoInternetPlan: false, hasCallsFailPlan: false },
    overdueReviews: 0,
    expiringSoon: 0,
    ...overrides,
  };
}

const packedLine = (priority: 0 | 1 | 2 | 3, packed: boolean): KitLine => ({
  id: `l${priority}${packed}`, key: null, rowId: null, productKey: null, name: "x", category: "water", unit: "un", required: 1, computedRequired: 1,
  have: packed ? 1 : 0, missing: packed ? 0 : 1, priority, excluded: false, isCustom: false, purchasable: true, rationale: null, acquiredVia: null,
  purchasedBy: null, purchasedAt: null, expiresOn: null, productId: null, notes: null, storageLocation: null, isPacked: packed, unitWeightGrams: null,
});

describe("computeReadiness", () => {
  it("weights sum to 100", () => {
    expect(Object.values(GLOBAL_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("starts at 0% and proposes at most 5 actions, water first", () => {
    const r = computeReadiness(baseInput());
    expect(r.scores.global).toBe(0);
    expect(r.actions.length).toBe(5);
    expect(r.actions[0].key).toBe("water");
    expect(r.actions[0].title).toMatch(/Comprar 33 L/);
  });

  it("asks to add members when the household is empty", () => {
    const r = computeReadiness(baseInput({ memberCount: 0 }));
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0].href).toBe("/app/members");
  });

  it("reflects water and food autonomy", () => {
    const r = computeReadiness(baseInput({ water: { requiredLiters: 33, haveLiters: 20, perDayTotal: 10 }, foodAutonomyDays: 2 }));
    expect(r.indicators.waterDays).toBe(2);
    expect(r.indicators.foodDays).toBe(2);
    expect(r.scores.water).toBe(61);
    expect(r.scores.food).toBe(67);
  });

  it("scores the plan and communication from defined facts", () => {
    const r = computeReadiness(
      baseInput({
        plan: { meetingPointKinds: ["near_home", "out_of_area"], contactsCount: 2, hasLocation: true },
        communication: { hasPrimaryContact: true, hasOutOfRegionContact: true, channelsCount: 3, hasNoInternetPlan: true, hasCallsFailPlan: true },
      }),
    );
    expect(r.scores.plan).toBe(100);
    expect(r.scores.communication).toBe(100);
    expect(r.scores.global).toBe(25);
  });

  it("marks energy as configured but not acquired", () => {
    const r = computeReadiness(baseInput({ energy: { tier: "balanced", stationAcquired: false, hasStationSelected: true } }));
    expect(r.indicators.energyStatus).toBe("configured_not_acquired");
    const chosen = computeReadiness(baseInput({ energy: { tier: "balanced", stationAcquired: false, hasStationSelected: false } }));
    expect(chosen.indicators.energyStatus).toBe("tier_chosen");
  });

  it("counts a bag as ready only when every P0/P1 item is packed", () => {
    expect(isBagReady([packedLine(0, true), packedLine(1, true), packedLine(3, false)])).toBe(true);
    expect(isBagReady([packedLine(0, true), packedLine(1, false)])).toBe(false);
  });

  it("penalises missing adult bags", () => {
    const oneBag = computeReadiness(baseInput({ bags: [{ id: "b", name: "Mochila", lines: [packedLine(0, true)] }] }));
    expect(oneBag.scores.goBags).toBe(50);
    expect(oneBag.indicators).toMatchObject({ bagsReady: 1, bagsTotal: 1 });
  });
});

describe("computeAlerts", () => {
  const now = new Date("2026-06-15T10:00:00Z");
  it("flags expired and soon-to-expire items", () => {
    const alerts = computeAlerts(
      {
        expiring: [
          { id: "a", name: "Água", expiresOn: "2026-06-01", href: "/x" },
          { id: "b", name: "Paracetamol", expiresOn: "2026-07-01", href: "/x", sensitive: true },
          { id: "c", name: "Arroz", expiresOn: "2027-01-01", href: "/x" },
        ],
        maintainable: [],
        bags: [],
        reviews: [],
      },
      now,
    );
    expect(alerts.map((a) => [a.id, a.kind, a.severity])).toEqual([
      ["exp:a", "expired", "high"],
      ["exp:b", "expiring", "high"],
    ]);
  });

  it("flags recharge, maintenance intervals, stale bags and due reviews", () => {
    const alerts = computeAlerts(
      {
        expiring: [],
        maintainable: [
          { id: "pb", name: "Powerbank", condition: "needs_recharge", maintenanceIntervalDays: null, lastMaintainedOn: null, href: "/i" },
          { id: "ext", name: "Extintor", condition: "ok", maintenanceIntervalDays: 90, lastMaintainedOn: "2026-03-01", href: "/i" },
        ],
        bags: [{ id: "bag", name: "Mochila do Rui", lastCheckedAt: "2026-01-01T00:00:00Z", createdAt: "2025-12-01T00:00:00Z" }],
        reviews: [{ id: "r", title: "Revisão trimestral", dueOn: "2026-06-10" }],
      },
      now,
    );
    expect(alerts.map((a) => a.kind).sort()).toEqual(["bag_not_checked", "maintenance_due", "needs_recharge", "review_due"]);
  });
});

describe("regional risks", () => {
  it("adds high regional risks to universal ones", () => {
    const lisboa = defaultRisksFor("lisboa");
    expect(lisboa).toContain("earthquake");
    expect(lisboa).toContain("power_outage");
    expect(defaultRisksFor("braganca")).toContain("cold_wave");
    expect(defaultRisksFor("braganca")).not.toContain("earthquake");
  });

  it("considers every risk relevant without a known district", () => {
    expect(defaultRisksFor(null)).toHaveLength(10);
  });

  it("prefers the family's own selection and ignores unknown keys", () => {
    expect(effectiveRisks(["flood", "zombies"], "lisboa")).toEqual(["flood"]);
  });
});
