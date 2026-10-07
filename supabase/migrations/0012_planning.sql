-- Phase 9 — seating + planning (migration 0012).
-- Apply in the Supabase SQL editor AFTER 0001–0011.
--
-- Seating: one seat per guest enforced by UNIQUE(guest_id); over-capacity is
-- a warning (couple override), duplicates are impossible by constraint.
-- Planning: checklist tasks, budget items, vendor tracker. All member-only;
-- place-card/export reads go through member-scoped app code (Phase 9) and
-- day-of staff flows (Phase 11).

create table if not exists seating_tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  capacity integer,
  shape text not null default 'round' check (shape in ('round','rectangle','head','custom')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (capacity is null or capacity > 0)
);

create table if not exists seating_assignments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  table_id uuid not null references seating_tables(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  seat_label text,
  created_at timestamptz not null default now(),
  unique (table_id, guest_id),
  unique (guest_id)
);

create table if not exists checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  title text not null,
  category text not null default 'General',
  due_date date,
  assignee text,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  category text not null default 'General',
  title text not null,
  vendor_name text,
  budgeted_cents integer not null default 0 check (budgeted_cents >= 0),
  actual_cents integer not null default 0 check (actual_cents >= 0),
  paid_cents integer not null default 0 check (paid_cents >= 0),
  due_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  contact_name text,
  email text,
  phone text,
  website text,
  cost_cents integer not null default 0 check (cost_cents >= 0),
  paid_cents integer not null default 0 check (paid_cents >= 0),
  due_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists seating_tables_wedding_id_idx on seating_tables (wedding_id);
create index if not exists seating_assignments_table_id_idx on seating_assignments (table_id);
create index if not exists seating_assignments_guest_id_idx on seating_assignments (guest_id);
create index if not exists checklist_tasks_wedding_id_idx on checklist_tasks (wedding_id);
create index if not exists budget_items_wedding_id_idx on budget_items (wedding_id);
create index if not exists vendors_wedding_id_idx on vendors (wedding_id);

alter table seating_tables enable row level security;
alter table seating_assignments enable row level security;
alter table checklist_tasks enable row level security;
alter table budget_items enable row level security;
alter table vendors enable row level security;

drop policy if exists "seating_tables_member_all" on seating_tables;
create policy "seating_tables_member_all" on seating_tables
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "seating_assignments_member_all" on seating_assignments;
create policy "seating_assignments_member_all" on seating_assignments
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "checklist_tasks_member_all" on checklist_tasks;
create policy "checklist_tasks_member_all" on checklist_tasks
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "budget_items_member_all" on budget_items;
create policy "budget_items_member_all" on budget_items
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "vendors_member_all" on vendors;
create policy "vendors_member_all" on vendors
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));
