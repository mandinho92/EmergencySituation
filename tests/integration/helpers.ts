import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;

interface Env {
  url: string;
  anonKey: string;
  serviceKey: string;
}

let cached: Env | null = null;

/** Reads the Supabase connection from env, falling back to the local CLI stack. */
export function env(): Env {
  if (cached) return cached;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    cached = { url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
    return cached;
  }
  const out = execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const s = JSON.parse(out.slice(out.indexOf("{")));
  cached = { url: s.API_URL, anonKey: s.ANON_KEY, serviceKey: s.SERVICE_ROLE_KEY };
  return cached;
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export function admin(): Client {
  return createClient<Database>(env().url, env().serviceKey, opts);
}

export function anon(): Client {
  return createClient<Database>(env().url, env().anonKey, opts);
}

export interface TestUser {
  id: string;
  email: string;
  client: Client;
}

/**
 * Creates a confirmed user and returns a client signed in as that user.
 * Password sign-in is used only by the test harness; the app uses magic links.
 */
export async function createUser(name: string): Promise<TestUser> {
  const email = `${name.toLowerCase()}-${randomBytes(4).toString("hex")}@test.familyready.local`;
  const password = randomBytes(16).toString("hex");
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const client = createClient<Database>(env().url, env().anonKey, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

export async function deleteUser(u: TestUser) {
  await admin().auth.admin.deleteUser(u.id);
}

export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token, "utf8").digest("hex") };
}

/** Creates a family as `owner` and returns its id. */
export async function createFamily(owner: TestUser, name = "Família Teste"): Promise<string> {
  const { data, error } = await owner.client.rpc("create_family", { p_name: name });
  if (error) throw error;
  return data as string;
}

/** Invites `user` with `role` and accepts on their behalf. */
export async function addMember(familyId: string, inviter: TestUser, user: TestUser, role: Database["public"]["Enums"]["family_role"]) {
  const { token, hash } = newToken();
  const { error } = await inviter.client.from("family_invitations").insert({
    family_id: familyId,
    email: user.email,
    role,
    token_hash: hash,
    invited_by: inviter.id,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });
  if (error) throw error;
  const { error: acceptError } = await user.client.rpc("accept_invitation", { p_token: token });
  if (acceptError) throw acceptError;
}
