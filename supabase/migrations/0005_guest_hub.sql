-- Phase 2 — guest hub columns + indexes (migration 0005).
-- Apply in the Supabase SQL editor AFTER 0001–0004.
--
-- RLS: unchanged. New columns inherit their tables' existing policies
-- (events_member_all, guests_member_all, households_member_all,
-- guest_events_member_all). Couple/family grouping is modeled via
-- households; children via guests.is_child; dietary arrives with RSVP
-- (Phase 5), not here.

-- events: venue detail per PROJECT_SPEC (map/geolocation arrives Phase 8)
alter table events add column if not exists address text;
alter table events add column if not exists description text;
alter table events add column if not exists dress_code text;

-- guests: contact, notes, tags, children, plus-one name
alter table guests add column if not exists email text;
alter table guests add column if not exists phone text;
alter table guests add column if not exists notes text;
alter table guests add column if not exists tags text[] not null default '{}';
alter table guests add column if not exists is_child boolean not null default false;
alter table guests add column if not exists plus_one_name text;
alter table guests add column if not exists updated_at timestamptz not null default now();

drop trigger if exists touch_guests_updated_at on guests;
create trigger touch_guests_updated_at
  before update on guests
  for each row execute function public.touch_updated_at();

-- hub query indexes
create index if not exists events_wedding_id_idx on events (wedding_id);
create index if not exists households_wedding_id_idx on households (wedding_id);
create index if not exists guests_wedding_id_idx on guests (wedding_id);
create index if not exists guests_household_id_idx on guests (household_id);
create index if not exists guests_tags_idx on guests using gin (tags);
create index if not exists guest_events_event_id_idx on guest_events (event_id);
create index if not exists guest_events_guest_id_idx on guest_events (guest_id);
create index if not exists wedding_members_wedding_id_idx on wedding_members (wedding_id);
create index if not exists invitations_wedding_id_idx on invitations (wedding_id);
create index if not exists rsvps_wedding_id_idx on rsvps (wedding_id);
