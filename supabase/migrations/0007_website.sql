-- Phase 4 — public wedding website (migration 0007).
-- Apply in the Supabase SQL editor AFTER 0001–0006.
--
-- wedding_websites holds publishing state + website layout/content per wedding.
-- Public reads: published websites are world-readable (needed for the public
-- /w/<slug> page + sitemap). Media marked approved-public/public is readable
-- anonymously at both the table and storage level; everything else stays
-- member-only. Guest-personalized content arrives in Phase 5.

create table if not exists wedding_websites (
  wedding_id uuid primary key references weddings(id) on delete cascade,
  is_published boolean not null default false,
  noindex boolean not null default false,
  sections jsonb not null default '[]',
  content jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_wedding_websites_updated_at on wedding_websites;
create trigger touch_wedding_websites_updated_at
  before update on wedding_websites
  for each row execute function public.touch_updated_at();

alter table wedding_websites enable row level security;

drop policy if exists "websites_member_all" on wedding_websites;
create policy "websites_member_all" on wedding_websites
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- World-readable only when published (powers /w/<slug>, sitemap, SEO).
drop policy if exists "websites_public_read" on wedding_websites;
create policy "websites_public_read" on wedding_websites
  for select using (is_published = true);

-- Public page data: title/theme (weddings), schedule (events), and monogram
-- of published weddings. Guest data (guests, guest_events, invitations,
-- rsvps) intentionally has NO public policy — personalization arrives in
-- Phase 5 behind invitation tokens.
drop policy if exists "weddings_public_read" on weddings;
create policy "weddings_public_read" on weddings
  for select using (
    exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = weddings.id and w.is_published = true
    )
  );

drop policy if exists "events_public_read" on events;
create policy "events_public_read" on events
  for select using (
    exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = events.wedding_id and w.is_published = true
    )
  );

drop policy if exists "monograms_public_read" on monograms;
create policy "monograms_public_read" on monograms
  for select using (
    exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = monograms.wedding_id and w.is_published = true
    )
  );

-- Public media rows (gallery/registry images the couple approved).
drop policy if exists "media_public_read" on media;
create policy "media_public_read" on media
  for select using (visibility in ('approved-public', 'public'));

-- Public storage reads gated by the media row's visibility. The private
-- bucket stays private; only objects explicitly marked public are served.
drop policy if exists "wedding_media_public_read" on storage.objects;
create policy "wedding_media_public_read" on storage.objects
  for select using (
    bucket_id = 'wedding-media'
    and exists (
      select 1 from public.media m
      where m.path = storage.objects.name
        and m.visibility in ('approved-public', 'public')
    )
  );
