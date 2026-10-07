-- Phase 1 — profiles + Row Level Security for multi-tenancy.
-- Apply AFTER 0001_core_foundation.sql in the Supabase SQL editor (or via supabase CLI).
--
-- Model:
--   * weddings is the tenant root. Every wedding-owned row carries wedding_id.
--   * wedding_members grants access. Helper functions (SECURITY DEFINER) let
--     policies check membership without recursive RLS lookups.
--   * Invitation tokens (Phase 5) store only token_hash, never raw tokens.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on signup.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile + updated_at maintenance.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on profiles;
create trigger touch_profiles_updated_at
  before update on profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_weddings_updated_at on weddings;
create trigger touch_weddings_updated_at
  before update on weddings
  for each row execute function public.touch_updated_at();

-- Auto-add the creator as owner of a new wedding.
create or replace function public.add_wedding_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.wedding_members (wedding_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict (wedding_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_wedding_created on weddings;
create trigger on_wedding_created
  after insert on weddings
  for each row execute function public.add_wedding_owner();

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER so policies avoid RLS recursion).
-- ---------------------------------------------------------------------------
create or replace function public.is_wedding_member(wid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = wid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_wedding_admin(wid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = wid
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table weddings enable row level security;
alter table wedding_members enable row level security;
alter table events enable row level security;
alter table households enable row level security;
alter table guests enable row level security;
alter table guest_events enable row level security;
alter table invitations enable row level security;
alter table rsvps enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: users manage only their own row.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- weddings: members read; any signed-in user may create (trigger adds owner);
-- owner/admin update; owner deletes.
-- ---------------------------------------------------------------------------
drop policy if exists "weddings_select_member" on weddings;
create policy "weddings_select_member" on weddings
  for select using (public.is_wedding_member(id));

drop policy if exists "weddings_insert_auth" on weddings;
create policy "weddings_insert_auth" on weddings
  for insert with check (auth.uid() is not null);

drop policy if exists "weddings_update_admin" on weddings;
create policy "weddings_update_admin" on weddings
  for update using (public.is_wedding_admin(id))
  with check (public.is_wedding_admin(id));

drop policy if exists "weddings_delete_owner" on weddings;
create policy "weddings_delete_owner" on weddings
  for delete using (
    exists (
      select 1 from public.wedding_members m
      where m.wedding_id = id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- wedding_members: members read; owner/admin write.
-- ---------------------------------------------------------------------------
drop policy if exists "members_select_member" on wedding_members;
create policy "members_select_member" on wedding_members
  for select using (public.is_wedding_member(wedding_id));

drop policy if exists "members_insert_admin" on wedding_members;
create policy "members_insert_admin" on wedding_members
  for insert with check (public.is_wedding_admin(wedding_id));

drop policy if exists "members_update_admin" on wedding_members;
create policy "members_update_admin" on wedding_members
  for update using (public.is_wedding_admin(wedding_id))
  with check (public.is_wedding_admin(wedding_id));

drop policy if exists "members_delete_admin" on wedding_members;
create policy "members_delete_admin" on wedding_members
  for delete using (public.is_wedding_admin(wedding_id));

-- ---------------------------------------------------------------------------
-- Tenant tables: full CRUD for members of the owning wedding.
-- (Planner/staff write distinction hardens in later phases.)
-- ---------------------------------------------------------------------------
drop policy if exists "events_member_all" on events;
create policy "events_member_all" on events
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "households_member_all" on households;
create policy "households_member_all" on households
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "guests_member_all" on guests;
create policy "guests_member_all" on guests
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "guest_events_member_all" on guest_events;
create policy "guest_events_member_all" on guest_events
  for all using (
    exists (
      select 1 from public.guests g
      where g.id = guest_events.guest_id and public.is_wedding_member(g.wedding_id)
    )
  )
  with check (
    exists (
      select 1 from public.guests g
      where g.id = guest_events.guest_id and public.is_wedding_member(g.wedding_id)
    )
  );

drop policy if exists "invitations_member_all" on invitations;
create policy "invitations_member_all" on invitations
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "rsvps_member_all" on rsvps;
create policy "rsvps_member_all" on rsvps
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));
