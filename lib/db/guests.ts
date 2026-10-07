/**
 * Guest + household data access — Phase 2 (tenant-scoped, RLS-enforced).
 * Mutations require planner+; staff have read access.
 * RSVP state is NOT managed here (Phase 5).
 */
'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { validateGuestInput } from '@/validations/guest';
import { parseTagsCell, type HubGuest } from '@/lib/guests/hub';
import { isSupportedLocale } from '@/lib/i18n/languages';
import type { GuestCsvRow } from '@/lib/guests/csv';

export interface HouseholdRow {
  id: string;
  wedding_id: string;
  label: string;
  member_count?: number;
}

export interface GuestDetail extends HubGuest {
  plus_one_name: string | null;
  wedding_id: string;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

interface GuestRowRaw {
  id: string;
  wedding_id: string;
  household_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  is_child: boolean;
  allow_plus_one: boolean;
  plus_one_name: string | null;
  locale: string | null;
  households: { label: string } | { label: string }[] | null;
  guest_events: { event_id: string; events: { name: string } | { name: string }[] | null }[];
}

function firstEmbed<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export async function fetchGuestHub(weddingId: string): Promise<HubGuest[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select(
      'id, wedding_id, household_id, display_name, email, phone, notes, tags, is_child, allow_plus_one, locale, households(label), guest_events(event_id, events(name))',
    )
    .eq('wedding_id', weddingId)
    .order('display_name');
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as GuestRowRaw[]).map((g) => ({
    id: g.id,
    display_name: g.display_name,
    email: g.email,
    phone: g.phone,
    notes: g.notes,
    tags: g.tags ?? [],
    is_child: g.is_child,
    allow_plus_one: g.allow_plus_one,
    locale: g.locale,
    household_id: g.household_id,
    household_label: firstEmbed(g.households)?.label ?? null,
    events: (g.guest_events ?? []).map((ge) => ({
      event_id: ge.event_id,
      event_name: firstEmbed(ge.events)?.name ?? 'Event',
    })),
  }));
}

export async function getGuestDetail(
  weddingId: string,
  guestId: string,
): Promise<GuestDetail | null> {
  const hub = await fetchGuestHub(weddingId);
  const found = hub.find((g) => g.id === guestId);
  if (!found) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select('plus_one_name, wedding_id')
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...found, plus_one_name: data.plus_one_name, wedding_id: data.wedding_id };
}

export async function listHouseholds(weddingId: string): Promise<HouseholdRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('households')
    .select('id, wedding_id, label, guests(id)')
    .eq('wedding_id', weddingId)
    .order('label');
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; wedding_id: string; label: string; guests: { id: string }[] }[]).map(
    (h) => ({ id: h.id, wedding_id: h.wedding_id, label: h.label, member_count: h.guests.length }),
  );
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export interface HouseholdFormState {
  error?: string;
}

export async function createHousehold(
  weddingId: string,
  _prev: HouseholdFormState,
  formData: FormData,
): Promise<HouseholdFormState> {
  await requireRole(weddingId, 'planner');
  const label = String(formData.get('label') ?? '').trim();
  if (!label) return { error: 'Household name is required.' };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('households').insert({ wedding_id: weddingId, label });
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/households`);
}

export async function renameHousehold(
  weddingId: string,
  householdId: string,
  _prev: HouseholdFormState,
  formData: FormData,
): Promise<HouseholdFormState> {
  await requireRole(weddingId, 'planner');
  const label = String(formData.get('label') ?? '').trim();
  if (!label) return { error: 'Household name is required.' };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('households')
    .update({ label })
    .eq('id', householdId)
    .eq('wedding_id', weddingId);
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/households`);
}

