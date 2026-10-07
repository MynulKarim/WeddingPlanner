-- Phase 3 — invitation design, monograms, media (migration 0006).
-- Apply in the Supabase SQL editor AFTER 0001–0005.
--
-- RLS: wedding = tenant. New tables inherit the member-based policy pattern.
-- Media files live in the private `wedding-media` bucket under
-- <wedding_id>/<file>; storage policies restrict object access to members of
-- that wedding. Guest-scoped reads (invitation/website) arrive in Phases 4–5.

-- wedding-level theme overrides (theme_id column already exists)
alter table weddings add column if not exists theme_overrides jsonb not null default '{}';

-- invitation layout: ordered sections with enable flags (see lib/invitation/sections.ts)
create table if not exists invitation_designs (
  wedding_id uuid primary key references weddings(id) on delete cascade,
  sections jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_invitation_designs_updated_at on invitation_designs;
create trigger touch_invitation_designs_updated_at
  before update on invitation_designs
  for each row execute function public.touch_updated_at();

-- monogram: one per wedding (upsert), reused across invitation/website/print
create table if not exists monograms (
  wedding_id uuid primary key references weddings(id) on delete cascade,
  initials text not null,
  style text not null default 'serif' check (style in ('serif', 'script', 'modern', 'traditional')),
  shape text not null default 'seal' check (shape in ('seal', 'crest', 'minimal')),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_monograms_updated_at on monograms;
create trigger touch_monograms_updated_at
  before update on monograms
  for each row execute function public.touch_updated_at();

-- media library (images + video)
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  path text not null,
  kind text not null default 'image' check (kind in ('image', 'video')),
  mime text not null,
  size_bytes integer not null default 0,
  visibility text not null default 'guest-only'
    check (visibility in ('private', 'guest-only', 'approved-public', 'public')),
  label text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists media_wedding_id_idx on media (wedding_id);

-- private storage bucket for wedding media
insert into storage.buckets (id, name, public)
values ('wedding-media', 'wedding-media', false)
on conflict (id) do nothing;

-- table RLS
alter table invitation_designs enable row level security;
alter table monograms enable row level security;
alter table media enable row level security;

drop policy if exists "invitation_designs_member_all" on invitation_designs;
create policy "invitation_designs_member_all" on invitation_designs
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "monograms_member_all" on monograms;
create policy "monograms_member_all" on monograms
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "media_member_all" on media;
create policy "media_member_all" on media
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- storage.objects RLS: members manage objects under their wedding's prefix.
-- (App writes paths as <wedding_id>/<uuid>.<ext>; malformed paths fail
-- closed because the uuid cast raises.)
drop policy if exists "wedding_media_member_read" on storage.objects;
create policy "wedding_media_member_read" on storage.objects
  for select using (
    bucket_id = 'wedding-media'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "wedding_media_member_write" on storage.objects;
create policy "wedding_media_member_write" on storage.objects
  for insert with check (
    bucket_id = 'wedding-media'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "wedding_media_member_update" on storage.objects;
create policy "wedding_media_member_update" on storage.objects
  for update using (
    bucket_id = 'wedding-media'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'wedding-media'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "wedding_media_member_delete" on storage.objects;
create policy "wedding_media_member_delete" on storage.objects
  for delete using (
    bucket_id = 'wedding-media'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );
