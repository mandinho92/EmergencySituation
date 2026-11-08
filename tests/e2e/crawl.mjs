/**
 * Visits every private page as an admin (after real interactions) and as a
 * viewer, failing on HTTP errors, error boundaries or browser exceptions.
 *   node tests/e2e/crawl.mjs   (app at E2E_BASE_URL, Mailpit at E2E_MAILPIT_URL)
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

async function loadPlaywright() {
  try { return await import("playwright"); } catch {
    return createRequire(`${execSync("npm root -g", { encoding: "utf8" }).trim()}/`)("playwright");
  }
}
const { chromium } = await loadPlaywright();
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
const SHOTS = process.env.E2E_SCREENSHOTS;
const stamp = Date.now().toString(36);
const failures = [];

async function latestLink(email) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      const m = msg.HTML.match(/href="([^"]*\/auth\/confirm\?[^"]+)"/);
      if (m) return m[1].replace(/&amp;/g, "&").replace(/^https?:\/\/[^/]+/, BASE);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email for ${email}`);
}

async function signup(page, name, email, next) {
  await page.goto(`${BASE}/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.getByText("Verifique o seu email").waitFor();
  await page.goto(await latestLink(email));
}

async function visit(page, path, who, shotName, fullPage = true) {
  const res = await page.goto(`${BASE}${path}`);
  const status = res?.status() ?? 0;
  // Wait for streamed content to replace the loading skeleton.
  await page.locator('[aria-busy="true"][aria-label="A carregar"]').waitFor({ state: "detached", timeout: 15000 }).catch(() => failures.push(`${who} ${path}: still loading`));
  await page.locator("h1").first().waitFor({ timeout: 10000 }).catch(() => failures.push(`${who} ${path}: no heading`));
  const boundary = await page.getByText(/Algo correu mal|Application error/).count();
  // Mobile: no page may scroll horizontally.
  const overflow = await page.evaluate(() => (window.innerWidth < 500 ? document.documentElement.scrollWidth - window.innerWidth : 0));
  if (overflow > 1) failures.push(`${who} ${path}: horizontal overflow of ${overflow}px`);
  if (status >= 400 || boundary > 0) failures.push(`${who} ${path}: status ${status}${boundary ? " (error boundary)" : ""}`);
  if (SHOTS && shotName) await page.screenshot({ path: `${SHOTS}/${shotName}.png`, fullPage });
}

async function toast(page, re) {
  await page.getByText(re).first().waitFor({ timeout: 10000 });
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
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const a = await ctx.newPage();
  a.on("pageerror", (e) => failures.push(`admin pageerror: ${e.message}`));
  const emailA = `admin-${stamp}@example.com`;
  await signup(a, "Marta Costa", emailA);
  await a.waitForURL(/onboarding/);
  await a.fill("#family-name", "Família Costa");
  await a.click('button[type="submit"]');
  await a.waitForURL(/step=members/);
  await a.getByRole("button", { name: "Família alargada" }).click();
  await a.getByText("Sénior 1").waitFor();

  // Add a baby and a dog through the forms.
  await a.getByRole("button", { name: /Adicionar membro/ }).click();
  await a.fill("#display_name", "Bebé");
  await a.selectOption("#category", "baby");
  await a.fill("#age_years", "1");
  await a.selectOption("#infant_feeding", "formula");
  await a.getByRole("button", { name: "Adicionar membro" }).last().click();
  await toast(a, "Membro adicionado.");
  await a.getByRole("button", { name: /Adicionar animal/ }).click();
  await a.fill("#pet-name", "Bobi");
  await a.fill("#approx_weight_kg", "12");
  await a.getByRole("button", { name: "Adicionar animal" }).last().click();
  await toast(a, "Animal adicionado.");
  await a.goto(`${BASE}/app?skip=1`);
  await a.getByText("Preparação global").waitFor();

  // Plan: contact, communication plan, meeting point, scenario checklist.
  await a.goto(`${BASE}/app/communication`);
  await a.getByRole("button", { name: /Contacto/ }).first().click();
  await a.fill("#c-name", "Tia Rosa");
  await a.fill("#c-phone", "+351 912 345 678");
  await a.fill("#c-region", "Porto");
  await a.check('input[name="is_out_of_region"]');
  await a.getByRole("button", { name: "Guardar" }).last().click();
  await toast(a, "Contacto adicionado.");
  await a.selectOption("#cp-out", { label: "Tia Rosa" });
  await a.fill("#cp-noint", "SMS para a Tia Rosa às horas certas.");
  await a.getByRole("button", { name: "Guardar plano" }).click();
  await toast(a, "Plano de comunicação guardado.");

  await a.goto(`${BASE}/app/meeting-points`);
  await a.getByRole("button", { name: "Definir" }).first().click();
  await a.fill("#mp-name", "Jardim da Estrela");
  await a.fill("#mp-lat", "38.7139");
  await a.fill("#mp-lng", "-9.1594");
  await a.getByRole("button", { name: "Guardar" }).last().click();
  await toast(a, "Ponto de encontro criado.");

  await a.goto(`${BASE}/app/scenarios/earthquake`);
  await a.getByText("Baixar, proteger, aguardar").first().click();
  await a.waitForTimeout(800);

  // Kits, tasks, inventory, shopping, energy.
  await a.goto(`${BASE}/app/go-bags`);
  await a.getByRole("button", { name: /Criar mochilas sugeridas/ }).click();
  await toast(a, /mochila\(s\) criada/);
  await a.goto(`${BASE}/app/tasks`);
  await a.getByRole("button", { name: /Nova tarefa/ }).click();
  await a.fill("#t-title", "Comprar rádio a pilhas");
  await a.getByRole("button", { name: "Criar" }).click();
  await toast(a, "Tarefa criada.");
  await a.goto(`${BASE}/app/inventory`);
  await a.getByRole("button", { name: "Adicionar" }).click();
  await a.fill("#inv-name", "Extintor 6 kg");
  await a.fill("#inv-exp", "2026-11-20");
  await a.getByRole("button", { name: "Guardar" }).last().click();
  await toast(a, "Artigo adicionado ao inventário.");
  await a.goto(`${BASE}/app/shopping`);
  await a.getByRole("button", { name: "Adicionar" }).click();
  await a.fill("#s-name", "Carregador solar de bolso");
  await a.fill("#s-price", "19.90");
  await a.getByRole("button", { name: "Adicionar" }).last().click();
  await toast(a, "Artigo adicionado à lista.");
  await a.goto(`${BASE}/app/energy`);
  await a.getByRole("radio", { name: /Equilibrado/ }).click();
  await toast(a, "Preferência guardada.");
  await a.getByRole("button", { name: /Router de Internet/ }).click();
  await toast(a, /adicionado/);
  await a.getByRole("button", { name: /Smartphone/ }).click();
  await toast(a, /adicionado/);
  await a.goto(`${BASE}/app/reviews`);
  await a.getByRole("button", { name: /Marcar revisão como concluída/ }).click();
  await toast(a, /Revisão concluída/);

  const res = await a.request.get(`${BASE}/api/account/export`);
  if (res.status() !== 200 || !(await res.text()).includes("Família Costa")) failures.push("export failed");

  const pages = ["/app", "/app/sos", "/app/home-kit", "/app/go-bags", "/app/inventory", "/app/shopping", "/app/products", "/app/energy", "/app/scenarios", "/app/scenarios/wildfire",
    "/app/meeting-points", "/app/communication", "/app/tasks", "/app/reviews", "/app/family", "/app/members", "/app/household", "/app/activity", "/app/settings",
    "/app/print/plan", "/app/print/cards", "/app/print/home-kit"];
  for (const p of pages) await visit(a, p, "admin", `admin${p.replaceAll("/", "_")}`);
  const bagHref = await (await a.goto(`${BASE}/app/go-bags`), a.locator("a[href^='/app/go-bags/']").first().getAttribute("href"));
  await visit(a, bagHref, "admin", "admin_bag");
  await visit(a, bagHref.replace("/app/go-bags/", "/app/print/go-bag/"), "admin", "admin_print_bag");

  // Mobile screenshots of key pages.
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
  const mp = await m.newPage();
  const shotsMobile = new Set(["/app", "/app/sos", "/app/home-kit", "/app/go-bags", "/app/shopping", "/app/scenarios/earthquake"]);
  for (const p of [...pages, "/app/scenarios/earthquake", bagHref]) await visit(mp, p, "mobile", shotsMobile.has(p) ? `mobile${p.replaceAll("/", "_")}` : undefined, false);

  // Mobile kit interactions: one-tap done, stepper, "only missing" filter.
  await mp.goto(`${BASE}/app/home-kit`);
  const can = mp.locator('[data-item-key="kitchen.can_opener"]');
  await can.getByRole("button", { name: /marcar que já tem tudo/ }).click();
  await can.locator('[data-status="complete"]').waitFor({ timeout: 10000 });
  const rice = mp.locator('[data-item-key="food.rice"]');
  await rice.getByRole("button", { name: /^Mais/ }).click();
  await rice.getByRole("button", { name: /^Mais/ }).click();
  await mp.waitForTimeout(1500);
  await mp.reload();
  const riceQty = await mp.locator('[data-item-key="food.rice"] input[type="number"]').inputValue();
  if (Number(riceQty) !== 1) failures.push(`stepper: expected 1 kg of rice after two +0.5 taps, got ${riceQty}`);
  await mp.getByText("Mostrar só o que falta").click();
  if (await mp.locator('[data-item-key="kitchen.can_opener"]').isVisible()) failures.push("only-missing filter did not hide a completed item");
  if (SHOTS) await mp.screenshot({ path: `${SHOTS}/mobile_kit_filtered.png` });
  await mp.getByText("Mostrar só o que falta").click();
  // SOS works with the family's data.
  await mp.goto(`${BASE}/app/sos`);
  await mp.getByRole("link", { name: /SMS para Tia Rosa/ }).waitFor();
  await mp.getByRole("link", { name: /Navegar/ }).first().waitFor();

  // Viewer: invite, accept, crawl. Must never see health data or edit controls.
  await a.goto(`${BASE}/app/family`);
  const emailV = `viewer-${stamp}@example.com`;
  await a.fill("#invite-email", emailV);
  await a.selectOption("#invite-role", "viewer");
  await a.click('button:has-text("Convidar")');
  const invite = new URL(await a.locator('input[aria-label="Link do convite"]').inputValue()).pathname;
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const v = await vctx.newPage();
  v.on("pageerror", (e) => failures.push(`viewer pageerror: ${e.message}`));
  await signup(v, "Avô Zé", emailV, invite);
  await v.waitForURL(new RegExp(invite));
  await v.getByRole("button", { name: /Aceitar/ }).click();
  await v.waitForURL(/joined=1/);
  for (const p of pages) await visit(v, p, "viewer");
  await v.goto(`${BASE}/app/home-kit`);
  if (await v.getByRole("button", { name: /Comprei/ }).count()) failures.push("viewer sees purchase buttons");
  await v.goto(`${BASE}/app/members`);
  if (await v.getByText("Dados de saúde").count()) failures.push("viewer sees health badge");

  console.log(failures.length ? `FAILURES:\n${failures.join("\n")}` : "CRAWL OK");
  if (failures.length) process.exitCode = 1;
} catch (e) {
  console.error("CRAWL FAILED:", e.message, failures.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
