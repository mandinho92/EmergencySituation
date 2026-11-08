import { describe, expect, it } from "vitest";
import { buildHomeKitPlan } from "../preparedness/home-kit";
import { mergeKit } from "../preparedness/kit-lines";
import { dwelling, member, pet, settings, snapshot } from "./fixtures";

const keys = (p: ReturnType<typeof buildHomeKitPlan>) => p.requirements.map((r) => r.key);

describe("buildHomeKitPlan", () => {
  it("returns no requirements without members", () => {
    expect(buildHomeKitPlan(snapshot(), settings()).requirements).toEqual([]);
  });

  it("covers all 17 home kit categories that apply to a full household", () => {
    const plan = buildHomeKitPlan(
      snapshot({
        members: [member({ category: "adult" }), member({ category: "senior", reducedMobility: true }), member({ category: "baby", usesDiapers: true })],
        pets: [pet({ species: "cat" })],
        dwelling: dwelling({ hasGas: false, hasElectricStove: true, hasFireplace: true, hasGenerator: true }),
        risks: ["earthquake", "flood", "wildfire"],
      }),
      settings({ targetDays: 7 }),
    );
    const categories = new Set(plan.requirements.map((r) => r.category));
    for (const c of ["water", "food", "energy", "kitchen", "first_aid", "fire", "lighting", "communications", "hygiene",
      "sanitation", "tools", "protection", "shelter", "documents", "children", "seniors", "pets"]) {
      expect(categories.has(c as never), `category ${c}`).toBe(true);
    }
  });

  it("requires a camping stove only without gas", () => {
    const people = [member({ category: "adult" })];
    expect(keys(buildHomeKitPlan(snapshot({ members: people, dwelling: dwelling({ hasGas: true }) }), settings()))).not.toContain("kitchen.camping_stove");
    expect(keys(buildHomeKitPlan(snapshot({ members: people, dwelling: dwelling({ hasGas: false, hasElectricStove: true }) }), settings()))).toContain("kitchen.camping_stove");
  });

  it("makes a CO detector essential with fireplace, gas or generator", () => {
    const plan = buildHomeKitPlan(snapshot({ members: [member({ category: "adult" })], dwelling: dwelling({ hasGas: false, hasFireplace: true }) }), settings());
    expect(plan.requirements.find((r) => r.key === "fire.co_detector")?.priority).toBe(0);
  });

  it("computes diapers for babies and declared toddlers", () => {
    const plan = buildHomeKitPlan(
      snapshot({ members: [member({ category: "adult" }), member({ category: "baby", ageYears: 1 }), member({ category: "child", ageYears: 3, usesDiapers: true })] }),
      settings({ targetDays: 7 }),
    );
    expect(plan.requirements.find((r) => r.key === "children.diapers")?.quantity).toBe(6 * 7 + 5 * 7);
  });

  it("adds flood barriers only for ground-level dwellings in flood risk", () => {
    const members = [member({ category: "adult" })];
    expect(keys(buildHomeKitPlan(snapshot({ members, risks: ["flood"], dwelling: dwelling({ type: "apartment" }) }), settings()))).not.toContain("protection.flood_barrier");
    expect(keys(buildHomeKitPlan(snapshot({ members, risks: ["flood"], dwelling: dwelling({ type: "house" }) }), settings()))).toContain("protection.flood_barrier");
  });

  it("raises PMR446 priority when the communication plan uses it", () => {
    const members = [member({ category: "adult" })];
    const without = buildHomeKitPlan(snapshot({ members }), settings()).requirements.find((r) => r.key === "communications.pmr446");
    const withPmr = buildHomeKitPlan(snapshot({ members, communicationChannels: ["pmr446"] }), settings()).requirements.find((r) => r.key === "communications.pmr446");
    expect(without?.priority).toBe(3);
    expect(withPmr?.priority).toBe(1);
  });

  it("produces unique keys that satisfy the database item_key constraint", () => {
    const plan = buildHomeKitPlan(
      snapshot({
        members: [member({ category: "adult", specialEquipment: "concentrador de oxigénio" }), member({ category: "baby", infantFeeding: "formula" })],
        pets: [pet({ species: "dog", hasMedication: true }), pet({ species: "cat" })],
        dwelling: dwelling({ hasGas: false, hasGenerator: true }),
        risks: ["earthquake", "flood"],
      }),
      settings({ targetDays: 14 }),
    );
    const k = keys(plan);
    expect(new Set(k).size).toBe(k.length);
    for (const key of k) expect(key).toMatch(/^[a-z0-9_.-]{2,60}$/);
  });

  it("never prescribes medication quantities", () => {
    const plan = buildHomeKitPlan(snapshot({ members: [member({ category: "adult" }), member({ category: "child" })] }), settings());
    const meds = plan.requirements.filter((r) => /medica/i.test(r.name));
    expect(meds.length).toBeGreaterThan(0);
    for (const m of meds) expect(m.rationale).toMatch(/médico|farmacêutico|pediatra|veterinário/);
  });
});

