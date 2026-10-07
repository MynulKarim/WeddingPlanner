/**
 * Seating data access — Phase 9 (tenant-scoped, RLS-enforced).
 * One seat per guest enforced by UNIQUE(guest_id); over-capacity is a
 * warning, not an error (couple override). Mutations require planner+.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';

export interface SeatingTableRow {
  id: string;
  wedding_id: string;
  name: string;
  capacity: number | null;
  shape: string;
  position: number;
}

export interface SeatingAssignmentRow {
  id: string;
  table_id: string;
  guest_id: string;
  seat_label: string | null;
}

export interface SeatingPlan {
  tables: (SeatingTableRow & { guest_ids: string[] })[];
  assignments: Record<string, string>;
}

function seatingPath(weddingId: string): string {
  return `/dashboard/weddings/${weddingId}/seating`;
}

export async function getSeatingPlan(weddingId: string): Promise<SeatingPlan> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data: tables, error: tError } = await supabase
    .from('seating_tables')
    .select('id, wedding_id, name, capacity, shape, position')
    .eq('wedding_id', weddingId)
    .order('position')
    .order('name');
  if (tError) throw new Error(tError.message);
  const { data: assignments, error: aError } = await supabase
    .from('seating_assignments')
    .select('id, table_id, guest_id, seat_label')
    .eq('wedding_id', weddingId);
  if (aError) throw new Error(aError.message);

  const byTable = new Map<string, string[]>();
  const byGuest: Record<string, string> = {};
  for (const a of (assignments ?? []) as SeatingAssignmentRow[]) {
    if (!byTable.has(a.table_id)) byTable.set(a.table_id, []);
    byTable.get(a.table_id)?.push(a.guest_id);
    byGuest[a.guest_id] = a.table_id;
  }
  return {
    tables: ((tables ?? []) as SeatingTableRow[]).map((t) => ({
      ...t,
      guest_ids: byTable.get(t.id) ?? [],
    })),
    assignments: byGuest,
  };
}

export interface TableFormState {
  error?: string;
}

export async function createTable(
  weddingId: string,
  _prev: TableFormState,
  formData: FormData,
): Promise<TableFormState> {
  await requireRole(weddingId, 'planner');
  const name = String(formData.get('name') ?? '').trim();
  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const shape = String(formData.get('shape') ?? 'round');
  if (!name) return { error: 'Table name is required.' };
  if (!['round', 'rectangle', 'head', 'custom'].includes(shape)) {
    return { error: 'Invalid table shape.' };
  }
  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500)) {
    return { error: 'Capacity must be a positive whole number.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: maxPos } = await supabase
    .from('seating_tables')
    .select('position')
    .eq('wedding_id', weddingId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from('seating_tables').insert({
    wedding_id: weddingId,
    name: name.slice(0, 80),
    capacity,
    shape,
    position: ((maxPos as { position?: number } | null)?.position ?? -1) + 1,
  });
  if (error) return { error: error.message };
  revalidatePath(seatingPath(weddingId));
  return {};
}

export async function deleteTable(weddingId: string, tableId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('seating_tables')
    .delete()
    .eq('id', tableId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(seatingPath(weddingId));
}

/** Seat a guest (replaces any existing seat — duplicates impossible). */
export async function assignSeat(
  weddingId: string,
  guestId: string,
  tableId: string,
): Promise<{ error?: string }> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const [{ data: guest }, { data: table }] = await Promise.all([
    supabase.from('guests').select('id').eq('id', guestId).eq('wedding_id', weddingId).maybeSingle(),
    supabase.from('seating_tables').select('id').eq('id', tableId).eq('wedding_id', weddingId).maybeSingle(),
  ]);
  if (!guest || !table) return { error: 'Guest or table not found in this wedding.' };
  await supabase.from('seating_assignments').delete().eq('guest_id', guestId);
  const { error } = await supabase.from('seating_assignments').insert({
    wedding_id: weddingId,
    table_id: tableId,
    guest_id: guestId,
  });
  if (error) return { error: error.message };
  revalidatePath(seatingPath(weddingId));
  return {};
}

export async function unassignSeat(weddingId: string, guestId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { data: guest } = await supabase
    .from('guests')
    .select('id')
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (!guest) throw new Error('Guest not found in this wedding.');
  const { error } = await supabase.from('seating_assignments').delete().eq('guest_id', guestId);
  if (error) throw new Error(error.message);
  revalidatePath(seatingPath(weddingId));
}
