# Security and privacy

## Threat model (summary)

| Threat | Control |
|---|---|
| A user reads another family's data | RLS on every table via `private.has_family_role()`; composite FKs prevent cross-family references. Tested in `tests/integration/family-permissions.test.ts`. |
| A member edits plan definitions | Role ladder in policies + column guard triggers for `member`. |
| Invitation link forwarded/leaked | Token = 256-bit random, stored as SHA-256 only; bound to the invited email (`invitation_email_mismatch`); expires ≤14 days (default 7); single use; revocable; preview reveals only family name, inviter first name and a masked email. |
| Forged invitation acceptance | Clients cannot set `accepted_at`/`token_hash` (trigger); acceptance only via `accept_invitation()`. |
| Account enumeration on login | Same response whether or not the email exists. |
| Magic-link abuse | App-level fixed-window limits (5/h per email, 20/h per IP, `consume_rate_limit`, service role only) + Supabase Auth limits. Invitation creation limited to 20/h per family in the database. |
| CSRF on `/api/sync` | Same-origin check + JSON content type required; Server Actions have built-in origin checks. |
| Stale private pages on shared devices | Service worker page cache deleted on sign-out and on the login page; `/app` responses `Cache-Control: private, no-store`. |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `nosniff`, HSTS, strict referrer policy, restrictive permissions policy. |
| Privilege escalation via SECURITY DEFINER | Functions in non-exposed `private` schema, `search_path = ''`, explicit grants; public RPCs revoke `public`/`anon` where not needed. |
| Leaking health data | Separate `member_health` table: requires explicit consent (`consent_at`, `consent_by = auth.uid()`); hidden from viewers; never in invitations, emails, audit logs (field names only) or engine outputs; on emergency cards only when `include_on_card`. |

## RGPD

- Data minimisation: signup = name + email; address optional and unused by calculations.
- Consent: explicit checkbox for terms/privacy at signup; separate explicit consent for health data (art. 9(2)(a)).
- Access/portability: `GET /api/account/export` (JSON of everything the user can see).
- Erasure: Settings → delete account (service role). Families where the user is the only account are deleted; a sole admin of a family with other accounts must appoint another admin first.
- Audit: `audit_logs` records actor, table, record id, action and changed field names — never values. Visible to member+.
- Before launch: complete the controller identity, sub-processor list and hosting regions in `/privacy` and `/terms` (legal review required).

## Operational notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only (`server-only` import guard, never prefixed `NEXT_PUBLIC_`).
- Map tiles are fetched from `tile.openstreetmap.org` by the browser; respect the OSM tile usage policy or switch to a commercial/self-hosted tile provider before high traffic.
- Rotate the service role key if it is ever exposed; all other keys are public by design.
