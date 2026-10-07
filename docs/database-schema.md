# Database schema — Phase 0 draft

 applied in Phase 1 with RLS. This file is the design contract.

## Tenancy

```
users (supabase auth) ──< wedding_members >── weddings (tenant root)
weddings ── events, guests, households, pages, media, + all planning domains
```

Every wedding-owned table has `wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE`.

## Core DDL (see supabase/migrations/0001_core_foundation.sql)

- `weddings(id, slug UNIQUE, title, default_locale, theme_id, timezone, created_by, timestamps)`
- `wedding_members(wedding_id, user_id, role CHECK owner|admin|planner|staff, UNIQUE(wedding_id,user_id))`
- `events(id, wedding_id, name, starts_at, timezone, venue, visibility, rsvp_required)`
- `households(id, wedding_id, label)`
- `guests(id, wedding_id, household_id NULL, display_name, locale NULL, allow_plus_one)`
- `guest_events(guest_id, event_id, UNIQUE)` — eligibility
- `invitations(id, wedding_id, guest_id, token_hash UNIQUE, locale, rsvp_state)`
- `rsvps(id, wedding_id, guest_id, event_id, status attending|declined|pending, plus_one, dietary, notes)`

## Later phases

Pages/sections, media (private|guest-only|approved-public|public), monograms, venues/travel/menus/faq,
registry items, seating tables/assignments, vendors/budget/tasks, messages, photos/guestbook/songs/games,
checkins, thank-you notes. Each carries `wedding_id` + least-privilege RLS.

## Security notes

- Store only `token_hash` (sha256) for invitation tokens; raw token is shown once.
- RLS: deny-by-default; member policies check `wedding_members`, guest policies check
  `invitation context` via secure function (Phase 1/5).
- `weddings_select_created_by` exists because INSERT...RETURNING cannot see the
  owner-membership row written by the AFTER trigger in the same statement
  (verified live); the policy inspects only the new row (`created_by`), and the
  INSERT policy pins `created_by = auth.uid()`.
- Audit log + storage policies arrive with their phases.
