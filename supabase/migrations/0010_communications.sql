-- Phase 7 — communications (migration 0010).
-- Apply in the Supabase SQL editor AFTER 0001–0009.
--
-- Confirmation model (product rule): NO message is ever created implicitly.
-- Rows are inserted only by explicit couple actions (send-now with confirm,
-- or schedule with confirm). Automated dispatch (processDueMessages) only
-- flips scheduled→sent/failed for rows a human already confirmed.
-- No anon/public policies: history and templates are member-only.

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  kind text not null check (kind in ('save_the_date','invitation','rsvp_reminder','event_reminder','announcement','thank_you')),
  channel text not null check (channel in ('email','sms')),
  subject text,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (wedding_id, kind, channel)
);

drop trigger if exists touch_message_templates_updated_at on message_templates;
create trigger touch_message_templates_updated_at
  before update on message_templates
  for each row execute function public.touch_updated_at();

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  template_kind text not null,
  channel text not null check (channel in ('email','sms')),
  to_address text not null,
  subject text,
  body_snapshot text not null default '',
  status text not null default 'scheduled'
    check (status in ('scheduled','sent','failed','cancelled')),
  provider_message_id text,
  error text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists messages_wedding_id_idx on messages (wedding_id);
create index if not exists messages_guest_id_idx on messages (guest_id);
create index if not exists messages_due_idx on messages (status, scheduled_for)
  where status = 'scheduled';

alter table message_templates enable row level security;
alter table messages enable row level security;

drop policy if exists "message_templates_member_all" on message_templates;
create policy "message_templates_member_all" on message_templates
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "messages_member_all" on messages;
create policy "messages_member_all" on messages
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));
