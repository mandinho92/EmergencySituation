import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, admin, anon, createFamily, createUser, deleteUser, newToken, type TestUser } from "./helpers";

/**
 * Integration tests for family isolation, roles and invitations.
 * Every assertion goes through PostgREST with a real user JWT, so RLS,
 * triggers and SECURITY DEFINER functions are exercised exactly as in production.
 */
describe("families, roles and data isolation", () => {
  let rui: TestUser, ana: TestUser, avo: TestUser, tio: TestUser, outsider: TestUser;
  let familyId: string;

  beforeAll(async () => {
    [rui, ana, avo, tio, outsider] = await Promise.all(["Rui", "Ana", "Avo", "Tio", "Estranho"].map(createUser));
    familyId = await createFamily(rui, "Família Martins");
    await addMember(familyId, rui, ana, "editor");
    await addMember(familyId, rui, avo, "viewer");
    await addMember(familyId, rui, tio, "member");
  });

  afterAll(async () => {
    await Promise.all([rui, ana, avo, tio, outsider].map((u) => u && deleteUser(u)));
  });

  it("create_family makes the creator admin and provisions 1:1 configuration rows", async () => {
    const { data: m } = await rui.client.from("family_members").select("role").eq("family_id", familyId).eq("user_id", rui.id).single();
    expect(m?.role).toBe("admin");
    for (const table of ["household_profiles", "home_kits", "energy_profiles", "communication_plans"] as const) {
      const { count } = await rui.client.from(table).select("*", { count: "exact", head: true }).eq("family_id", familyId);
      expect(count, table).toBe(1);
    }
    const { data: reminders } = await rui.client.from("reminders").select("kind").eq("family_id", familyId);
    expect(reminders?.map((r) => r.kind)).toEqual(["quarterly_review"]);
  });

  it("isolates families: an outsider sees nothing and cannot write", async () => {
    const { data: fam } = await outsider.client.from("families").select("id").eq("id", familyId);
    expect(fam).toEqual([]);
    const { data: members } = await outsider.client.from("family_members").select("user_id").eq("family_id", familyId);
    expect(members).toEqual([]);
    const { error } = await outsider.client.from("member_profiles").insert({ family_id: familyId, display_name: "Intruso", category: "adult" });
    expect(error?.code).toBe("42501");
    const { data: profiles } = await outsider.client.from("profiles").select("id").eq("id", rui.id);
    expect(profiles).toEqual([]);
  });

  it("anonymous clients cannot read family data or call privileged RPCs", async () => {
    const a = anon();
    const { data } = await a.from("families").select("id");
    expect(data ?? []).toEqual([]);
    const { error } = await a.rpc("create_family", { p_name: "x" });
    expect(error).not.toBeNull();
    const { error: rl } = await a.rpc("consume_rate_limit", { p_key: "x", p_max: 1, p_window_seconds: 60 });
    expect(rl).not.toBeNull();
  });

  it("editors manage household composition; viewers and members cannot", async () => {
    const { data: created, error } = await ana.client.from("member_profiles").insert({ family_id: familyId, display_name: "Maria", category: "child", age_years: 7 }).select("id").single();
    expect(error).toBeNull();
    const { error: viewerError } = await avo.client.from("member_profiles").insert({ family_id: familyId, display_name: "X", category: "adult" });
    expect(viewerError?.code).toBe("42501");
    const { error: memberError } = await tio.client.from("member_profiles").insert({ family_id: familyId, display_name: "X", category: "adult" });
    expect(memberError?.code).toBe("42501");
    // Viewer can read the shared composition.
    const { data: seen } = await avo.client.from("member_profiles").select("id").eq("id", created!.id);
    expect(seen).toHaveLength(1);
  });

  it("health data requires consent and is hidden from viewers", async () => {
    const { data: person } = await rui.client.from("member_profiles").insert({ family_id: familyId, display_name: "Avó Rosa", category: "senior" }).select("id").single();
    const { error: noConsentBy } = await rui.client.from("member_health").insert({ member_profile_id: person!.id, family_id: familyId, medication: "x", consent_at: new Date().toISOString(), consent_by: ana.id });
    expect(noConsentBy?.code).toBe("42501"); // consent_by must be the acting user
    const { error } = await rui.client.from("member_health").insert({ member_profile_id: person!.id, family_id: familyId, medication: "Metformina", consent_at: new Date().toISOString(), consent_by: rui.id });
    expect(error).toBeNull();

    const { data: memberView } = await tio.client.from("member_health").select("medication").eq("member_profile_id", person!.id);
    expect(memberView).toEqual([{ medication: "Metformina" }]);
    const { data: viewerView } = await avo.client.from("member_health").select("medication").eq("member_profile_id", person!.id);
    expect(viewerView).toEqual([]);
  });

  it("members update item state but not item definitions", async () => {
    const { data: row, error } = await tio.client
      .from("home_kit_items")
      .insert({ family_id: familyId, item_key: "water.stored", name: "Água", category: "water", unit: "L", quantity_have: 10, acquired_via: "purchased", purchased_by: tio.id })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { error: upd } = await tio.client.from("home_kit_items").update({ quantity_have: 20 }).eq("id", row!.id);
    expect(upd).toBeNull();
    const { error: defChange } = await tio.client.from("home_kit_items").update({ quantity_required: 1 }).eq("id", row!.id);
    expect(defChange?.code).toBe("42501");
    const { error: custom } = await tio.client.from("home_kit_items").insert({ family_id: familyId, name: "Custom", category: "tools", quantity_required: 1 });
    expect(custom?.code).toBe("42501");
    const { error: viewerUpd, count } = await avo.client.from("home_kit_items").update({ quantity_have: 0 }, { count: "exact" }).eq("id", row!.id);
    expect(viewerUpd).toBeNull();
    expect(count).toBe(0); // RLS silently filters the row for viewers

    const { data: after } = await ana.client.from("home_kit_items").select("quantity_have, purchased_by").eq("id", row!.id).single();
    expect(after).toEqual({ quantity_have: 20, purchased_by: tio.id });
  });

  it("only admins invite and change roles", async () => {
    const { hash } = newToken();
    const { error } = await ana.client.from("family_invitations").insert({ family_id: familyId, email: "x@example.com", role: "member", token_hash: hash, invited_by: ana.id, expires_at: new Date(Date.now() + 3600e3).toISOString() });
    expect(error?.code).toBe("42501");
    const { count } = await ana.client.from("family_members").update({ role: "admin" }, { count: "exact" }).eq("family_id", familyId).eq("user_id", ana.id);
    expect(count).toBe(0);
  });

  it("records an audit trail with field names only", async () => {
    const { data } = await rui.client.from("audit_logs").select("table_name, action, changed_fields, actor_id").eq("family_id", familyId).eq("table_name", "home_kit_items").order("id");
    expect(data?.length).toBeGreaterThanOrEqual(2);
    const update = data!.find((d) => d.action === "update");
    expect(update?.changed_fields).toEqual(["quantity_have"]);
    expect(update?.actor_id).toBe(tio.id);
    const { data: viewerLogs } = await avo.client.from("audit_logs").select("id").eq("family_id", familyId);
    expect(viewerLogs).toEqual([]);
  });

  it("prevents the last admin from leaving while other members remain", async () => {
    const { error } = await rui.client.from("family_members").delete().eq("family_id", familyId).eq("user_id", rui.id);
    expect(error?.message).toMatch(/last_admin/);
    const { error: demote } = await rui.client.from("family_members").update({ role: "editor" }).eq("family_id", familyId).eq("user_id", rui.id);
    expect(demote?.message).toMatch(/last_admin/);
  });
});

