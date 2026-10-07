-- Phase 8 — gift registry (migration 0011).
-- Apply in the Supabase SQL editor AFTER 0001–0010.
--
-- Money model (honest scope): claims are soft reservations (name + amount +
-- message). NO money moves in Phase 8 — real charging arrives with the payment
-- provider integration (Phase 13); the provider interface already exists
-- (services/registry/payment-provider.ts) and checkout stays behind it.
-- Public reads: active items of published weddings only. Public writes:
-- anyone may insert a claim on an ACTIVE item (validated in RLS); claims
-- themselves are member-readable only.

create table if not exists registry_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  kind text not null check (kind in ('product','cash','experience','custom')),
  title text not null,
  description text not null default '',
  amount_cents integer,
  currency text not null default 'USD',
  external_url text,
  image_url text,
  quantity_total integer,
  quantity_claimed integer not null default 0,
  raised_cents integer not null default 0,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (amount_cents is null or amount_cents > 0),
  check (quantity_total is null or quantity_total > 0),
  check (quantity_claimed >= 0)
);

create table if not exists registry_claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references registry_items(id) on delete cascade,
  wedding_id uuid not null references weddings(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  amount_cents integer,
  message text not null default '',
  status text not null default 'reserved' check (status in ('reserved','cancelled')),
  created_at timestamptz not null default now(),
  check (amount_cents is null or amount_cents > 0)
);

create index if not exists registry_items_wedding_id_idx on registry_items (wedding_id);
create index if not exists registry_claims_item_id_idx on registry_claims (item_id);
create index if not exists registry_claims_wedding_id_idx on registry_claims (wedding_id);

alter table registry_items enable row level security;
alter table registry_claims enable row level security;

drop policy if exists "registry_items_member_all" on registry_items;
create policy "registry_items_member_all" on registry_items
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "registry_claims_member_all" on registry_claims;
create policy "registry_claims_member_all" on registry_claims
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- Public: active items of published weddings (powers the registry section).
drop policy if exists "registry_items_public_read" on registry_items;
create policy "registry_items_public_read" on registry_items
  for select using (
    is_active = true
    and exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = registry_items.wedding_id and w.is_published = true
    )
  );

-- Public: anyone may reserve an active item. The check pins the claim to the
-- item's own wedding and requires the item to be active.
drop policy if exists "registry_claims_public_insert" on registry_claims;
create policy "registry_claims_public_insert" on registry_claims
  for insert with check (
    wedding_id = (select wedding_id from public.registry_items where id = item_id)
    and exists (
      select 1 from public.registry_items i
      where i.id = item_id and i.is_active = true
    )
  );

-- Keep quantity_claimed + raised_cents in sync (reserved increments,
-- cancelled decrements). Runs as definer/bypass so anonymous claims still
-- count, and the public site reads totals without ever seeing claim rows.
-- Race-level oversell is possible under concurrency; hard inventory gating
-- arrives with the payment integration (Phase 13).
create or replace function public.sync_claim_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'reserved' then
    update public.registry_items
    set quantity_claimed = quantity_claimed + 1,
        raised_cents = raised_cents + coalesce(new.amount_cents, 0)
    where id = new.item_id;
  elsif tg_op = 'UPDATE'
    and old.status = 'reserved' and new.status = 'cancelled' then
    update public.registry_items
    set quantity_claimed = greatest(0, quantity_claimed - 1),
        raised_cents = greatest(0, raised_cents - coalesce(old.amount_cents, 0))
    where id = new.item_id;
  elsif tg_op = 'UPDATE'
    and old.status = 'cancelled' and new.status = 'reserved' then
    update public.registry_items
    set quantity_claimed = quantity_claimed + 1,
        raised_cents = raised_cents + coalesce(new.amount_cents, 0)
    where id = new.item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_claim_count_on_insert on registry_claims;
create trigger sync_claim_count_on_insert
  after insert on registry_claims
  for each row execute function public.sync_claim_count();

drop trigger if exists sync_claim_count_on_update on registry_claims;
create trigger sync_claim_count_on_update
  after update of status on registry_claims
  for each row execute function public.sync_claim_count();
