# FamilyReady — Architecture

Status: implemented (v1). This document describes what exists in the repository; deviations from the original brief are listed explicitly in §9.

## 1. Context and constraints

| Item | Decision |
|---|---|
| Product | Multi-user SaaS for family emergency preparedness (Portugal, PT-PT, EUR). |
| Hosting | Vercel (Next.js) + Supabase (Postgres, Auth, Realtime). |
| Primary device | Smartphone; must remain useful offline. |
| Sensitive data | Household composition, approximate location, optional health data. RGPD applies. |
| Team assumption | Small team; prefer few moving parts over distributed services. |

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| UI | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Radix primitives (shadcn-style components written in-repo), Lucide icons, Sonner toasts | Server Components keep data access on the server; Radix gives accessible dialogs/menus. |
| Mutations | Server Actions wrapped by `familyAction()` (role check + Zod validation + revalidation) | One validation path, no separate REST layer to maintain. |
| Item-state sync | `POST /api/sync` route handler | Same endpoint serves online toggles and the offline outbox replay. |
| Data | Supabase Postgres with Row Level Security | Authorisation enforced in the database, not only in the app. |
| Auth | Supabase Auth, passwordless email (magic link + 6-digit code) | Brief requires name + email only. |
| Realtime | Supabase Realtime `postgres_changes`, filtered by `family_id`, RLS-checked | "Rui buys water, Ana sees it immediately." |
| Offline | Hand-written service worker + IndexedDB outbox (`idb-keyval`) | Small, auditable; no build-plugin coupling with Turbopack. |
| Maps | Leaflet + OpenStreetMap tiles | No API key; coordinates stored as numbers so they work offline. |
| Tests | Vitest (unit, engine), Vitest against local Supabase (integration/RLS), Playwright scripts (E2E) | |

Not used, deliberately: TanStack Query (RSC + `router.refresh()` + realtime cover the needs), React Hook Form (forms are validated server-side with Zod; a second client schema layer added no value), a chart library (CSS/SVG bars and rings are lighter and more accessible for the few indicators needed). Cache Components is disabled: almost every private page is session-bound.

## 3. Module layout

```
src/
  app/                    routes only (thin): (public), (auth), app/*, onboarding, invite, api, auth/confirm
  domain/                 pure TypeScript, no I/O — the calculation engine (unit-tested)
    preparedness/         water, food, home kit, go bags, kit merge, readiness, alerts, reference values
    energy/               Wh/W sizing, tier recommendation, station picking, solar plan
    budget/               budget allocation
    locations/            districts and indicative regional risks
  modules/<feature>/      server actions, loaders and feature components
    auth onboarding(family) family members household home-kit go-bags kits inventory shopping products
    energy meeting-points communication scenarios tasks reviews notifications offline dashboard settings
  content/scenarios/      versioned procedure content (per locale)
  components/             design system (ui/) and layout
  lib/                    env, Supabase clients, session/family context, action helpers
  i18n/                   locale config, formatting, shared vocabulary
supabase/migrations/      versioned schema, RLS, functions, seed data
tests/integration/        RLS/permission/realtime tests against a real Supabase stack
tests/e2e/                Playwright end-to-end scripts
```

Dependency rule: `domain` imports nothing from `app`, `modules` or `lib`. `modules` adapt database rows to domain inputs (`modules/preparedness/load.ts`).

## 4. Key design decisions

### 4.1 Derived requirements, persisted state
The engine recomputes requirements (quantities, items) on every read from the household snapshot. The database stores only what the family *did*: quantity owned, purchased by whom/when, packed, expiry, overrides, custom items. Rows are keyed by a stable `item_key`.

Consequences:
- Adding a baby immediately adds diapers/formula to HOME KIT, the responsible adult's bag and the shopping list — no sync job.
- Removing a member hides generated rows that no longer apply but keeps them in the database (reverting restores progress).
- The shopping list is a view over kit gaps plus manual items (`shopping_list_items`); nothing is copied.

### 4.2 Two independent kits
`home_kit_items` (stay at home, 1–60 days) and `evacuation_bag_items` (72 h bags) are separate tables with separate categories, screens and print views. The shopping list aggregates both but labels the source.

### 4.3 Family as the unit of ownership
Every row carries `family_id`. Accounts join a family through `family_members` with a role. Household persons (`member_profiles`, including children without accounts) are distinct from accounts.

