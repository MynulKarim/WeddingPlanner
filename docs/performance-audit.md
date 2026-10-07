# Performance & query audit (Phase 13)

## Database queries

- Every foreign-key / filter column used in RLS or app queries carries an
  index (see migration `0015_hardening.sql` which closed the remaining gaps:
  `rsvps(wedding_id, guest_id, event_id)`, `invitations(wedding_id)`,
  `guest_events(guest_id, event_id)`, `media(path)`, plus member tables).
- Hot paths reviewed for N+1:
  - `fetchGuestHub` — single query with embeds (events, household).
  - `getRsvpBoard` — 4 queries (events, guests, assignments, rsvps),
    aggregation in memory; fine to thousands of guests.
  - `getDayOfData` — parallel fan-out of the above; same bounds.
  - `getPublishedWebsite` — ~6 small queries, all indexed lookups.
  - `processDueMessages` — capped at 100 rows per run; cron-friendly.
- `audit_logs` is append-mostly with a descending-time index; the viewer
  caps at 100 rows.

## Rendering

- Guest surfaces (`/w/[slug]`, `/invite/[token]`) are zero-JS server
  components; gallery uses `next/image` with remote patterns + lazy loading.
- Dashboard pages are server-rendered with targeted client islands
  (forms, dnd board, scanners); the QR scanner and PDF engine load lazily.
- `next/image` remote patterns limited to `*.supabase.co`.

## Follow-ups (pre-launch)

- [ ] Run Lighthouse on `/w/<slug>` and `/invite/<token>` (targets: LCP
      < 2.5s on 4G, CLS < 0.1).
- [ ] Load-test RSVP submission bursts (deadline day) and day-of check-in
      concurrency.
- [ ] Consider Postgres connection pooling (Supavisor) + read replicas if
      traffic warrants.
- [ ] Revisit `xlsx`/`puppeteer` bundle impact on serverless cold starts;
      externalize PDF rendering if slow (noted in Phase 12).
