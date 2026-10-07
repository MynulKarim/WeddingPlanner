-- Phase 16 — atomic dispatch claims (migration 0019).
-- Apply in the Supabase SQL editor AFTER 0001–0018.
--
-- Problem: processDueMessages selects due rows, then delivers, then marks
-- sent/failed. Two overlapping runners (cron + manual button, or a retrying
-- scheduler) can select the same rows and double-send.
--
-- Fix: a 'sending' state plus one atomic claim statement. The dispatcher
-- claims rows (scheduled→sending, or stale sending→sending) and only
-- delivers what it claimed. Concurrent claimants never receive the same
-- row thanks to FOR UPDATE SKIP LOCKED. A crashed worker's rows become
-- reclaimable after 10 minutes via claimed_at.

-- 'sending' joins the status lifecycle (transient; never user-set).
alter table messages drop constraint if exists messages_status_check;
alter table messages
  add constraint messages_status_check
  check (status in ('scheduled', 'sending', 'sent', 'failed', 'cancelled'));

alter table messages add column if not exists claimed_at timestamptz;

create index if not exists messages_sending_idx on messages (status, claimed_at)
  where status = 'sending';

-- Atomically claim up to p_limit due rows (optionally one wedding).
-- Returns the claimed rows for delivery; each row goes to exactly one
-- claimant even under concurrency.
create or replace function public.claim_due_messages(
  p_now timestamptz,
  p_limit integer,
  p_wedding_id uuid default null
)
returns table (
  id uuid,
  wedding_id uuid,
  channel text,
  to_address text,
  subject text,
  body_snapshot text
)
language sql
as $$
  update public.messages m
  set status = 'sending', claimed_at = p_now
  where m.id in (
    select m2.id
    from public.messages m2
    where (
        m2.status = 'scheduled'
        or (m2.status = 'sending' and m2.claimed_at < p_now - interval '10 minutes')
      )
      and m2.scheduled_for <= p_now
      and (p_wedding_id is null or m2.wedding_id = p_wedding_id)
    order by m2.scheduled_for
    limit greatest(p_limit, 1)
    for update skip locked
  )
  returning m.id, m.wedding_id, m.channel, m.to_address, m.subject, m.body_snapshot;
$$;

-- Invoker rights (caller RLS still applies): members claim their own
-- weddings, the service-role cron claims globally.
grant execute on function public.claim_due_messages(timestamptz, integer, uuid)
  to anon, authenticated, service_role;
