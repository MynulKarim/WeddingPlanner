-- Phase 0 documentary schema — NOT yet applied.
-- Phase 1 will split/apply this with RLS policies + tenant isolation tests.
-- Requires pgcrypto (gen_random_uuid).

create extension if not exists "pgcrypto";

create table weddings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  default_locale text not null default 'en',
  theme_id text not null default 'editorial',
  timezone text not null default 'UTC',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wedding_members (
  wedding_id uuid not null references weddings(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','admin','planner','staff')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  starts_at timestamptz,
  timezone text not null default 'UTC',
  venue text,
  visibility text not null default 'invited-only' check (visibility in ('public','invited-only')),
  rsvp_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table households (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null,
  locale text,
  allow_plus_one boolean not null default false,
  created_at timestamptz not null default now()
);

create table guest_events (
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  primary key (guest_id, event_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  token_hash text not null unique,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','attending','declined')),
  plus_one boolean not null default false,
  dietary text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (guest_id, event_id)
);
