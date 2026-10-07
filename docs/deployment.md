# Deployment guide

## Hosting model

- **App**: any Node.js host that runs `next build && next start`
  (Vercel recommended — see notes below).
- **Database/auth/storage**: Supabase (managed Postgres + Auth + Storage).
- **PDF engine**: needs a Chromium binary on the app host
  (`puppeteer` downloads one on `npm install`). Vercel serverless cannot
  run it — use the HTML preview + browser print there, or an external
  render service (see `lib/pdf/render.ts`).

## Environment variables

Copy `.env.example` to `.env.local` (local) or the host's env store
(production). Required:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only, never `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (auth redirects, SEO, QR links) |

Optional (features degrade gracefully to NoOp when absent):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Real email sending |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Real SMS |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Future billing |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics |
| `SENTRY_DSN` | Error monitoring (documented wiring) |

## Vercel deployment

1. Push the repo to GitHub (`.env*` is gitignored — secrets go in
   Vercel → Project Settings → Environment Variables).
2. Import the project in Vercel (framework preset: Next.js).
3. Set all required env vars above.
4. Deploy. Then in Supabase → Authentication → URL Configuration:
   - Site URL = your production URL.
   - Redirect URLs += `https://<your-domain>/auth/callback`.

## Supabase setup (any host)

1. Create the project, note URL + anon + service-role keys.
2. SQL Editor → run `supabase/migrations/*.sql` **in numeric order**
   (0001 → 0015).
3. Authentication → Sign In / Up: enable Email, allow new signups, confirm
   email ON (recommended).
4. Storage: the `wedding-media` bucket is created by migration 0006
   (private). Verify it exists under Storage.

## Scheduled dispatch (communications)

`processDueMessages` has no cron attached by default. Options:

- Supabase **pg_cron** calling a secured Edge Function, or
- Any external cron hitting an authenticated endpoint you add that calls
  `processDueNow(weddingId)` per wedding, or
- The manual **“Deliver due now”** button on the Messages page.

## Pre-launch checklist

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` green.
- [ ] Migrations 0001–0015 applied (verify tables + `wedding-media` bucket).
- [ ] Auth URLs configured (Site URL + callback redirect).
- [ ] `npm audit` reviewed; backups/PITR enabled (see
      `docs/backup-disaster-recovery.md`).
- [ ] Lighthouse pass on `/w/<slug>` and `/invite/<token>`.
- [ ] Real provider keys installed OR team briefed on NoOp behavior.
