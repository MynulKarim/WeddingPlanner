/**
 * Event data access — Phase 2 (tenant-scoped, RLS-enforced).
 * Mutations require planner+; staff have read access.
 */
'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { validateEventInput } from '@/validations/event';

export interface EventRow {
  id: string;
  wedding_id: string;
  name: string;
  starts_at: string | null;
  timezone: string;
  venue: string | null;
  address: string | null;
  description: string | null;
  dress_code: string | null;
  visibility: 'public' | 'invited-only';
  rsvp_required: boolean;
}

export async function listEvents(weddingId: string): Promise<EventRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, wedding_id, name, starts_at, timezone, venue, address, description, dress_code, visibility, rsvp_required',
    )
    .eq('wedding_id', weddingId)
    .order('starts_at', { ascending: true, nullsFirst: false })
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as EventRow[];
}

export async function getEvent(weddingId: string, eventId: string): Promise<EventRow | null> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, wedding_id, name, starts_at, timezone, venue, address, description, dress_code, visibility, rsvp_required',
    )
    .eq('id', eventId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as EventRow | null;
}

export interface EventFormState {
  error?: string;
}

function readEventForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    startsAt: String(formData.get('startsAt') ?? '').trim(),
    timezone: String(formData.get('timezone') ?? '').trim() || 'UTC',
    venue: String(formData.get('venue') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    dress_code: String(formData.get('dressCode') ?? '').trim(),
    visibility: String(formData.get('visibility') ?? 'invited-only'),
    rsvp_required: formData.get('rsvpRequired') !== null,
  };
}

function toPayload(v: ReturnType<typeof readEventForm>) {
  return {
    name: v.name,
    starts_at: v.startsAt ? new Date(v.startsAt).toISOString() : null,
    timezone: v.timezone,
    venue: v.venue || null,
    address: v.address || null,
    description: v.description || null,
    dress_code: v.dress_code || null,
    visibility: v.visibility,
    rsvp_required: v.rsvp_required,
  };
}

export async function createEvent(
  weddingId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireRole(weddingId, 'planner');
  const values = readEventForm(formData);
  const errors = validateEventInput(values);
  if (errors.length > 0) return { error: errors[0] };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('events')
    .insert({ wedding_id: weddingId, ...toPayload(values) });
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/events`);
}

export async function updateEvent(
  weddingId: string,
  eventId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireRole(weddingId, 'planner');
  const values = readEventForm(formData);
  const errors = validateEventInput(values);
  if (errors.length > 0) return { error: errors[0] };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('events')
    .update(toPayload(values))
    .eq('id', eventId)
    .eq('wedding_id', weddingId);
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/events`);
}

export async function deleteEvent(weddingId: string, eventId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  redirect(`/dashboard/weddings/${weddingId}/events`);
}
