-- Phase 13 — hardening: audit logs, plans, missing indexes (0015).
-- Apply in the Supabase SQL editor AFTER 0001–0014.
--
-- audit_logs: append-only operational trail. Members read their weddings'
-- logs; writes allowed to members (actions log with the user client) — rows
-- are never updated/deleted through the app (no update/delete policy at
-- all, so even members cannot rewrite history).
-- profiles.plan: account-level subscription tier (Stripe wiring: Phase 13
-- ops / billing integration; enforcement reads this column).

alter table profiles add column if not exists plan text not null default 'free'
  check (plan in ('free', 'plus', 'luxe'));

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references weddings(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null default '',
  entity_id text not null default '',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_wedding_id_idx on audit_logs (wedding_id);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);

alter table audit_logs enable row level security;

drop policy if exists "audit_logs_member_select" on audit_logs;
create policy "audit_logs_member_select" on audit_logs
  for select using (
    wedding_id is null
    or public.is_wedding_member(wedding_id)
  );

drop policy if exists "audit_logs_member_insert" on audit_logs;
create policy "audit_logs_member_insert" on audit_logs
  for insert with check (
    wedding_id is null
    or public.is_wedding_member(wedding_id)
  );

-- Query audit fixes: foreign-key / filter columns lacking indexes.
create index if not exists rsvps_wedding_guest_event_idx
  on rsvps (wedding_id, guest_id, event_id);
create index if not exists invitations_wedding_id_idx on invitations (wedding_id);
create index if not exists guest_events_guest_event_idx
  on guest_events (guest_id, event_id);
create index if not exists media_path_idx on media (path);
create index if not exists monograms_wedding_id_idx on monograms (wedding_id);
create index if not exists invitation_designs_wedding_id_idx on invitation_designs (wedding_id);
create index if not exists wedding_websites_wedding_id_idx on wedding_websites (wedding_id);
create index if not exists rsvp_questions_wedding_event_idx
  on rsvp_questions (wedding_id, event_id);
