-- Phase 16 — honor invited-only events publicly (migration 0022).
-- Apply in the Supabase SQL editor AFTER 0001–0021.
--
-- Gap (found in user testing): events carry visibility public|invited-only
-- (default invited-only), but events_public_read ignored the flag — every
-- event of a published wedding was world-readable, and the app query did
-- not filter either. Personalized invitations were always correct (they
-- resolve per-guest event eligibility, not this policy).
--
-- Fix at both layers: the RLS policy admits only public events of
-- published weddings (the real gate — the anon key is effectively public),
-- and getPublishedWebsite filters visibility='public' in app code too.
-- Couples keep the master switch (publish/unpublish) plus per-event
-- control; invited-only events now stay off the public site while remaining
-- visible to assigned guests via their invitation links and to the team.
drop policy if exists "events_public_read" on events;
create policy "events_public_read" on events
  for select using (
    visibility = 'public'
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = events.wedding_id and w.is_published = true
    )
  );
