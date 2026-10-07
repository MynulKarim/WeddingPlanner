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

## Phase 15 additions (migrations 0016–0018)

- `game_questions(id, wedding_id, game_id FK CASCADE, question, options JSONB, correct_option NULL, position)` — quiz/vote questions; member-all + public read on published weddings with active games.
- `game_votes(id, wedding_id, question_id FK CASCADE, guest_name, option_index, UNIQUE(question_id, guest_name))` — one ballot per name per question; public insert on published weddings + active games, tally-visible reads.
- `vendor_payments(id, wedding_id, vendor_id FK CASCADE, amount_cents > 0, paid_on, note)` — installment line items; `sync_vendor_paid()` trigger rolls inserts/deletes into `vendors.paid_cents` atomically. Member-only.
- `team_invites(id, wedding_id, email, role CHECK admin|planner|staff, invited_by, UNIQUE(wedding_id, email))` — pending team access; member read, admin write; consumed by auto-link on sign-in/registration. Never owner.

## Phase 16 additions (migrations 0019–0020, invoker-rights RPCs)

- `messages.status` gains transient `sending` + `claimed_at`; `claim_due_messages(p_now, p_limit, p_wedding_id)` atomically claims due rows (`FOR UPDATE SKIP LOCKED`, stale recovery after 10 min) so overlapping dispatchers never double-send.
- `submit_rsvp_batch(p_wedding_id, p_guest_id, p_rows)` — all event rows in one transaction with the deadline re-read inside (no torn submits, no TOCTOU).
- `claim_registry_item(...)` returns `ok | sold_out | unavailable` — item row locked, stock decided under lock (no oversell); `sync_claim_count` still maintains totals. Runs `security definer` (0021): the lock read is invisible to anon under RLS, so authorization comes from the in-body checks (wedding match, active, stock), mirroring the public-insert policy.
- `checkin_guest(...)` — tenant guards + upsert in one call (opposing check-in/undo stays last-writer-wins).

## Security notes

- Store only `token_hash` (sha256) for invitation tokens; raw token is shown once.
- RLS: deny-by-default; member policies check `wedding_members`, guest policies check
  `invitation context` via secure function (Phase 1/5).
- `weddings_select_created_by` exists because INSERT...RETURNING cannot see the
  owner-membership row written by the AFTER trigger in the same statement
  (verified live); the policy inspects only the new row (`created_by`), and the
  INSERT policy pins `created_by = auth.uid()`.
- Audit log + storage policies arrive with their phases.
