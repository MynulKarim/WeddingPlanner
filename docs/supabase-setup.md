# Supabase setup — Phase 1

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Note the **Project URL**, **anon public key**, and **service_role key**
   (Project Settings → API). The service key is server-only — never expose it
   to the browser or commit it.

## 2. Apply migrations (in order)

In Supabase Dashboard → SQL Editor, run:

1. `supabase/migrations/0001_core_foundation.sql`
2. `supabase/migrations/0002_profiles_rls.sql`
3. `supabase/migrations/0003_weddings_creator_select.sql`
4. `supabase/migrations/0004_owner_trigger_null_uid.sql`
5. `supabase/migrations/0005_guest_hub.sql`
6. `supabase/migrations/0006_design_media.sql`
7. `supabase/migrations/0007_website.sql`
8. `supabase/migrations/0008_rsvp.sql`
9. `supabase/migrations/0009_admin_locale.sql`
10. `supabase/migrations/0010_communications.sql`
11. `supabase/migrations/0011_registry.sql`
12. `supabase/migrations/0012_planning.sql`
13. `supabase/migrations/0013_engagement.sql`
14. `supabase/migrations/0014_dayof.sql`
15. `supabase/migrations/0015_hardening.sql`

Both files are idempotent (`if not exists` / `drop … if exists`).

## 3. Configure auth

- Authentication → Sign In / Providers → **Email**: enabled.
- Decide on **Confirm email**: ON recommended (verification flow is built in).
  The app redirects verification/magic-link/reset links to
  `<APP_URL>/auth/callback?next=…`.
- Authentication → URL Configuration → **Site URL**: your app URL
  (e.g. `http://localhost:3000`).
- Add **Redirect URLs**: `<APP_URL>/auth/callback` (and `/auth/callback/**`).

## 4. Wire the app

Create `.env.local` (never commit) from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
SUPABASE_SERVICE_ROLE_KEY=eyJ…   # server-only, needed for integration tests
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Verify

```bash
npm run typecheck && npm run lint
npx vitest run                    # unit tests (no cloud needed)
npx vitest run tests/integration  # needs the env above + applied migrations
npm run build
```

Then: register → verify email → sign in → create a wedding → open it →
invite flow placeholder → profile.
