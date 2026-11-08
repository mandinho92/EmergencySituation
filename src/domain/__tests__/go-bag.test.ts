import { describe, expect, it } from "vitest";
import { bagWeight, buildBagRequirements, childBagCandidates, suggestBags, type BagInput } from "../preparedness/go-bag";
import { member, pet } from "./fixtures";

describe("go bags", () => {
  const rui = member({ category: "adult", displayName: "Rui" });
  const ana = member({ category: "adult", displayName: "Ana" });
  const baby = member({ category: "baby", displayName: "Leo", ageYears: 1, responsibleMemberId: ana.id });
  const kid = member({ category: "child", displayName: "Maria", ageYears: 8 });
  const dog = pet({ species: "dog", name: "Bobi", approxWeightKg: 12 });

  const bags: BagInput[] = [
    { id: "b-rui", kind: "adult", ownerMemberId: rui.id, petId: null },
    { id: "b-ana", kind: "adult", ownerMemberId: ana.id, petId: null },
  ];
  const ctx = { members: [rui, ana, baby, kid], pets: [dog], bags };

  it("suggests one bag per adult and one kit per pet, never forcing child bags", () => {
    const s = suggestBags([rui, ana, baby, kid], [dog]);
    expect(s.filter((b) => b.kind === "adult")).toHaveLength(2);
    expect(s.filter((b) => b.kind === "pet")).toHaveLength(1);
    expect(s.some((b) => b.kind === "child")).toBe(false);
  });

  it("offers child bags only for children old enough", () => {
    expect(childBagCandidates([kid, baby, member({ category: "child", ageYears: 4 })], bags).map((m) => m.id)).toEqual([kid.id]);
  });

  it("puts shared items (radio) only in the primary bag", () => {
    const primary = buildBagRequirements(bags[0], ctx);
    const second = buildBagRequirements(bags[1], ctx);
    expect(primary.some((i) => i.key === "communications.radio")).toBe(true);
    expect(second.some((i) => i.key === "communications.radio")).toBe(false);
  });

  it("places baby items in the responsible adult's bag", () => {
    const anaBag = buildBagRequirements(bags[1], ctx);
    const ruiBag = buildBagRequirements(bags[0], ctx);
    expect(anaBag.some((i) => i.key === `children.diapers.${baby.id}`)).toBe(true);
    expect(ruiBag.some((i) => i.key === `children.diapers.${baby.id}`)).toBe(false);
  });

  it("puts pets in the primary bag when they have no kit of their own", () => {
    const primary = buildBagRequirements(bags[0], ctx);
    expect(primary.some((i) => i.key === `pets.food.${dog.id}`)).toBe(true);
    const withPetKit = buildBagRequirements(bags[0], { ...ctx, bags: [...bags, { id: "b-dog", kind: "pet", ownerMemberId: null, petId: dog.id }] });
    expect(withPetKit.some((i) => i.key.startsWith("pets."))).toBe(false);
  });

  it("keeps a child bag light and within the planning limit", () => {
    const childBag: BagInput = { id: "b-kid", kind: "child", ownerMemberId: kid.id, petId: null };
    const items = buildBagRequirements(childBag, { ...ctx, bags: [...bags, childBag] });
    const w = bagWeight(items.map((i) => ({ quantity: i.quantity, unitWeightGrams: i.unitWeightGrams })), kid, "child");
    expect(w.limitGrams).toBe(4000);
    expect(w.overLimit).toBe(false);
    expect(w.totalGrams).toBeLessThan(2500);
  });

  it("keeps an adult bag below the adult planning limit", () => {
    const items = buildBagRequirements(bags[0], ctx);
    const w = bagWeight(items.map((i) => ({ quantity: i.quantity, unitWeightGrams: i.unitWeightGrams })), rui, "adult");
    expect(w.overLimit).toBe(false);
  });

  it("covers the evacuation categories", () => {
    const cats = new Set(buildBagRequirements(bags[1], ctx).map((i) => i.category));
    for (const c of ["water", "food", "clothing", "hygiene", "first_aid", "medication", "lighting", "communications", "documents", "money", "protection", "children"]) {
      expect(cats.has(c as never), c).toBe(true);
    }
  });

  it("excludes excluded lines from the weight", () => {
    const w = bagWeight([{ quantity: 2, unitWeightGrams: 1000 }, { quantity: 1, unitWeightGrams: 5000, excluded: true }], rui, "adult");
    expect(w.totalGrams).toBe(2000);
  });
});
