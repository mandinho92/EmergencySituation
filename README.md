# FamilyReady

**Prepare today. Protect your family tomorrow.** A family emergency-preparedness platform for Portugal (PT-PT, EUR): household composition, HOME KIT and GO BAGS calculations, shopping list with budget, energy sizing, meeting points, communication plan, scenario procedures, sharing between family members, and offline access.

> Not a substitute for official instructions. In immediate danger call **112**.

## Features

- Passwordless accounts (name + email; magic link or 6-digit code), sessions, global sign-out, data export, account deletion.
- Families with roles (admin, editor, member, viewer), email-bound invitations, realtime sync between members, audit log.
- Household: any composition (adults, children, babies, seniors, reduced mobility, pets), optional consented health data, dwelling and approximate location with indicative regional risks.
- Calculation engine: water, food, hygiene, first aid, HOME KIT (24 h – 60 days, 17 categories), GO BAGS (72 h, per adult, light child bags, pet kits, weight limits), energy (Wh vs W, losses, solar), budget allocation, readiness score and top-5 actions.
- Inventory with expiries, maintenance/recharge alerts, quarterly reviews, tasks.
- Meeting points with OpenStreetMap, communication plan, printable plan, per-member emergency cards and checklists ("Save as PDF").
- 18 emergency scenarios adapted to the household, with shared checklists.
- PWA: installable, offline plan/meeting points/checklists/contacts, offline queue for item updates, connection and pending-changes status.

## Stack

Next.js 16 (App Router, Server Actions, TypeScript), Tailwind CSS v4, Radix, Lucide · Supabase (Postgres + RLS, Auth, Realtime) · Zod · Vitest · Playwright · Vercel.

## Quick start

```bash
npm install
npx supabase start                     # Docker required
cp .env.example .env.local             # fill with `npx supabase status -o env`
npm run dev                            # http://localhost:3000 (emails: http://127.0.0.1:54324)
```

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint, TypeScript |
| `npm test` | Engine unit tests |
| `npm run test:integration` | RLS, invitations, realtime against local Supabase |
| `npm run db:reset` | Re-apply migrations locally |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `node tests/e2e/smoke.mjs` · `crawl.mjs` | End-to-end checks against a running app |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — modules, data model, decisions, deviations from the brief
- [Calculation engine](docs/CALCULATION_ENGINE.md) — every reference value and formula
- [Security & privacy](docs/SECURITY.md) — permission matrix, RLS, RGPD
- [Deployment](docs/DEPLOYMENT.md) — Vercel + Supabase, checks, rollback
- [Catalogue](docs/CATALOGUE.md) — pricing rules and maintenance
- [Scenario content](docs/CONTENT.md) — validation status (launch blocker)
- [Roadmap](docs/ROADMAP.md) — phase status, verification performed, launch blockers