describe("invitations", () => {
  let owner: TestUser, invitee: TestUser, other: TestUser;
  let familyId: string;

  beforeAll(async () => {
    [owner, invitee, other] = await Promise.all(["Dono", "Convidada", "Outro"].map(createUser));
    familyId = await createFamily(owner);
  });
  afterAll(async () => {
    await Promise.all([owner, invitee, other].map((u) => u && deleteUser(u)));
  });

  async function invite(email: string, overrides: { expires_at?: string } = {}) {
    const t = newToken();
    const { data, error } = await owner.client
      .from("family_invitations")
      .insert({ family_id: familyId, email, role: "editor", token_hash: t.hash, invited_by: owner.id, expires_at: overrides.expires_at ?? new Date(Date.now() + 86_400_000).toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    return { ...t, id: data.id };
  }

  it("shows a minimal preview without exposing the full email", async () => {
    const t = await invite(invitee.email);
    const { data } = await anon().rpc("invitation_preview", { p_token: t.token });
    expect(data?.[0]).toMatchObject({ family_name: "Família Teste", inviter_name: "Dono", role: "editor", status: "pending" });
    expect(data?.[0].email).not.toBe(invitee.email);
    const { data: none } = await anon().rpc("invitation_preview", { p_token: "x".repeat(40) });
    expect(none).toEqual([]);
    await owner.client.from("family_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", t.id);
  });

  it("binds the invitation to the invited email", async () => {
    const t = await invite(invitee.email);
    const { error } = await other.client.rpc("accept_invitation", { p_token: t.token });
    expect(error?.message).toMatch(/invitation_email_mismatch/);
    const { data: fam, error: ok } = await invitee.client.rpc("accept_invitation", { p_token: t.token });
    expect(ok).toBeNull();
    expect(fam).toBe(familyId);
    // Idempotent for the same user, rejected for anyone else.
    const { error: again } = await invitee.client.rpc("accept_invitation", { p_token: t.token });
    expect(again).toBeNull();
    const { data: role } = await invitee.client.from("family_members").select("role").eq("family_id", familyId).eq("user_id", invitee.id).single();
    expect(role?.role).toBe("editor");
  });

  it("rejects revoked and expired invitations", async () => {
    const revoked = await invite(other.email);
    await owner.client.from("family_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", revoked.id);
    expect((await other.client.rpc("accept_invitation", { p_token: revoked.token })).error?.message).toMatch(/invitation_revoked/);

    // Expired: created normally, then moved into the past with the service role.
    const expired = await invite(other.email);
    await admin().from("family_invitations").update({ created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), expires_at: new Date(Date.now() - 86_400_000).toISOString() }).eq("id", expired.id);
    expect((await other.client.rpc("accept_invitation", { p_token: expired.token })).error?.message).toMatch(/invitation_expired/);
  });

  it("does not let clients forge acceptance or swap the token", async () => {
    const t = await invite("someone@example.com");
    const { error } = await owner.client.from("family_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", t.id);
    expect(error?.message).toMatch(/invitation_immutable/);
  });

  it("caps invitation validity at 14 days", async () => {
    const t = newToken();
    const { error } = await owner.client.from("family_invitations").insert({ family_id: familyId, email: "late@example.com", role: "viewer", token_hash: t.hash, invited_by: owner.id, expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() });
    expect(error?.code).toBe("42501");
  });
});

describe("leaving, deletion and orphan cleanup", () => {
  it("deletes the family when its only account leaves or is deleted", async () => {
    const solo = await createUser("Sozinho");
    const fid = await createFamily(solo);
    await deleteUser(solo);
    const { data } = await admin().from("families").select("id").eq("id", fid);
    expect(data).toEqual([]);
  });

  it("lets an admin delete the family with all its data", async () => {
    const [a, b] = await Promise.all([createUser("AdminA"), createUser("MembroB")]);
    const fid = await createFamily(a);
    await addMember(fid, a, b, "member");
    await a.client.from("member_profiles").insert({ family_id: fid, display_name: "Pessoa", category: "adult" });
    const { error: notAdmin, count: c0 } = await b.client.from("families").delete({ count: "exact" }).eq("id", fid);
    expect(notAdmin).toBeNull();
    expect(c0).toBe(0);
    const { error, count } = await a.client.from("families").delete({ count: "exact" }).eq("id", fid);
    expect(error).toBeNull();
    expect(count).toBe(1);
    const { data } = await admin().from("member_profiles").select("id").eq("family_id", fid);
    expect(data).toEqual([]);
    await Promise.all([deleteUser(a), deleteUser(b)]);
  });

  it("completes a quarterly review and schedules the next one", async () => {
    const u = await createUser("Revisor");
    const fid = await createFamily(u);
    const { data: r } = await u.client.from("reminders").select("id, due_on").eq("family_id", fid).single();
    const { data: nextId, error } = await u.client.rpc("complete_reminder", { p_reminder_id: r!.id, p_completed_items: ["water"] });
    expect(error).toBeNull();
    const { data: next } = await u.client.from("reminders").select("due_on, completed_at").eq("id", nextId as string).single();
    expect(next?.completed_at).toBeNull();
    expect(next!.due_on > r!.due_on).toBe(true);
    const { data: kit } = await u.client.from("home_kits").select("last_reviewed_at").eq("family_id", fid).single();
    expect(kit?.last_reviewed_at).not.toBeNull();
    await deleteUser(u);
  });
});
