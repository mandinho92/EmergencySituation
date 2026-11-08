import { describe, expect, it } from "vitest";
import { computeFood, foodAutonomyDays } from "../preparedness/food";
import { computeWater, waterAutonomyDays } from "../preparedness/water";
import { member, pet, settings } from "./fixtures";

describe("computeWater", () => {
  it("computes 2 adults for 3 days with hygiene and 10% reserve", () => {
    const r = computeWater([member({ category: "adult" }), member({ category: "adult" })], [], settings({ targetDays: 3 }));
    // 2 × (2.5 + 1.0 + 1.5) = 10 L/day → 30 L + 3 L reserve
    expect(r.perDay.total).toBe(10);
    expect(r.totalLiters).toBe(33);
    expect(r.containers).toEqual({ sizeLiters: 5, count: 7 });
    expect(r.reserveLiters).toBe(3);
  });

  it("distinguishes adults, children and babies", () => {
    const r = computeWater(
      [member({ category: "adult" }), member({ category: "child", ageYears: 7 }), member({ category: "baby", ageYears: 0 })],
      [],
      settings({ targetDays: 1 }),
    );
    // adult 5.0 + child 3.25 + baby 2.05 = 10.3 L/day
    expect(r.perDay.total).toBeCloseTo(10.3, 5);
    expect(r.totalLiters).toBe(12); // 10.3 × 1.1 = 11.33 → 12
  });

  it("excludes hygiene water when disabled and warns about it", () => {
    const r = computeWater([member({ category: "adult" })], [], settings({ targetDays: 7, includeHygieneWater: false }));
    expect(r.perDay.hygiene).toBe(0);
    expect(r.perDay.total).toBe(3.5);
    expect(r.warnings.some((w) => w.includes("higiene"))).toBe(true);
  });

  it("increases drinking water for hot climate", () => {
    const base = computeWater([member({ category: "adult" })], [], settings());
    const hot = computeWater([member({ category: "adult" })], [], settings({ hotClimate: true }));
    expect(hot.perDay.drinking).toBe(3.75);
    expect(hot.totalLiters).toBeGreaterThan(base.totalLiters);
  });

  it("scales all members proportionally with an adult override", () => {
    const r = computeWater([member({ category: "adult" }), member({ category: "child" })], [], settings({ targetDays: 1, waterAdultLitersPerDay: 10 }));
    // scale = 10 / 5 = 2 → adult 10 + child 6.5
    expect(r.perDay.total).toBeCloseTo(16.5, 5);
  });

  it("adds pet water by weight", () => {
    const r = computeWater([member({ category: "adult" })], [pet({ species: "dog", approxWeightKg: 20 })], settings({ targetDays: 1 }));
    expect(r.perDay.pets).toBeCloseTo(1.2, 5);
  });

  it("always reports that values are planning references", () => {
    const r = computeWater([member({ category: "adult" })], [], settings());
    expect(r.warnings[0]).toMatch(/referência/);
  });

  it("computes water autonomy in days", () => {
    expect(waterAutonomyDays(60, 20)).toBe(3);
    expect(waterAutonomyDays(25, 10)).toBe(2.5);
    expect(waterAutonomyDays(10, 0)).toBe(0);
  });
});

describe("computeFood", () => {
  it("scales staples by person-equivalents and days", () => {
    const lines = computeFood([member({ category: "adult" }), member({ category: "adult" })], [], 7);
    const rice = lines.find((l) => l.key === "food.rice");
    expect(rice?.quantity).toBe(1.1); // 0.075 × 2 × 7 = 1.05 → 1.1 (rounded up)
    expect(lines.find((l) => l.key === "food.canned_protein")?.quantity).toBe(14);
  });

  it("adds infant formula in days, not grams, for non-breastfed babies", () => {
    const baby = member({ category: "baby", displayName: "Bebé", infantFeeding: "formula" });
    const lines = computeFood([member({ category: "adult" }), baby], [], 5);
    const formula = lines.find((l) => l.key === `food.infant_formula.${baby.id}`);
    expect(formula).toMatchObject({ unit: "dias", quantity: 5, priority: 0 });
  });

  it("does not add formula for breastfed babies", () => {
    const lines = computeFood([member({ category: "baby", infantFeeding: "breastfeeding" })], [], 3);
    expect(lines.some((l) => l.key.startsWith("food.infant_formula"))).toBe(false);
  });

  it("flags special diets", () => {
    const lines = computeFood([member({ category: "adult", dietaryNeeds: "sem glúten" })], [], 3);
    expect(lines.some((l) => l.key === "food.special_diet")).toBe(true);
  });

  it("estimates pet food by weight", () => {
    const dog = pet({ species: "dog", approxWeightKg: 10, name: "Bobi" });
    const lines = computeFood([], [dog], 7);
    expect(lines.find((l) => l.key === `pets.food.${dog.id}`)).toMatchObject({ unit: "kg", quantity: 1.4, category: "pets" });
  });
});

describe("foodAutonomyDays", () => {
  it("is limited by the scarcest essential group", () => {
    const days = foodAutonomyDays([
      { group: "carbs", perDay: 0.15, have: 1.5 }, // 10 days
      { group: "protein", perDay: 2, have: 8 }, // 4 days
    ]);
    expect(days).toBe(4);
  });

  it("treats items in a group as substitutes", () => {
    const days = foodAutonomyDays([
      { group: "carbs", perDay: 0.075, have: 0.45 }, // rice only
      { group: "carbs", perDay: 0.075, have: 0 }, // no pasta
      { group: "protein", perDay: 1, have: 100 },
    ]);
    expect(days).toBe(3); // 0.45 / 0.15
  });

  it("ignores non-essential groups and returns null when nothing is essential", () => {
    expect(foodAutonomyDays([{ group: "snacks", perDay: 1, have: 0 }])).toBeNull();
  });

  it("uses the scarcest infant line", () => {
    expect(
      foodAutonomyDays([
        { group: "carbs", perDay: 1, have: 10 },
        { group: "protein", perDay: 1, have: 10 },
        { group: "infant", perDay: 1, have: 2 },
      ]),
    ).toBe(2);
  });
});
