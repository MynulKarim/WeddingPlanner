-- Phase 1 — owner trigger tolerates null uid (migration 0004).
-- Apply in the Supabase SQL editor AFTER 0001–0003.
--
-- Service-role / admin inserts run without a JWT, so auth.uid() is null and
-- the trigger's membership insert used to abort with a not-null violation
-- (observed live 2026-10-05). With no signed-in user there is no owner to
-- add, so the trigger now skips and the caller manages membership explicitly.
-- RLS WITH CHECKs are bypassed by service_role, so this changes nothing for
-- normal app inserts (the app always sets created_by = auth.uid ()).

create or replace function public.add_wedding_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  insert into public.wedding_members (wedding_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict (wedding_id, user_id) do nothing;
  return new;
end;
$$;
