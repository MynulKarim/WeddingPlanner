-- Phase 16 — claim RPC definer fix (migration 0021).
-- Apply in the Supabase SQL editor AFTER 0001–0020.
--
-- Diagnosis (verified live): claim_registry_item() as SECURITY INVOKER
-- returns 'unavailable' to anonymous guests even though the same row is
-- plainly SELECT-visible to them — SELECT ... FOR UPDATE does not see
-- RLS-filtered rows the way a plain SELECT does, so the lock read finds
-- nothing and the gate misfires. Members were unaffected (member policies
-- cover the lock read), which is why member-path tests passed.
--
-- Fix: run the gate as SECURITY DEFINER (same precedent as the existing
-- sync_claim_count trigger: public.sync_claim_count() is
-- `security definer set search_path = public`). Authorization does not
-- come from RLS here — it comes from the checks inside the function body
-- (wedding match, is_active, stock under lock), which mirror the
-- registry_claims_public_insert policy. search_path is pinned against
-- hijack, and EXECUTE stays least-privilege.
create or replace function public.claim_registry_item(
  p_item_id uuid,
  p_wedding_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_amount_cents integer,
  p_message text
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_total integer;
  v_claimed integer;
  v_active boolean;
  v_wedding uuid;
begin
  select i.quantity_total, i.quantity_claimed, i.is_active, i.wedding_id
    into v_total, v_claimed, v_active, v_wedding
    from public.registry_items i
    where i.id = p_item_id
    for update;
  if v_wedding is null or v_wedding <> p_wedding_id or not v_active then
    return 'unavailable';
  end if;
  if v_total is not null and v_claimed >= v_total then
    return 'sold_out';
  end if;
  insert into public.registry_claims (
    item_id, wedding_id, guest_name, guest_email, amount_cents, message, status
  )
  values (
    p_item_id, p_wedding_id, p_guest_name,
    nullif(p_guest_email, ''), p_amount_cents, p_message, 'reserved'
  );
  return 'ok';
end;
$$;

grant execute on function public.claim_registry_item(uuid, uuid, text, text, integer, text)
  to anon, authenticated, service_role;
