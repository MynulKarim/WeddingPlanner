/**
 * Invitation issuance — Phase 5 (couple side; planner+).
 * Generates opaque tokens, stores only sha256 hashes. Raw tokens are
 * returned once for the couple to share; they are never stored or re-shown.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { generateInvitationToken } from '@/lib/security/invitation-token';
import { hashInvitationToken } from '@/lib/security/token-hash';
import { getAppUrl } from '@/lib/supabase/server';

export interface GuestInviteStatus {
  guest_id: string;
  display_name: string;
  invited: boolean;
  locale: string | null;
  updated_at: string | null;
}

export async function listInviteStatuses(weddingId: string): Promise<GuestInviteStatus[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data: guests, error: gError } = await supabase
    .from('guests')
    .select('id, display_name')
    .eq('wedding_id', weddingId)
    .order('display_name');
  if (gError) throw new Error(gError.message);
  const { data: invites } = await supabase
    .from('invitations')
    .select('guest_id, locale, updated_at')
    .eq('wedding_id', weddingId);
  const byGuest = new Map(
    ((invites ?? []) as { guest_id: string; locale: string; updated_at: string }[]).map((i) => [
      i.guest_id,
      i,
    ]),
  );
  return ((guests ?? []) as { id: string; display_name: string }[]).map((g) => ({
    guest_id: g.id,
    display_name: g.display_name,
    invited: byGuest.has(g.id),
    locale: byGuest.get(g.id)?.locale ?? null,
    updated_at: byGuest.get(g.id)?.updated_at ?? null,
  }));
}

export interface IssueResult {
  error?: string;
  /** Shareable link — shown ONCE, never stored. */
  link?: string;
}

export async function issueInvitation(
  weddingId: string,
  guestId: string,
): Promise<IssueResult> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();

  // Tenant guard: guest must belong to this wedding.
  const { data: guest, error: gError } = await supabase
    .from('guests')
    .select('id, locale')
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (gError) return { error: gError.message };
  if (!guest) return { error: 'Guest not found in this wedding.' };

  const token = generateInvitationToken();
  const { error } = await supabase.from('invitations').upsert(
    {
      wedding_id: weddingId,
      guest_id: guestId,
      token_hash: hashInvitationToken(token),
      locale: (guest as { locale?: string | null }).locale ?? 'en',
    },
    { onConflict: 'guest_id' },
  );
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/rsvp`);
  const { logAudit } = await import('@/lib/db/audit');
  const { trackEvent } = await import('@/lib/observability/analytics');
  await logAudit({ weddingId, action: 'invitation.issued', entity: 'invitation', entityId: guestId });
  trackEvent({ event: 'invitation_issued' });
  return { link: `${getAppUrl()}/invite/${token}` };
}

export async function revokeInvitation(weddingId: string, guestId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/rsvp`);
  const { logAudit } = await import('@/lib/db/audit');
  await logAudit({ weddingId, action: 'invitation.revoked', entity: 'invitation', entityId: guestId });
}
