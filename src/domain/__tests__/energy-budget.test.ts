import { describe, expect, it } from "vitest";
import { allocateBudget } from "../budget/budget";
import { computeEnergyNeeds, pickStations, planSolar, recommendTier, type StationCandidate } from "../energy/energy";

const settings = { autonomyDays: 3, inverterEfficiency: 0.85, peakSunHours: 3, solarDerate: 0.75 };

describe("computeEnergyNeeds", () => {
  it("separates Wh (energy) from W (power) and applies conversion losses", () => {
    const n = computeEnergyNeeds(
      [
        { name: "Telemóvel", watts: 10, hoursPerDay: 2, quantity: 2, isAc: false }, // 40 Wh → 44.4
        { name: "Router", watts: 12, hoursPerDay: 10, quantity: 1, isAc: true }, // 120 Wh → 141.2
      ],
      settings,
    );
    expect(n.deviceWhPerDay).toBe(160);
    expect(n.batteryWhPerDay).toBe(186);
    // 185.6 × 3 / 0.85 = 655.1 → 656
    expect(n.recommendedCapacityWh).toBe(656);
    expect(n.requiredAcOutputW).toBe(15); // 12 × 1.25
    expect(n.hasAcLoads).toBe(true);
  });

  it("accounts for surge power of motor loads", () => {
    const n = computeEnergyNeeds([{ name: "Frigorífico", watts: 100, surgeWatts: 600, hoursPerDay: 8, quantity: 1, isAc: true }], settings);
    expect(n.requiredSurgeW).toBe(600);
  });

  it("sizes solar for one day of consumption under derated sun hours", () => {
    const n = computeEnergyNeeds([{ name: "Lâmpada", watts: 9, hoursPerDay: 10, quantity: 1, isAc: false }], settings);
    // 90 / 0.9 = 100 Wh/day → 100 / (3 × 0.75) = 44.4 → 45 W
    expect(n.solarWattsForDailyNeed).toBe(45);
  });
});

describe("recommendTier", () => {
  const needs = (wh: number, ac = true) => ({ ...computeEnergyNeeds([], settings), recommendedCapacityWh: wh, hasAcLoads: ac });
  it("picks the smallest tier that covers the need", () => {
    expect(recommendTier(needs(0))).toBe("none");
    expect(recommendTier(needs(120, false))).toBe("powerbanks");
    expect(recommendTier(needs(120, true))).toBe("economic");
    expect(recommendTier(needs(800))).toBe("balanced");
    expect(recommendTier(needs(1900))).toBe("advanced");
    expect(recommendTier(needs(5000))).toBe("beyond_portable");
  });
});

describe("pickStations", () => {
  const stations: StationCandidate[] = [
    { id: "s256", name: "256 Wh", capacityWh: 256, acOutputW: 300, surgeW: 600, solarInputMaxW: 110, priceCents: 25000 },
    { id: "s768", name: "768 Wh", capacityWh: 768, acOutputW: 800, surgeW: 1600, solarInputMaxW: 220, priceCents: 60000 },
    { id: "s1024", name: "1024 Wh", capacityWh: 1024, acOutputW: 1800, surgeW: 2700, solarInputMaxW: 500, priceCents: 90000 },
    { id: "s2048", name: "2048 Wh", capacityWh: 2048, acOutputW: 2400, surgeW: 4800, solarInputMaxW: 1000, priceCents: 180000 },
  ];

  it("never recommends a larger, more expensive station than needed", () => {
    const needs = computeEnergyNeeds([{ name: "Router", watts: 12, hoursPerDay: 12, quantity: 1, isAc: true }, { name: "Telemóvel", watts: 10, hoursPerDay: 2, quantity: 2, isAc: false }], settings);
    const { recommended, economic, larger } = pickStations(stations, needs);
    expect(recommended?.station.id).toBe("s768");
    expect(economic?.station.id).toBe("s256");
    expect(larger?.station.id).toBe("s1024");
    expect(economic!.autonomyDays).toBeLessThan(settings.autonomyDays);
  });

  it("requires enough AC power and surge", () => {
    const needs = computeEnergyNeeds([{ name: "Frigorífico", watts: 100, surgeWatts: 1000, hoursPerDay: 1, quantity: 1, isAc: true }], { ...settings, autonomyDays: 1 });
    const { recommended } = pickStations(stations, needs);
    expect(recommended?.station.id).toBe("s768"); // 256 Wh model's 600 W surge is insufficient
  });

  it("returns no recommendation when nothing is big enough", () => {
    const needs = { ...computeEnergyNeeds([], settings), recommendedCapacityWh: 10000, batteryWhPerDay: 3000 };
    expect(pickStations(stations, needs).recommended).toBeNull();
  });
});

