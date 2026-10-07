-- Phase 11 — day-of operations (migration 0014).
-- Apply in the Supabase SQL editor AFTER 0001–0013.
--
-- Check-ins: one row per guest+event (UNIQUE); reversal deletes the row.
-- Staff are wedding members with the staff role — check-in writes are open
-- to all members (their day-of job), while planning mutations stay
-- planner-gated in application code. Announcements coordinate staff; both
-- tables are member-only (no public policies).

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  checked_in_by uuid,
  note text not null default '',
  checked_in_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  title text not null,
  body text not null default '',
  is_active boolean not null default true,
  position integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists checkins_wedding_id_idx on checkins (wedding_id);
create index if not exists checkins_event_id_idx on checkins (event_id);
create index if not exists checkins_guest_id_idx on checkins (guest_id);
create index if not exists announcements_wedding_id_idx on announcements (wedding_id);

alter table checkins enable row level security;
alter table announcements enable row level security;

drop policy if exists "checkins_member_all" on checkins;
create policy "checkins_member_all" on checkins
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "announcements_member_all" on announcements;
create policy "announcements_member_all" on announcements
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));
