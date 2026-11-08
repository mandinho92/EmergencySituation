# Deployment (Vercel + Supabase)

## 1. Supabase project

1. Create a project (EU region recommended for RGPD, e.g. Frankfurt/`eu-central-1`).
2. Link and push migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. **Auth → URL configuration**: Site URL = production URL; add `https://<domain>/**` and Vercel preview URLs to redirect URLs.
4. **Auth → Email templates**: copy `supabase/templates/magic_link.html` and `confirmation.html` (they link to `/auth/confirm?token_hash=…&type=email`, which works across devices, and include the 6-digit `{{ .Token }}` for installed apps).
5. **Auth → SMTP**: configure a production SMTP provider (the built-in sender is rate-limited and for testing only).
6. **Auth → Rate limits**: review email limits for expected signups.
7. Realtime: migrations add the shared tables to `supabase_realtime`; nothing else to enable.

## 2. Vercel project

Framework preset: Next.js. Node 22. Environment variables (Production and Preview):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | publishable or legacy anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` also accepted) |
| `NEXT_PUBLIC_SITE_URL` | yes for production | used in invitation links; falls back to `VERCEL_PROJECT_PRODUCTION_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | account deletion, app-level rate limiting; server-only |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | invitation emails; without them admins copy the link |

`npm run build` must pass locally before deploying (`lint`, `typecheck`, `test` run in CI).

## 3. Post-deploy checks

1. Sign up with a real mailbox; open the link on another device (token_hash flow) and use the 6-digit code on an installed PWA.
2. Create a family, invite a second account, mark an item as bought → visible on the other session within seconds.
3. Install the PWA, use "Disponibilizar offline", switch to airplane mode, open plan/meeting points/cards.
4. Settings → export data; delete a test account.

## 4. Rollback

- App: promote the previous Vercel deployment (instant).
- Database: migrations are forward-only. Write a new corrective migration; restore from Supabase PITR/backups only for data loss. Never edit an applied migration.

## 5. Local development

```bash
npm install
npx supabase start          # requires Docker
npx supabase status -o env  # copy URL / keys into .env.local (see .env.example)
npm run dev
```
Emails are captured by Mailpit at http://127.0.0.1:54324.

Tests:
```bash
npm test                    # engine unit tests
npm run test:integration    # RLS, invitations, realtime (needs supabase start)
npm run build && npm start &
node tests/e2e/smoke.mjs    # signup → onboarding → invite → realtime → offline
node tests/e2e/crawl.mjs    # every page as admin and viewer + form flows
```