describe("planSolar", () => {
  it("limits the array by the station's solar input and estimates recharge time", () => {
    const needs = computeEnergyNeeds([{ name: "Carga", watts: 100, hoursPerDay: 9, quantity: 1, isAc: false }], settings);
    const station = { id: "s", name: "S", capacityWh: 768, acOutputW: 800, surgeW: null, solarInputMaxW: 220, priceCents: null };
    const plan = planSolar({ id: "p", name: "100 W", panelW: 100, priceCents: null }, station, needs, settings, 3);
    expect(plan.arrayW).toBe(300);
    expect(plan.usableArrayW).toBe(220);
    expect(plan.limitedByStationInput).toBe(true);
    expect(plan.dailyHarvestWh).toBe(495); // 220 × 3 × 0.75
    expect(plan.fullRechargeDays).toBe(1.6);
    expect(plan.coversDailyNeed).toBe(false); // needs 1000 Wh/day
  });
});

describe("allocateBudget", () => {
  it("prioritises essentials and reserves budget for them", () => {
    const r = allocateBudget(
      [
        { id: "water", priority: 0, category: "water", costCents: 1500 },
        { id: "radio", priority: 0, category: "communications", costCents: 4000 },
        { id: "pmr", priority: 3, category: "communications", costCents: 3000 },
        { id: "tarp", priority: 2, category: "protection", costCents: 1000 },
      ],
      5000,
    );
    expect(r.status.water).toBe("within_budget");
    expect(r.status.radio).toBe("over_budget");
    // Remaining 35 € is reserved for the radio: lower priorities stay pending.
    expect(r.status.tarp).toBe("over_budget");
    expect(r.status.pmr).toBe("over_budget");
    expect(r.blockedAtPriority).toBe(0);
    expect(r.totalCents).toBe(9500);
    expect(r.essentialCents).toBe(5500);
    expect(r.remainingBudgetCents).toBe(3500);
  });

  it("fills cheaper lines first within the same priority", () => {
    const r = allocateBudget(
      [
        { id: "a", priority: 1, category: "x", costCents: 3000 },
        { id: "b", priority: 1, category: "x", costCents: 1000 },
        { id: "c", priority: 1, category: "x", costCents: 1500 },
      ],
      2600,
    );
    expect(r.status).toEqual({ a: "over_budget", b: "within_budget", c: "within_budget" });
  });

  it("keeps lines without price visible and separate", () => {
    const r = allocateBudget([{ id: "cash", priority: 1, category: "documents", costCents: null }], 1000);
    expect(r.status.cash).toBe("no_price");
    expect(r.linesWithoutPrice).toBe(1);
  });

  it("treats a null budget as unlimited", () => {
    const r = allocateBudget([{ id: "a", priority: 3, category: "x", costCents: 10_000_00 }], null);
    expect(r.status.a).toBe("within_budget");
    expect(r.remainingBudgetCents).toBeNull();
  });

  it("aggregates cost by category", () => {
    const r = allocateBudget(
      [
        { id: "a", priority: 0, category: "water", costCents: 500 },
        { id: "b", priority: 0, category: "water", costCents: 700 },
        { id: "c", priority: 1, category: "food", costCents: 300 },
      ],
      1000,
    );
    expect(r.byCategory[0]).toEqual({ category: "water", totalCents: 1200, withinBudgetCents: 500 });
  });
});
