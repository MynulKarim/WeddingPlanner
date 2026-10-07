-- Phase 15 — team invites with auto-link on registration (migration 0018).
-- Apply in the Supabase SQL editor AFTER 0001–0017.
--
-- Flow: an admin records (wedding_id, email, role). When the invitee
-- registers or signs in with that email, app code (service role) inserts
-- the wedding_members row and deletes the invite. Invites never grant
-- owner (ownership transfers explicitly); roles are admin/planner/staff.
-- Pending invites are visible to members but writable only by admins.

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  role text not null check (role in ('admin', 'planner', 'staff')),
  invited_by uuid,
  created_at timestamptz not null default now(),
  unique (wedding_id, email)
);

create index if not exists team_invites_email_idx on team_invites (email);
create index if not exists team_invites_wedding_id_idx on team_invites (wedding_id);

alter table team_invites enable row level security;

drop policy if exists "team_invites_member_read" on team_invites;
create policy "team_invites_member_read" on team_invites
  for select using (public.is_wedding_member(wedding_id));

drop policy if exists "team_invites_admin_write" on team_invites;
create policy "team_invites_admin_write" on team_invites
  for all using (public.is_wedding_admin(wedding_id))
  with check (public.is_wedding_admin(wedding_id));
