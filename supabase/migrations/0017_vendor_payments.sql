-- Phase 15 — vendor payment line items (migration 0017).
-- Apply in the Supabase SQL editor AFTER 0001–0016.
--
-- Money model: vendors.cost_cents stays the commitment and
-- vendors.paid_cents stays the canonical paid total. Each payment row is
-- one installment (deposit, progress, final balance); a trigger rolls it
-- into vendors.paid_cents atomically so concurrent entries cannot drift
-- the total. Deleting a payment row reverses its rollup (floored at zero).
-- Member-only: payment history never leaves the couple dashboard.

create table if not exists vendor_payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_on date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists vendor_payments_vendor_id_idx on vendor_payments (vendor_id);
create index if not exists vendor_payments_wedding_id_idx on vendor_payments (wedding_id);

alter table vendor_payments enable row level security;

drop policy if exists "vendor_payments_member_all" on vendor_payments;
create policy "vendor_payments_member_all" on vendor_payments
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- Atomic rollup into vendors.paid_cents (insert adds, delete reverses).
create or replace function public.sync_vendor_paid()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update public.vendors
      set paid_cents = paid_cents + NEW.amount_cents
      where id = NEW.vendor_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.vendors
      set paid_cents = greatest(0, paid_cents - OLD.amount_cents)
      where id = OLD.vendor_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists vendor_payments_rollup on vendor_payments;
create trigger vendor_payments_rollup
  after insert or delete on vendor_payments
  for each row execute function public.sync_vendor_paid();
