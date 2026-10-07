/**
 * Registry data access — Phase 8 (tenant-scoped, RLS-enforced).
 * Couple CRUD is planner+; public reads show active items of published
 * weddings; public claims insert through the anon-friendly RLS policy.
 * Claims are reservations only — charging arrives with payments (Phase 13).
 */
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import {
  REGISTRY_KINDS,
  unitsLeft,
  validateClaim,
  validateRegistryItem,
  type RegistryKind,
} from '@/lib/registry/registry';

export interface RegistryItemRow {
  id: string;
  wedding_id: string;
  kind: RegistryKind;
  title: string;
  description: string;
  amount_cents: number | null;
  currency: string;
  external_url: string | null;
  image_url: string | null;
  quantity_total: number | null;
  quantity_claimed: number;
  raised_cents: number;
  is_active: boolean;
  position: number;
  claims_count?: number;
}

export interface RegistryClaimRow {
  id: string;
  item_id: string;
  item_title?: string;
  guest_name: string;
  guest_email: string | null;
  amount_cents: number | null;
  message: string;
  status: string;
  created_at: string;
}

function toCents(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function getRegistry(weddingId: string): Promise<{
  items: RegistryItemRow[];
  claims: RegistryClaimRow[];
}> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data: items, error: iError } = await supabase
    .from('registry_items')
    .select(
      'id, wedding_id, kind, title, description, amount_cents, currency, external_url, image_url, quantity_total, quantity_claimed, raised_cents, is_active, position',
    )
    .eq('wedding_id', weddingId)
    .order('position')
    .order('created_at');
  if (iError) throw new Error(iError.message);
  const { data: claims } = await supabase
    .from('registry_claims')
    .select('id, item_id, guest_name, guest_email, amount_cents, message, status, created_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })
    .limit(500);
  const rows = ((items ?? []) as RegistryItemRow[]).map((item) => ({ ...item }));
  const claimList = ((claims ?? []) as (RegistryClaimRow & { item_id: string })[]).map((c) => ({
    ...c,
    item_title: rows.find((i) => i.id === c.item_id)?.title,
  }));
  const withProgress = rows.map((item) => {
    const mine = claimList.filter((c) => c.item_id === item.id && c.status === 'reserved');
    const raised = mine.reduce((a, c) => a + (c.amount_cents ?? 0), 0);
    return { ...item, claims_count: mine.length, raised_cents: raised };
  });
  return { items: withProgress, claims: claimList };
}

/** Public registry for the website (anon-safe: RLS filters to active+published). */
export async function getPublicRegistry(weddingId: string): Promise<RegistryItemRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('registry_items')
    .select(
      'id, wedding_id, kind, title, description, amount_cents, currency, external_url, image_url, quantity_total, quantity_claimed, raised_cents, is_active, position',
    )
    .eq('wedding_id', weddingId)
    .eq('is_active', true)
    .order('position')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as RegistryItemRow[];
}

export interface ItemFormState {
  error?: string;
}

function readItemForm(formData: FormData) {
  return {
    kind: String(formData.get('kind') ?? 'product'),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    amountCents: String(formData.get('amountCents') ?? ''),
    currency: String(formData.get('currency') ?? 'USD').trim().toUpperCase() || 'USD',
    externalUrl: String(formData.get('externalUrl') ?? ''),
    imageUrl: String(formData.get('imageUrl') ?? ''),
    quantityTotal: String(formData.get('quantityTotal') ?? ''),
  };
}

export async function createRegistryItem(
  weddingId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requireRole(weddingId, 'planner');
  const values = readItemForm(formData);
  const errors = validateRegistryItem(values);
  if (errors.length > 0) return { error: errors[0] };
  if (!(REGISTRY_KINDS as readonly string[]).includes(values.kind)) {
    return { error: 'Choose a valid gift type.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: maxPos } = await supabase
    .from('registry_items')
    .select('position')
    .eq('wedding_id', weddingId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from('registry_items').insert({
    wedding_id: weddingId,
    kind: values.kind as RegistryKind,
    title: values.title.trim().slice(0, 160),
    description: values.description.trim().slice(0, 2000),
    amount_cents: toCents(values.amountCents),
    currency: values.currency,
    external_url: values.externalUrl.trim() || null,
    image_url: values.imageUrl.trim() || null,
    quantity_total: values.quantityTotal.trim() ? Number(values.quantityTotal) : null,
    position: ((maxPos as { position?: number } | null)?.position ?? -1) + 1,
  });
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/registry`);
}

export async function updateRegistryItem(
  weddingId: string,
  itemId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requireRole(weddingId, 'planner');
  const values = readItemForm(formData);
  const errors = validateRegistryItem(values);
  if (errors.length > 0) return { error: errors[0] };
  const isActive = formData.get('isActive') !== null;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('registry_items')
    .update({
      kind: values.kind,
      title: values.title.trim().slice(0, 160),
      description: values.description.trim().slice(0, 2000),
      amount_cents: toCents(values.amountCents),
      currency: values.currency,
      external_url: values.externalUrl.trim() || null,
      image_url: values.imageUrl.trim() || null,
      quantity_total: values.quantityTotal.trim() ? Number(values.quantityTotal) : null,
      is_active: isActive,
    })
    .eq('id', itemId)
    .eq('wedding_id', weddingId);
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/registry`);
}

export async function deleteRegistryItem(weddingId: string, itemId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('registry_items')
    .delete()
    .eq('id', itemId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/registry`);
}

export async function cancelClaim(weddingId: string, claimId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('registry_claims')
    .update({ status: 'cancelled' })
    .eq('id', claimId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/registry`);
}

// ---------------------------------------------------------------------------
// Public claim (no session required; RLS validates active item + wedding)
// ---------------------------------------------------------------------------

export interface ClaimState {
  error?: string;
  ok?: boolean;
}

export async function claimItem(
  weddingId: string,
  itemId: string,
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const input = {
    guestName: String(formData.get('guestName') ?? ''),
    guestEmail: String(formData.get('guestEmail') ?? ''),
    amountCents: String(formData.get('amountCents') ?? ''),
    message: String(formData.get('message') ?? ''),
  };

  const supabase = await createServerSupabaseClient();
  const { data: item } = await supabase
    .from('registry_items')
    .select('id, wedding_id, kind, is_active, quantity_total, quantity_claimed')
    .eq('id', itemId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const row = (item ?? null) as {
    id: string;
    kind: string;
    is_active: boolean;
    quantity_total: number | null;
    quantity_claimed: number;
  } | null;
  if (!row || !row.is_active) {
    return { error: 'This gift is no longer available.' };
  }
  const needsAmount = row.kind === 'cash' || row.kind === 'custom';
  const errors = validateClaim(input, { amountRequired: needsAmount });
  if (errors.length > 0) return { error: errors[0] };
  const left = unitsLeft(row.quantity_total, row.quantity_claimed);
  if (left !== null && left <= 0) {
    return { error: 'This gift is fully claimed.' };
  }

  const { error } = await supabase.from('registry_claims').insert({
    item_id: itemId,
    wedding_id: weddingId,
    guest_name: input.guestName.trim().slice(0, 120),
    guest_email: input.guestEmail.trim() || null,
    amount_cents: input.amountCents.trim() ? Number(input.amountCents) : null,
    message: input.message.trim().slice(0, 1000),
    status: 'reserved',
  });
  if (error) return { error: 'Could not record your reservation. Please try again.' };
  return { ok: true };
}
