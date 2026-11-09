/**
 * Production smoke test without email delivery: test accounts are created
 * through the Supabase Admin API, signed in with an admin-generated magic
 * link (token_hash → /auth/confirm), and deleted at the end (their families
 * are removed by the orphan-cleanup trigger).
 *
 *   E2E_BASE_URL=https://familyready.vercel.app \
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node tests/e2e/prod-smoke.mjs
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

async function loadPlaywright() {
  try { return await import("playwright"); } catch {
    return createRequire(`${execSync("npm root -g", { encoding: "utf8" }).trim()}/`)("playwright");
  }
}
const { chromium } = await loadPlaywright();
const BASE = process.env.E2E_BASE_URL;
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !SB || !KEY) throw new Error("E2E_BASE_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const admin = (path, init = {}) => fetch(`${SB}/auth/v1/admin${path}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" } });
const stamp = Date.now().toString(36);
const created = [];
const failures = [];

async function login(page, name, email) {
  let r = await admin("/users", { method: "POST", body: JSON.stringify({ email, email_confirm: true, user_metadata: { full_name: name } }) });
  const user = await r.json();
  if (!r.ok) throw new Error(`create user: ${JSON.stringify(user)}`);
  created.push(user.id);
  r = await admin("/generate_link", { method: "POST", body: JSON.stringify({ type: "magiclink", email }) });
  const link = await r.json();
  if (!r.ok) throw new Error(`generate_link: ${JSON.stringify(link)}`);
  const hashed = link.hashed_token ?? link.properties?.hashed_token;
  await page.goto(`${BASE}/auth/confirm?token_hash=${hashed}&type=magiclink`);
}

const step = (s) => console.log(`• ${s}`);
const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
try {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const a = await ctxA.newPage();
  a.on("pageerror", (e) => failures.push(`A: ${e.message}`));
  step("A signs in");
  await login(a, "Teste Produção A", `e2e-a-${stamp}@example.com`);
  await a.waitForURL(/onboarding/);
  step("A creates family and household");
  await a.fill("#family-name", "Família E2E");
  await a.click('button[type="submit"]');
  await a.waitForURL(/step=members/);
  await a.getByRole("button", { name: "2 adultos + 1 criança" }).click();
  await a.getByText("Criança 1").waitFor();
  await a.goto(`${BASE}/app?skip=1`);
  await a.getByText("Preparação global").waitFor();

  step("A invites B; B signs in and accepts");
  await a.goto(`${BASE}/app/family`);
  const emailB = `e2e-b-${stamp}@example.com`;
  await a.fill("#invite-email", emailB);
  await a.click('button:has-text("Convidar")');
  const invitePath = new URL(await a.locator('input[aria-label="Link do convite"]').inputValue()).pathname;
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const b = await ctxB.newPage();
  b.on("pageerror", (e) => failures.push(`B: ${e.message}`));
  await login(b, "Teste Produção B", emailB);
  await b.goto(`${BASE}${invitePath}`);
  await b.getByRole("button", { name: "Aceitar e entrar na família" }).click();
  await b.waitForURL(/joined=1/);

  step("A marks water as bought; B sees it via realtime");
  await b.goto(`${BASE}/app/home-kit`);
  await a.goto(`${BASE}/app/home-kit`);
  await a.locator('[data-item-key="water.stored"]').getByRole("button", { name: /Comprei/ }).click();
  await b.locator('[data-item-key="water.stored"] [data-status="complete"]').waitFor({ timeout: 20000 });

  step("B packs an item offline; it syncs on reconnect");
  await b.goto(`${BASE}/app/go-bags`);
  await b.getByRole("button", { name: /Criar mochilas sugeridas/ }).click();
  await b.getByText(/mochila\(s\) criada/).waitFor();
  await b.locator("a[href^='/app/go-bags/']").first().click();
  await b.waitForURL(/\/app\/go-bags\/[0-9a-f-]{36}/);
  await ctxB.setOffline(true);
  await b.locator('[data-item-key="first_aid.compact_kit"]').getByRole("button", { name: /Na mochila/ }).click();
  await b.getByText(/1 pendente/).waitFor();
  await ctxB.setOffline(false);
  await b.evaluate(() => window.dispatchEvent(new Event("online")));
  await b.getByText(/sincronizada/).waitFor({ timeout: 20000 });

  step("SOS screen loads on mobile");
  await a.goto(`${BASE}/app/sos`);
  await a.getByRole("link", { name: /Ligar 112/ }).waitFor();
  console.log(failures.length ? `page errors:\n${failures.join("\n")}` : "no page errors");
  console.log("PROD SMOKE OK");
} catch (e) {
  console.error("PROD SMOKE FAILED:", e.message, failures.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
  // Reverse order: the family's last admin can only be removed once the other accounts are gone.
  let deleted = 0;
  for (const id of [...created].reverse()) {
    const r = await admin(`/users/${id}`, { method: "DELETE" });
    if (r.ok) deleted++;
    else console.error(`cleanup failed for ${id}: ${r.status} ${await r.text()}`);
  }
  console.log(`cleanup: deleted ${deleted}/${created.length} test user(s)`);
  if (deleted !== created.length) process.exitCode = 1;
}