describe("mergeKit", () => {
  const plan = buildHomeKitPlan(snapshot({ members: [member({ category: "adult" }), member({ category: "adult" })] }), settings({ targetDays: 7 }));

  it("derives required from the engine and have from the stored row", () => {
    const lines = mergeKit(plan.requirements, [
      { id: "r1", item_key: "water.stored", name: "x", category: "water", unit: "L", quantity_required: null, quantity_have: 60, priority: 0, is_excluded: false, acquired_via: "purchased", purchased_by: "u1", purchased_at: null, expires_on: null, product_id: null, notes: null },
    ]);
    const water = lines.find((l) => l.key === "water.stored")!;
    expect(water.required).toBe(77); // 2 × 5 × 7 × 1.1
    expect(water.have).toBe(60);
    expect(water.missing).toBe(17);
    expect(water.purchasedBy).toBe("u1");
  });

  it("applies quantity overrides and exclusions", () => {
    const lines = mergeKit(plan.requirements, [
      { id: "r1", item_key: "food.rice", name: "Arroz", category: "food", unit: "kg", quantity_required: 5, quantity_have: 1, priority: 0, is_excluded: false, acquired_via: null, purchased_by: null, purchased_at: null, expires_on: null, product_id: null, notes: null },
      { id: "r2", item_key: "food.pasta", name: "Massa", category: "food", unit: "kg", quantity_required: null, quantity_have: 0, priority: 0, is_excluded: true, acquired_via: null, purchased_by: null, purchased_at: null, expires_on: null, product_id: null, notes: null },
    ]);
    expect(lines.find((l) => l.key === "food.rice")).toMatchObject({ required: 5, missing: 4, computedRequired: 1.1 });
    expect(lines.find((l) => l.key === "food.pasta")).toMatchObject({ excluded: true, missing: 0 });
  });

  it("includes custom rows and drops rows no longer generated", () => {
    const lines = mergeKit(plan.requirements, [
      { id: "c1", item_key: null, name: "Óculos de reserva", category: "seniors", unit: "un", quantity_required: 1, quantity_have: 0, priority: 2, is_excluded: false, acquired_via: null, purchased_by: null, purchased_at: null, expires_on: null, product_id: null, notes: null },
      { id: "o1", item_key: "children.diapers", name: "Fraldas", category: "children", unit: "un", quantity_required: null, quantity_have: 10, priority: 0, is_excluded: false, acquired_via: null, purchased_by: null, purchased_at: null, expires_on: null, product_id: null, notes: null },
    ]);
    expect(lines.find((l) => l.rowId === "c1")).toMatchObject({ isCustom: true, missing: 1 });
    expect(lines.some((l) => l.rowId === "o1")).toBe(false);
  });
});
