-- Phase 1 — fix INSERT...RETURNING on weddings (migration 0003).
-- Apply in the Supabase SQL editor AFTER 0001 + 0002.
--
-- Root cause (verified live 2026-10-05 with three probe scripts):
--   * Plain INSERT into weddings works; SELECT afterwards works.
--   * UPDATE...RETURNING and INSERT...RETURNING on events work.
--   * Only INSERT INTO weddings ... RETURNING fails with 42501.
-- The RETURNING row's SELECT-policy check cannot see the owner-membership
-- row written by the on_wedding_created AFTER trigger in the same statement,
-- so `weddings_select_member` (which subqueries wedding_members) filters it.
--
-- Fix: let the creator see rows they created via a policy that inspects only
-- the NEW row itself (no subquery, no snapshot hazard), and lock created_by
-- to the inserting user so the policy grants nothing extra.

drop policy if exists "weddings_insert_auth" on weddings;
create policy "weddings_insert_auth" on weddings
  for insert with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists "weddings_select_created_by" on weddings;
create policy "weddings_select_created_by" on weddings
  for select using (created_by = auth.uid());
