# Backup & disaster recovery

Supabase manages physical backups; this project defines how we use them.

## Supabase platform backups

- **Daily backups**: automatic on paid plans (Project Settings → Database →
  Backups). Free tier: manual backups only — take one before every migration
  batch (SQL Editor → run, or Database → Backups → Take backup).
- **Point-in-time recovery (PITR)**: enable on paid plans for arbitrary
  restore points. RPO target with PITR: minutes. Without PITR: last backup.
- **What is covered**: all Postgres tables (weddings, guests, RSVP, …),
  Storage objects in `wedding-media`, auth users.

## What is NOT in database backups

- `.env.local` / production secrets (Supabase keys, Resend, Twilio, Stripe).
  Store these in a password manager + the hosting provider's env store.
- Deployed code (recoverable from git).

## Restore procedure

1. Supabase Dashboard → Database → Backups → Restore (new project
   recommended over in-place for verification).
2. Point `NEXT_PUBLIC_SUPABASE_URL` + keys at the restored project.
3. Re-run any migrations newer than the backup
   (`supabase/migrations/` is versioned in git — apply in order).
4. Verify: `npm run typecheck && npm run build`, then the tenancy +
   guest-hub integration suites against the restored project.
5. Rotate `SUPABASE_SERVICE_ROLE_KEY` if the incident involved key exposure.

## RTO / RPO targets

- RTO (restore to serving): under 2 hours for a full project restore.
- RPO (data loss window): last backup without PITR; minutes with PITR.

## Pre-migration checklist (every migration batch)

1. Confirm latest backup timestamp.
2. Apply migrations in numeric order in a staging project first when one
   exists (else the SQL Editor with the file contents).
3. Run `npm test` (unit + live integration) after applying.
