/**
 * Day-of data access — Phase 11 (tenant-scoped, RLS-enforced).
 * Check-in/out, attendance, announcements. Staff+ may operate (their job);
 * planning mutations elsewhere stay planner-gated.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { fetchGuestHub } from '@/lib/db/guests';
import { getRsvpBoard } from '@/lib/db/rsvp';
import { getSeatingPlan } from '@/lib/db/seating';
import { resolveInvitation } from '@/lib/invite/resolve';

export interface CheckinRow {
  guest_id: string;
  event_id: string;
  checked_in_at: string;
}

export async function getCheckins(weddingId: string): Promise<CheckinRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('guest_id, event_id, checked_in_at')
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  return (data ?? []) as CheckinRow[];
}

export async function checkInGuest(
  weddingId: string,
  guestId: string,
  eventId: string,
): Promise<{ error?: string }> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // One atomic call (migration 0020): tenant guards plus the upsert happen
  // together instead of across three round-trips.
  const { error } = await supabase.rpc('checkin_guest', {
    p_wedding_id: weddingId,
    p_guest_id: guestId,
    p_event_id: eventId,
    p_by: user?.id ?? null,
  });
  if (error) {
    if (/NOT_FOUND/.test(error.message)) {
      return { error: 'Guest or event not found in this wedding.' };
    }
    const { isMissingFunction } = await import('@/lib/db/schema-guard');
    if (!isMissingFunction(error)) return { error: error.message };
    // Pre-migration database: legacy guard-reads plus upsert.
    const [{ data: guest }, { data: event }] = await Promise.all([
      supabase.from('guests').select('id').eq('id', guestId).eq('wedding_id', weddingId).maybeSingle(),
      supabase.from('events').select('id').eq('id', eventId).eq('wedding_id', weddingId).maybeSingle(),
    ]);
    if (!guest || !event) return { error: 'Guest or event not found in this wedding.' };
    const { error: upsertError } = await supabase.from('checkins').upsert(
      {
        wedding_id: weddingId,
        guest_id: guestId,
        event_id: eventId,
        checked_in_by: user?.id ?? null,
      },
      { onConflict: 'guest_id,event_id' },
    );
    if (upsertError) return { error: upsertError.message };
  }
  revalidatePath(`/day-of/${weddingId}`);
  return {};
}

export async function undoCheckIn(weddingId: string, guestId: string, eventId: string): Promise<void> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId)
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/day-of/${weddingId}`);
}

export interface AnnouncementRow {
  id: string;
  event_id: string | null;
  event_name: string | null;
  title: string;
  body: string;
  is_active: boolean;
}

export async function listAnnouncements(weddingId: string): Promise<AnnouncementRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('id, event_id, title, body, is_active, events(name)')
    .eq('wedding_id', weddingId)
    .order('position')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string;
    event_id: string | null;
    title: string;
    body: string;
    is_active: boolean;
    events: { name: string } | { name: string }[] | null;
  }[]).map((a) => ({
    id: a.id,
    event_id: a.event_id,
    event_name: Array.isArray(a.events) ? (a.events[0]?.name ?? null) : (a.events?.name ?? null),
    title: a.title,
    body: a.body,
    is_active: a.is_active,
  }));
}

export interface AnnouncementState {
  error?: string;
}

export async function createAnnouncement(
  weddingId: string,
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  await requireRole(weddingId, 'staff');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'Announcement title is required.' };
  const eventId = String(formData.get('eventId') ?? '').trim() || null;
  const supabase = await createServerSupabaseClient();
  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('wedding_id', weddingId)
      .maybeSingle();
    if (!event) return { error: 'Event not found in this wedding.' };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from('announcements').insert({
    wedding_id: weddingId,
    event_id: eventId,
    title: title.slice(0, 160),
    body: String(formData.get('body') ?? '').trim().slice(0, 2000),
    created_by: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/day-of/${weddingId}/announcements`);
  return {};
}

export async function toggleAnnouncement(
  weddingId: string,
  announcementId: string,
  active: boolean,
): Promise<void> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('announcements')
    .update({ is_active: active })
    .eq('id', announcementId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/day-of/${weddingId}/announcements`);
}

export async function deleteAnnouncement(weddingId: string, announcementId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/day-of/${weddingId}/announcements`);
}

// ---------------------------------------------------------------------------
// Board data + token lookup (staff)
// ---------------------------------------------------------------------------

export interface DayOfGuest {
  id: string;
  name: string;
  is_child: boolean;
  household: string | null;
  table: string | null;
  dietary: string | null;
  allergies: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  rsvp: Record<string, string>;
  checked: Record<string, boolean>;
}

export async function getDayOfData(
  weddingId: string,
): Promise<{ guests: DayOfGuest[] }> {
  const [hub, board, plan, checkins] = await Promise.all([
    fetchGuestHub(weddingId),
    getRsvpBoard(weddingId),
    getSeatingPlan(weddingId),
    getCheckins(weddingId),
  ]);
  const tableById = new Map(plan.tables.map((t) => [t.id, t.name]));
  const tableOf: Record<string, string> = {};
  for (const t of plan.tables) for (const gid of t.guest_ids) tableOf[gid] = t.id;
  const checkedSet = new Set(checkins.map((c) => `${c.guest_id}:${c.event_id}`));
  const boardById = new Map(board.guests.map((g) => [g.guest_id, g]));

  return {
    guests: hub.map((g) => {
      const b = boardById.get(g.id);
      const rsvp: Record<string, string> = {};
      const checked: Record<string, boolean> = {};
      const dietary = new Map<string, string>();
      const allergies = new Map<string, string>();
      let plusOne = false;
      let plusOneName: string | null = null;
      for (const [eventId, r] of Object.entries(b?.responses ?? {})) {
        rsvp[eventId] = r.status;
        checked[eventId] = checkedSet.has(`${g.id}:${eventId}`);
        if (r.dietary) dietary.set(eventId, r.dietary);
        if (r.allergies) allergies.set(eventId, r.allergies);
        if (r.plus_one) {
          plusOne = true;
          plusOneName = r.plus_one_name;
        }
      }
      const firstDietary = [...dietary.values()][0] ?? null;
      const firstAllergies = [...allergies.values()][0] ?? null;
      return {
        id: g.id,
        name: g.display_name,
        is_child: g.is_child,
        household: g.household_label,
        table: tableOf[g.id] ? (tableById.get(tableOf[g.id]) ?? null) : null,
        dietary: firstDietary,
        allergies: firstAllergies,
        plusOne,
        plusOneName,
        rsvp,
        checked,
      };
    }),
  };
}

export interface TokenGuest {
  guestId: string;
  guestName: string;
  eventIds: string[];
  allowPlusOne: boolean;
}

/** Resolve a scanned/pasted invitation token for staff check-in. */
export async function lookupGuestByToken(
  weddingId: string,
  token: string,
): Promise<TokenGuest | null> {
  await requireRole(weddingId, 'staff');
  const inv = await resolveInvitation(token).catch(() => null);
  if (!inv || inv.weddingId !== weddingId) return null;
  return {
    guestId: inv.guestId,
    guestName: inv.guestName,
    eventIds: inv.events.map((e) => e.event_id),
    allowPlusOne: inv.allowPlusOne,
  };
}