### 4.4 Content as code
Scenario procedures live in `src/content/scenarios` (typed, reviewable in pull requests, bundled for offline use, keyed by locale). Per-family decisions and checklist progress live in `emergency_plans`. See `docs/CONTENT.md` for the validation requirement.

### 4.5 Catalogue without fake integrations
No store APIs are called. Generic items carry *labelled planning estimates*; brand products carry specifications with a source URL and check date and **no price** until a verified price row exists in `product_prices`. See `docs/CATALOGUE.md`.

## 5. Security model (summary — details in `docs/SECURITY.md`)

Roles: `viewer < member < editor < admin` (Postgres enum order is relied upon).

| Capability | viewer | member | editor | admin |
|---|:-:|:-:|:-:|:-:|
| Read plan, kits, contacts, meeting points | ✓ | ✓ | ✓ | ✓ |
| Read health data | – | ✓ | ✓ | ✓ |
| Mark bought / owned / packed, inventory, shopping, tasks, checklists, reviews | – | ✓ | ✓ | ✓ |
| Edit household, members, kits definition, plan, energy | – | – | ✓ | ✓ |
| Invite, change roles, revoke access, delete family | – | – | – | ✓ |

Enforced by RLS policies using `private.has_family_role()`; column-level limits for members are enforced by triggers (`guard_member_item_update`, `guard_member_bag_update`). The app checks roles too, but only for UX — the database is authoritative.

## 6. Data model

25 tables (see migrations). Spec names map as follows:

| Brief | Implementation |
|---|---|
| users | `profiles` (1:1 with `auth.users`) |
| family_members | `family_members` (accounts + role) |
| member_profiles | `member_profiles` (persons) + `member_health` (consented health data) |
| equipment | `energy_devices` (loads to power) |
| emergency_scenarios, scenario_actions | code content `src/content/scenarios` |
| emergency_plans | `emergency_plans` (per family × scenario) |
| shopping_lists | not needed: one list per family = view over kits + `shopping_list_items` |
| — (added) | `emergency_contacts`, `meeting_point_responsibles`, `product_energy_specs`, `private.rate_limits` |

Integrity: composite foreign keys `(family_id, id)` make cross-family references impossible (e.g. a bag item cannot point to another family's bag). `ON DELETE SET NULL (column)` keeps `family_id` intact on optional references. Families with no remaining accounts are deleted by trigger.

## 7. Request flow

1. `src/proxy.ts` refreshes the Supabase session cookie and redirects anonymous users away from `/app` and `/onboarding`.
2. Pages call `requireFamily(minRole)` → resolves user, active family (cookie preference, membership re-checked) and role.
3. Reads use the user-bound Supabase client (RLS). `loadPreparedness()` (React `cache`) runs the engine once per request.
4. Writes: Server Actions via `familyAction()`; item state via `/api/sync`.
5. After writes, `revalidatePath("/app", "layout")`; other members receive a realtime event and `router.refresh()`.

## 8. Offline model

- Service worker (`public/sw.js`): network-first for pages; private pages under `/app` and public scenario pages are cached after each successful load; "Disponibilizar offline" pre-caches the plan, meeting points, communication, kits, scenarios, cards. Cached private pages are deleted on sign-out and when the login page loads.
- Writes offline: item-state changes (bought/owned/packed/quantity) are queued in IndexedDB and replayed in order when the connection returns; other forms are disabled offline with an explicit message.
- Status bar: online/offline, server timestamp of the data on screen, pending changes.
- Not available offline (stated in the UI): map tiles, invitations, email, anything not yet visited/downloaded.
- Conflict policy: last write wins per field (operations are idempotent "set" operations).

## 9. Deviations from the brief (and why)

| Brief | Implemented | Reason |
|---|---|---|
| PDF export | Print-optimised pages + browser "Save as PDF" | Works offline, no server rendering cost, same output quality for text documents. |
| Real store prices/links | Labelled planning estimates; verified-price table ready | No authorised product feeds exist yet; fabricating prices or links was explicitly forbidden. |
| Push/email notifications | In-app computed alerts (expiry, recharge, bag checks, reviews) | Email digests need a scheduler and an email provider decision; see ROADMAP. |
| Photos (meeting points, inventory) | Not implemented | Requires Storage bucket policies and image handling; no button is shown. |
| Validated safety procedures | Content written from public guidance, flagged "validation pending" | Formal validation against official documents is an editorial task that must be done by a qualified reviewer. |
| Full i18n | Locale config, formatting and vocabulary centralised; page copy inline PT-PT | Extracting all copy before a second language exists is premature. |
