/**
 * Applies supabase/migrations to a hosted project through the Supabase
 * Management API (HTTPS only — for environments without direct Postgres
 * access) and records them in supabase_migrations.schema_migrations so the
 * Supabase CLI (`supabase db push`) sees them as applied.
 *
 *   SUPABASE_ACCESS_TOKEN=... node scripts/supabase-remote.mjs migrate <project-ref>
 *
 * Idempotent: already-recorded versions are skipped.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.supabase.com/v1";
const token = process.env.SUPABASE_ACCESS_TOKEN ?? "proxy-injected";

export async function sql(ref, query) {
  const res = await fetch(`${API}/projects/${ref}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function migrate(ref) {
  await sql(ref, `create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
  const applied = new Set((await sql(ref, "select version from supabase_migrations.schema_migrations")).map((r) => r.version));
  const dir = "supabase/migrations";
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    if (applied.has(version)) {
      console.log(`skip  ${file}`);
      continue;
    }
    const body = readFileSync(join(dir, file), "utf8");
    // One request per migration, wrapped in a transaction so a failure leaves no partial state.
    await sql(ref, `begin;\n${body}\ninsert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${rest.join("_").replace(/'/g, "''")}');\ncommit;`);
    console.log(`apply ${file}`);
  }
}

const [cmd, ref] = process.argv.slice(2);
if (cmd === "migrate" && ref) await migrate(ref);
else {
  console.error("usage: node scripts/supabase-remote.mjs migrate <project-ref>");
  process.exit(1);
}
