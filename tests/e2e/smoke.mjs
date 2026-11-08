/**
 * End-to-end smoke test against a running app (default http://localhost:3000)
 * and the local Supabase stack (Mailpit at :54324 captures magic-link emails).
 *
 *   node tests/e2e/smoke.mjs
 *
 * Covers: signup → magic link → onboarding → dashboard → invite → second user
 * accepts → shared update visible to both (realtime) → offline outbox.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

// Use the project's playwright if installed, otherwise the globally installed one.
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    return createRequire(`${root}/`)("playwright");
  }
}
const { chromium } = await loadPlaywright();

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
const shots = process.env.E2E_SCREENSHOTS;
const stamp = Date.now().toString(36);

async function latestLink(email) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      const m = msg.HTML.match(/href="([^"]*\/auth\/confirm\?[^"]+)"/);
      if (m) return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email for ${email}`);
}

function step(name) {
  console.log(`• ${name}`);
}

async function signup(page, name, email, next) {
  await page.goto(`${BASE}/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.getByText("Verifique o seu email").waitFor();
  const link = await latestLink(email);
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
}

// The app rate-limits magic links per IP (20/h); all E2E traffic comes from one IP.
// Reset the counters in the LOCAL database before running.
{
  const { default: pg } = await import("pg");
  const db = new pg.Client({ connectionString: process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  await db.connect();
  await db.query("delete from private.rate_limits");
  await db.end();
}

const browser = await chromium.launch();
const errors = [];
try {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const a = await ctxA.newPage();
  a.on("pageerror", (e) => errors.push(`A: ${e.message}`));

  step("signup + magic link (user A)");
  const emailA = `rui-${stamp}@example.com`;
  await signup(a, "Rui Martins", emailA);
  await a.waitForURL(/\/onboarding/);

  step("create family");
  await a.fill("#family-name", "Família Martins");
  await a.click('button[type="submit"]');
  await a.waitForURL(/step=members/);

  step("apply preset 2 adults + 1 child");
  await a.getByRole("button", { name: "2 adultos + 1 criança" }).click();
  await a.getByText("Criança 1").waitFor();
  await a.getByRole("button", { name: /Continuar/ }).click();
  await a.waitForURL(/step=household/);
  await a.selectOption("#district", "lisboa");
  await a.getByRole("button", { name: "Guardar habitação" }).click();
  await a.getByText("Habitação e localização guardadas.").waitFor();
  await a.getByRole("button", { name: /Continuar/ }).click();
  await a.waitForURL(/step=preferences/);
  await a.getByRole("button", { name: "7 dias" }).click();
  await a.getByRole("button", { name: "Guardar objetivo" }).click();
  await a.getByText("Objetivo do HOME KIT atualizado.").waitFor();
  await a.getByRole("button", { name: /Ver o meu plano/ }).click();
  await a.waitForURL(/\/app\?welcome=1/);
  await a.getByText("Preparação global").waitFor();
  if (shots) await a.screenshot({ path: `${shots}/dashboard-mobile.png`, fullPage: true });
  const firstAction = await a.locator("ol li").first().innerText();
  if (!/Comprar \d+ L adicionais de água/.test(firstAction)) throw new Error(`unexpected first action: ${firstAction}`);

  step("invite user B");
  await a.goto(`${BASE}/app/family`);
  const emailB = `ana-${stamp}@example.com`;
  await a.fill("#invite-email", emailB);
  await a.click('button:has-text("Convidar")');
  const inviteUrl = await a.locator('input[aria-label="Link do convite"]').inputValue();

  step("user B signs up through the invitation and accepts");
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const b = await ctxB.newPage();
  b.on("pageerror", (e) => errors.push(`B: ${e.message}`));
  b.on("console", (m) => { if (/realtime/i.test(m.text())) console.log(`  [B console] ${m.text()}`); });
  const invitePath = new URL(inviteUrl).pathname;
  await b.goto(`${BASE}${invitePath}`);
  await b.getByText("convidou-o para a família Família Martins").waitFor();
  await b.getByRole("link", { name: "Criar conta e aceitar" }).click();
  await b.waitForURL(/\/signup/);
  await signup(b, "Ana Martins", emailB, invitePath);
  await b.waitForURL(new RegExp(invitePath));
  await b.getByRole("button", { name: "Aceitar e entrar na família" }).click();
  await b.waitForURL(/\/app\?joined=1/);
  await b.getByText("Entrou na família").waitFor();

  step("A marks water as bought in HOME KIT; B sees it without reloading");
  await b.goto(`${BASE}/app/home-kit`);
  await a.goto(`${BASE}/app/home-kit`);
  const waterRow = a.locator('[data-item-key="water.stored"]');
  await waterRow.getByRole("button", { name: /Comprei/ }).click();
  await a.getByText(/Registado/).first().waitFor();
  await b.locator('[data-item-key="water.stored"] [data-status="complete"]').waitFor({ timeout: 15000 });
  if (shots) await b.screenshot({ path: `${shots}/home-kit-desktop.png`, fullPage: false });

  step("offline: B toggles a go-bag item while offline, change syncs on reconnect");
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
  await b.getByText(/sincronizada/).waitFor({ timeout: 15000 });

  console.log(errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors");
  console.log("SMOKE OK");
} catch (e) {
  console.error("SMOKE FAILED:", e.message);
  if (errors.length) console.error(errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
