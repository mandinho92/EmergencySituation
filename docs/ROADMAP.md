# Delivery status and roadmap

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 1 Analysis & architecture | Done | `ARCHITECTURE.md`, `CALCULATION_ENGINE.md`, `SECURITY.md` |
| 2 Foundation | Done | Design system, landing, auth (magic link + code), DB/RLS, families, onboarding |
| 3 Preparedness engine | Done | Water, food, hygiene, first aid, HOME KIT, GO BAGS, budget |
| 4 Family planning | Done | Meeting points (OSM), communication plan, contacts, scenarios + checklists, sharing/roles, realtime |
| 5 Equipment & shopping | Done (demo catalogue) | Catalogue, energy calculator, solar, shopping list with budget |
| 6 Advanced | Partial | PWA + offline + outbox, in-app alerts, quarterly reviews, expiries, print/PDF. Missing: email/push notifications, photos |
| 7 Quality & deployment | Done for v1 | Unit, integration, E2E; security headers; Vercel/Supabase guide; CI |

## Verification performed (local Supabase stack, production build)

- 64 unit tests (engine).
- 18 integration tests through PostgREST with real user JWTs: isolation, role matrix, health data, member column guards, invitations (binding, expiry, revocation, forging, 14-day cap), last-admin guard, cascades, audit, reviews RPC, realtime delivery + RLS filtering.
- E2E smoke: signup → email link → onboarding → dashboard → invitation → second user signs up and accepts → purchase visible to the other user via realtime → offline toggle queued and synced.
- E2E crawl: every private page also at 390 px (fails on horizontal overflow), mobile kit interactions (one-tap done, debounced stepper persisted after reload, "só o que falta" filter) and SOS SMS/navigation links.
- E2E crawl: 24 private pages as admin after real form flows (members, pet, contact, communication plan, meeting point, checklist, bags, task, inventory, shopping item, energy, review, export) and as a viewer (no purchase controls, no health data).

## Launch blockers

1. Validate scenario content against official sources (`CONTENT.md`).
2. Legal review of privacy policy and terms; fill controller identity, sub-processors and regions.
3. Production SMTP for Supabase Auth; Resend (or equivalent) domain for invitations.
4. Catalogue: verify prices before showing any as offers (`CATALOGUE.md`), or keep estimates only.
5. Review the planning reference values (`CALCULATION_ENGINE.md`) with a domain expert.

## Next iterations (prioritised)

1. Email digest of alerts (expiries, reviews) via Vercel Cron + email provider; web push optional.
2. Photos for meeting points and inventory (private Storage bucket, path-based RLS by `family_id`).
3. Offline outbox for scenario checklists and inventory edits (same `/api/sync` pattern).
4. Extract page copy to message catalogues; add EN.
5. Accessibility audit with screen readers (current: semantic landmarks, labels, focus styles, aria-live status).
6. Municipality list per district (official INE/DGT data) instead of free text.
7. Admin tooling for catalogue maintenance.
