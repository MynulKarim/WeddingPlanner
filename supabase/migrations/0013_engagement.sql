-- Phase 10 — guest engagement (migration 0013).
-- Apply in the Supabase SQL editor AFTER 0001–0012.
--
-- Moderation model: guest-submitted content starts UNAPPROVED and invisible
-- publicly; couple approval flips it visible. Time capsule entries stay
-- sealed until their open date even when approved. Vows are member-only
-- (private keepsake, never public).
-- Public writes (guestbook sign, song request, capsule note, photo upload)
-- are allowed ONLY on published weddings and constrained to safe values in
-- RLS WITH CHECK (unapproved, guest-scoped visibility).

-- media: guest attribution + approval flag for the moderation queue.
alter table media add column if not exists guest_id uuid references guests(id) on delete set null;
alter table media add column if not exists guest_name text;
alter table media add column if not exists is_approved boolean not null default true;

-- public media reads now require approval too (existing rows default true).
drop policy if exists "media_public_read" on media;
create policy "media_public_read" on media
  for select using (
    is_approved = true and visibility in ('approved-public', 'public')
  );

-- anonymous guest uploads: published weddings only, forced into the
-- moderation queue (unapproved + guest-scoped visibility).
drop policy if exists "media_guest_insert" on media;
create policy "media_guest_insert" on media
  for insert with check (
    is_approved = false
    and visibility in ('private', 'guest-only')
    and kind in ('image', 'video')
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = media.wedding_id and w.is_published = true
    )
  );

drop policy if exists "wedding_media_guest_write" on storage.objects;
create policy "wedding_media_guest_write" on storage.objects
  for insert with check (
    bucket_id = 'wedding-media'
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = ((storage.foldername(name))[1])::uuid
        and w.is_published = true
    )
  );

-- guestbook
create table if not exists guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  guest_name text not null,
  message text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(message) between 1 and 2000)
);

-- song requests
create table if not exists song_requests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  guest_name text not null,
  title text not null,
  artist text not null default '',
  message text not null default '',
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(title) between 1 and 200)
);

-- albums (couple-curated; items inherit media visibility publicly)
create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists album_items (
  album_id uuid not null references albums(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  position integer not null default 0,
  primary key (album_id, media_id)
);

-- games (display cards: shoe game, quiz, kids activities)
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  kind text not null check (kind in ('shoe','quiz','kids','custom')),
  title text not null,
  description text not null default '',
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- time capsule (sealed until open_after)
create table if not exists time_capsules (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  guest_name text not null,
  message text not null,
  open_after date,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(message) between 1 and 2000)
);

-- vows (private couple keepsake)
create table if not exists vows (
  wedding_id uuid primary key references weddings(id) on delete cascade,
  text_a text not null default '',
  text_b text not null default '',
  shared text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_vows_updated_at on vows;
create trigger touch_vows_updated_at
  before update on vows
  for each row execute function public.touch_updated_at();

create index if not exists guestbook_wedding_id_idx on guestbook_entries (wedding_id);
create index if not exists songs_wedding_id_idx on song_requests (wedding_id);
create index if not exists albums_wedding_id_idx on albums (wedding_id);
create index if not exists games_wedding_id_idx on games (wedding_id);
create index if not exists capsule_wedding_id_idx on time_capsules (wedding_id);

alter table guestbook_entries enable row level security;
alter table song_requests enable row level security;
alter table albums enable row level security;
alter table album_items enable row level security;
alter table games enable row level security;
alter table time_capsules enable row level security;
alter table vows enable row level security;

-- member-all on everything (couple moderation + reads)
drop policy if exists "guestbook_member_all" on guestbook_entries;
create policy "guestbook_member_all" on guestbook_entries
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "songs_member_all" on song_requests;
create policy "songs_member_all" on song_requests
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "albums_member_all" on albums;
create policy "albums_member_all" on albums
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "album_items_member_all" on album_items;
create policy "album_items_member_all" on album_items
  for all using (
    exists (
      select 1 from public.albums a
      where a.id = album_items.album_id and public.is_wedding_member(a.wedding_id)
    )
  )
  with check (
    exists (
      select 1 from public.albums a
      where a.id = album_items.album_id and public.is_wedding_member(a.wedding_id)
    )
  );

drop policy if exists "games_member_all" on games;
create policy "games_member_all" on games
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "capsule_member_all" on time_capsules;
create policy "capsule_member_all" on time_capsules
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "vows_member_all" on vows;
create policy "vows_member_all" on vows
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- public reads: approved content of published weddings…
drop policy if exists "guestbook_public_read" on guestbook_entries;
create policy "guestbook_public_read" on guestbook_entries
  for select using (
    is_approved = true
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = guestbook_entries.wedding_id and w.is_published = true
    )
  );

drop policy if exists "songs_public_read" on song_requests;
create policy "songs_public_read" on song_requests
  for select using (
    is_approved = true
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = song_requests.wedding_id and w.is_published = true
    )
  );

drop policy if exists "albums_public_read" on albums;
create policy "albums_public_read" on albums
  for select using (
    exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = albums.wedding_id and w.is_published = true
    )
  );

drop policy if exists "album_items_public_read" on album_items;
create policy "album_items_public_read" on album_items
  for select using (
    exists (
      select 1 from public.albums a
      join public.wedding_websites w on w.wedding_id = a.wedding_id
      where a.id = album_items.album_id and w.is_published = true
    )
  );

drop policy if exists "games_public_read" on games;
create policy "games_public_read" on games
  for select using (
    is_active = true
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = games.wedding_id and w.is_published = true
    )
  );

-- …except the time capsule, which stays sealed until its open date.
drop policy if exists "capsule_public_read" on time_capsules;
create policy "capsule_public_read" on time_capsules
  for select using (
    is_approved = true
    and (open_after is null or open_after <= current_date)
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = time_capsules.wedding_id and w.is_published = true
    )
  );

-- public writes: signing/requesting/sealing on published weddings only,
-- forced into moderation (unapproved).
drop policy if exists "guestbook_public_insert" on guestbook_entries;
create policy "guestbook_public_insert" on guestbook_entries
  for insert with check (
    is_approved = false
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = guestbook_entries.wedding_id and w.is_published = true
    )
  );

drop policy if exists "songs_public_insert" on song_requests;
create policy "songs_public_insert" on song_requests
  for insert with check (
    is_approved = false
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = song_requests.wedding_id and w.is_published = true
    )
  );

drop policy if exists "capsule_public_insert" on time_capsules;
create policy "capsule_public_insert" on time_capsules
  for insert with check (
    is_approved = false
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = time_capsules.wedding_id and w.is_published = true
    )
  );
