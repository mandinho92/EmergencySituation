import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, createFamily, createUser, deleteUser, type TestUser } from "./helpers";

/**
 * "Rui marks 10 L of water as bought; Ana sees the change immediately."
 * Verifies that realtime change events reach another family member and are
 * filtered by RLS for outsiders.
 */
describe("realtime sync between family members", () => {
  let rui: TestUser, ana: TestUser, outsider: TestUser;
  let familyId: string;

  beforeAll(async () => {
    [rui, ana, outsider] = await Promise.all(["Rui", "Ana", "Fora"].map(createUser));
    familyId = await createFamily(rui);
    await addMember(familyId, rui, ana, "editor");
  });
  afterAll(async () => {
    await Promise.all([rui, ana, outsider].map((u) => u && deleteUser(u)));
  });

  function listen(user: TestUser, received: unknown[]) {
    return new Promise<ReturnType<TestUser["client"]["channel"]>>((resolve, reject) => {
      const ch = user.client
        .channel(`test-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "home_kit_items", filter: `family_id=eq.${familyId}` }, (p) => received.push(p.new))
        // SUBSCRIBED only acknowledges the channel; the postgres_changes binding is
        // confirmed by a later system message.
        .on("system", {}, (msg: { extension?: string; status?: string }) => {
          if (msg.extension === "postgres_changes" && msg.status === "ok") resolve(ch);
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(err ?? new Error(status));
        });
    });
  }

  it("delivers a purchase to the other member, not to outsiders", async () => {
    const anaEvents: unknown[] = [];
    const outsiderEvents: unknown[] = [];
    const [anaCh, outCh] = await Promise.all([listen(ana, anaEvents), listen(outsider, outsiderEvents)]);

    const { error } = await rui.client.from("home_kit_items").insert({ family_id: familyId, item_key: "water.stored", name: "Água", category: "water", unit: "L", quantity_have: 10, acquired_via: "purchased", purchased_by: rui.id });
    expect(error).toBeNull();

    const deadline = Date.now() + 10_000;
    while (anaEvents.length === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    expect(anaEvents[0]).toMatchObject({ item_key: "water.stored", quantity_have: 10, purchased_by: rui.id });

    await new Promise((r) => setTimeout(r, 1000));
    expect(outsiderEvents).toEqual([]);
    await Promise.all([ana.client.removeChannel(anaCh), outsider.client.removeChannel(outCh)]);
  });
});
