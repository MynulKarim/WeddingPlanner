-- Phase 5 — personalized invitations + RSVP (migration 0008).
-- Apply in the Supabase SQL editor AFTER 0001–0007.
--
-- Token model: invitations store only token_hash (sha256 hex). Raw tokens are
-- shown once at creation and never stored. Guest access resolves server-side
-- (service role, token → invitation → guest scope); there is deliberately NO
-- public/anon RLS policy on invitations, guests, or rsvps.
-- One active invitation per guest: UNIQUE(guest_id); regeneration replaces
-- the hash (old links die immediately).

alter table weddings add column if not exists rsvp_deadline timestamptz;

alter table invitations add column if not exists updated_at timestamptz not null default now();

alter table invitations drop constraint if exists invitations_guest_id_unique;
alter table invitations add constraint invitations_guest_id_unique unique (guest_id);

drop trigger if exists touch_invitations_updated_at on invitations;
create trigger touch_invitations_updated_at
  before update on invitations
  for each row execute function public.touch_updated_at();

-- RSVP answers: allergies, plus-one name, custom question answers (jsonb).
alter table rsvps add column if not exists allergies text;
alter table rsvps add column if not exists plus_one_name text;
alter table rsvps add column if not exists answers jsonb not null default '{}';

-- Custom RSVP questions. event_id null = asked for every assigned event.
create table if not exists rsvp_questions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  question text not null,
  kind text not null default 'text' check (kind in ('text', 'choice', 'boolean')),
  options jsonb not null default '[]',
  required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rsvp_questions_wedding_id_idx on rsvp_questions (wedding_id);
create index if not exists rsvp_questions_event_id_idx on rsvp_questions (event_id);

alter table rsvp_questions enable row level security;

drop policy if exists "rsvp_questions_member_all" on rsvp_questions;
create policy "rsvp_questions_member_all" on rsvp_questions
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));