export async function deleteHousehold(weddingId: string, householdId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  // Members are unlinked (FK is ON DELETE SET NULL), never deleted.
  const { error } = await supabase
    .from('households')
    .delete()
    .eq('id', householdId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  redirect(`/dashboard/weddings/${weddingId}/households`);
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

export interface GuestFormState {
  error?: string;
}

function readGuestForm(formData: FormData) {
  return {
    displayName: String(formData.get('displayName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
    tags: parseTagsCell(String(formData.get('tags') ?? '')),
    isChild: formData.get('isChild') !== null,
    allowPlusOne: formData.get('allowPlusOne') !== null,
    plusOneName: String(formData.get('plusOneName') ?? '').trim(),
    locale: String(formData.get('locale') ?? '').trim(),
    householdId: String(formData.get('householdId') ?? '').trim(),
    newHousehold: String(formData.get('newHousehold') ?? '').trim(),
    eventIds: formData.getAll('eventIds').map(String),
  };
}

async function resolveHousehold(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  weddingId: string,
  householdId: string,
  newHousehold: string,
): Promise<string | null> {
  if (newHousehold) {
    const { data, error } = await supabase
      .from('households')
      .insert({ wedding_id: weddingId, label: newHousehold })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }
  if (householdId) {
    // Verify the household belongs to this wedding (tenant guard).
    const { data, error } = await supabase
      .from('households')
      .select('id')
      .eq('id', householdId)
      .eq('wedding_id', weddingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  }
  return null;
}

function toGuestPayload(v: ReturnType<typeof readGuestForm>, householdId: string | null) {
  return {
    display_name: v.displayName,
    email: v.email || null,
    phone: v.phone || null,
    notes: v.notes || null,
    tags: v.tags,
    is_child: v.isChild,
    allow_plus_one: v.allowPlusOne,
    plus_one_name: v.plusOneName || null,
    locale: v.locale && isSupportedLocale(v.locale) ? v.locale : null,
    household_id: householdId,
  };
}

export async function createGuest(
  weddingId: string,
  _prev: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  await requireRole(weddingId, 'planner');
  const values = readGuestForm(formData);
  const errors = validateGuestInput(values);
  if (errors.length > 0) return { error: errors[0] };

  try {
    const supabase = await createServerSupabaseClient();
    const householdId = await resolveHousehold(
      supabase,
      weddingId,
      values.householdId,
      values.newHousehold,
    );
    const { data: guest, error } = await supabase
      .from('guests')
      .insert({ wedding_id: weddingId, ...toGuestPayload(values, householdId) })
      .select('id')
      .single();
    if (error) return { error: error.message };
    if (values.eventIds.length > 0) {
      const err = await assignGuestEvents(supabase, weddingId, guest.id, values.eventIds);
      if (err) return { error: err };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not create guest.' };
  }
  redirect(`/dashboard/weddings/${weddingId}/guests`);
}

export async function updateGuest(
  weddingId: string,
  guestId: string,
  _prev: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  await requireRole(weddingId, 'planner');
  const values = readGuestForm(formData);
  const errors = validateGuestInput(values);
  if (errors.length > 0) return { error: errors[0] };

  try {
    const supabase = await createServerSupabaseClient();
    const householdId = await resolveHousehold(
      supabase,
      weddingId,
      values.householdId,
      values.newHousehold,
    );
    const { error } = await supabase
      .from('guests')
      .update(toGuestPayload(values, householdId))
      .eq('id', guestId)
      .eq('wedding_id', weddingId);
    if (error) return { error: error.message };
    const err = await assignGuestEvents(supabase, weddingId, guestId, values.eventIds);
    if (err) return { error: err };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not update guest.' };
  }
  redirect(`/dashboard/weddings/${weddingId}/guests`);
}

export async function deleteGuest(weddingId: string, guestId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  redirect(`/dashboard/weddings/${weddingId}/guests`);
}

/** Replace a guest's event assignments (validates events belong to wedding). */
async function assignGuestEvents(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  weddingId: string,
  guestId: string,
  eventIds: string[],
): Promise<string | null> {
  // Tenant guard: only events of this wedding may be assigned.
  const { data: events, error: evError } = await supabase
    .from('events')
    .select('id')
    .eq('wedding_id', weddingId);
  if (evError) return evError.message;
  const allowed = new Set((events ?? []).map((e) => e.id));
  const valid = [...new Set(eventIds)].filter((id) => allowed.has(id));

  const { error: delError } = await supabase.from('guest_events').delete().eq('guest_id', guestId);
  if (delError) return delError.message;
  if (valid.length === 0) return null;
  const { error: insError } = await supabase
    .from('guest_events')
    .insert(valid.map((event_id) => ({ guest_id: guestId, event_id })));
  if (insError) return insError.message;
  return null;
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface ImportState {
  error?: string;
  imported?: number;
}

export async function importGuests(
  weddingId: string,
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireRole(weddingId, 'planner');
  let rows: GuestCsvRow[];
  try {
    rows = JSON.parse(String(formData.get('rows') ?? '[]')) as GuestCsvRow[];
  } catch {
    return { error: 'Could not read the parsed rows. Re-upload the file.' };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: 'No valid rows to import.' };
  if (rows.length > 2000) return { error: 'Limit imports to 2,000 rows at a time.' };

  const supabase = await createServerSupabaseClient();
  // Entitlement gate (Phase 13): plan caps guests per wedding.
  const [{ data: iprofile }, { count: guestCount }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle(),
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId),
  ]);
  const { guestHeadroom, planLabel } = await import('@/lib/entitlements/plans');
  const iplan = (iprofile as { plan?: string } | null)?.plan ?? 'free';
  const headroom = guestHeadroom(iplan, guestCount ?? 0);
  if (rows.length > headroom) {
    return { error: `Your ${planLabel(iplan)} plan allows ${headroom} more guests here. Split the file or upgrade.` };
  }
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('wedding_id', weddingId);
  const eventByName = new Map(
    ((events ?? []) as { id: string; name: string }[]).map((e) => [e.name.toLowerCase(), e.id]),
  );
  const { data: households } = await supabase
    .from('households')
    .select('id, label')
    .eq('wedding_id', weddingId);
  const householdByLabel = new Map(
    ((households ?? []) as { id: string; label: string }[]).map((h) => [
      h.label.toLowerCase(),
      h.id,
    ]),
  );

  let imported = 0;
  for (const row of rows) {
    const displayName = (row.display_name ?? '').trim();
    if (!displayName) continue;

    let householdId: string | null = null;
    const label = (row.household ?? '').trim();
    if (label) {
      const known = householdByLabel.get(label.toLowerCase());
      if (known) {
        householdId = known;
      } else {
        const { data, error } = await supabase
          .from('households')
          .insert({ wedding_id: weddingId, label })
          .select('id')
          .single();
        if (error) return { error: `Household "${label}": ${error.message}` };
        householdId = data.id;
        householdByLabel.set(label.toLowerCase(), data.id);
      }
    }

    const { data: guest, error: gError } = await supabase
      .from('guests')
      .insert({
        wedding_id: weddingId,
        display_name: displayName,
        email: (row.email ?? '').trim() || null,
        phone: (row.phone ?? '').trim() || null,
        notes: (row.notes ?? '').trim() || null,
        tags: Array.isArray(row.tags) ? row.tags : [],
        is_child: Boolean(row.is_child),
        allow_plus_one: Boolean(row.allow_plus_one),
        locale:
          row.locale && isSupportedLocale(row.locale.trim()) ? row.locale.trim() : null,
        household_id: householdId,
      })
      .select('id')
      .single();
    if (gError) return { error: `Guest "${displayName}": ${gError.message}` };

    const eventIds = (Array.isArray(row.events) ? row.events : [])
      .map((n) => eventByName.get(n.trim().toLowerCase()))
      .filter((id): id is string => Boolean(id));
    if (eventIds.length > 0) {
      const err = await assignGuestEvents(supabase, weddingId, guest.id, eventIds);
      if (err) return { error: `Guest "${displayName}": ${err}` };
    }
    imported += 1;
  }
  redirect(`/dashboard/weddings/${weddingId}/guests?imported=${imported}`);
}
