-- Phase 16 — atomic write RPCs (migration 0020).
-- Apply in the Supabase SQL editor AFTER 0001–0019.
--
-- Three read-then-write races closed in single statements/transactions:
--
-- 1. submit_rsvp_batch: a multi-event RSVP formerly upserted event-by-event
--    (partial state on mid-loop failure) and checked the deadline from a
--    snapshot taken before validation. Now one transaction writes every
--    event row, and the deadline is re-read inside the transaction —
--    a concurrent setDeadline cannot slip between check and write.
--
-- 2. claim_registry_item: availability was checked in app code, then the
--    claim inserted in a later round-trip — N concurrent guests all saw
--    "1 left" and all reserved (oversell). Now the item row is locked
--    (FOR UPDATE), availability decided under the lock, and the claim
--    inserted in the same transaction. The sync_claim_count trigger still
--    maintains the public totals on insert.
--
-- 3. checkin_guest: tenant guard-reads plus the upsert were three
--    round-trips; now one call verifies guest+event tenancy and records
--    the check-in. Simultaneous opposing ops (check-in vs undo) remain
--    last-writer-wins — staff coordinate the door, and the offline outbox
--    already dedupes per device.

-- 1. Atomic multi-event RSVP. Raises RSVP_DEADLINE when the wedding's
--    deadline (read fresh here) has passed. Validation stays in app code.
create or replace function public.submit_rsvp_batch(
  p_wedding_id uuid,
  p_guest_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
as $$
declare
  r jsonb;
  v_deadline timestamptz;
  v_count integer := 0;
begin
  select w.rsvp_deadline into v_deadline
  from public.weddings w
  where w.id = p_wedding_id;
  if v_deadline is not null and v_deadline < now() then
    raise exception 'RSVP_DEADLINE' using errcode = 'P0001';
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into public.rsvps (
      wedding_id, guest_id, event_id, status,
      plus_one, plus_one_name, dietary, allergies, notes, answers
    )
    values (
      p_wedding_id,
      p_guest_id,
      (r ->> 'event_id')::uuid,
      r ->> 'status',
      coalesce((r ->> 'plus_one')::boolean, false),
      nullif(r ->> 'plus_one_name', ''),
      nullif(r ->> 'dietary', ''),
      nullif(r ->> 'allergies', ''),
      nullif(r ->> 'notes', ''),
      coalesce(r -> 'answers', '{}'::jsonb)
    )
    on conflict (guest_id, event_id) do update set
      status = excluded.status,
      plus_one = excluded.plus_one,
      plus_one_name = excluded.plus_one_name,
      dietary = excluded.dietary,
      allergies = excluded.allergies,
      notes = excluded.notes,
      answers = excluded.answers;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 2. Hard inventory gate: lock the item, decide under the lock, insert.
-- Returns 'ok' | 'sold_out' | 'unavailable'.
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

-- 3. Tenant-guarded check-in in one call.
create or replace function public.checkin_guest(
  p_wedding_id uuid,
  p_guest_id uuid,
  p_event_id uuid,
  p_by uuid
)
returns timestamptz
language plpgsql
as $$
declare
  v_ts timestamptz;
begin
  if not exists (
    select 1 from public.guests g
    where g.id = p_guest_id and g.wedding_id = p_wedding_id
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.wedding_id = p_wedding_id
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.checkins (wedding_id, guest_id, event_id, checked_in_by)
  values (p_wedding_id, p_guest_id, p_event_id, p_by)
  on conflict (guest_id, event_id) do update set
    checked_in_by = excluded.checked_in_by,
    checked_in_at = now()
  returning checkins.checked_in_at into v_ts;
  return v_ts;
end;
$$;

-- Invoker rights (caller RLS still applies): guests claim via the public
-- insert policy, members operate their weddings, cron/service role bypasses.
grant execute on function public.submit_rsvp_batch(uuid, uuid, jsonb)
  to anon, authenticated, service_role;
grant execute on function public.claim_registry_item(uuid, uuid, text, text, integer, text)
  to anon, authenticated, service_role;
grant execute on function public.checkin_guest(uuid, uuid, uuid, uuid)
  to anon, authenticated, service_role;
