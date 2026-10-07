-- Phase 6 — admin language preference (migration 0009).
-- Apply in the Supabase SQL editor AFTER 0001–0008.
--
-- profiles.locale stores the couple/admin's preferred locale for dashboard
-- date/number formatting. No RLS change: the column inherits the existing
-- profiles_select_own / profiles_update_own policies. Guest-facing locale
-- resolution (guest → manual ?lang= → wedding default → fallback) is
-- application-level and needs no schema.

alter table profiles add column if not exists locale text;
