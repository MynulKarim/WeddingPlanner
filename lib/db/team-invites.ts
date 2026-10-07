/**
 * Team invites — Phase 15 (tenant-scoped, RLS-enforced).
 * An admin records (wedding, email, role); when the invitee registers or
 * signs in with that email, claimTeamInvites (service role) inserts the
 * membership and consumes the invite. Invites never grant owner.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSchemaCacheMiss, pendingMigrationMessage } from '@/lib/db/schema-guard';
import { requireRole } from '@/lib/db/weddings';
import type { WeddingRole } from '@/lib/auth/roles';

export interface TeamInviteRow {
  id: string;
  wedding_id: string;
  email: string;
  role: string;
  created_at: string;
}

/** Pending invites for a wedding (admin-only: rows contain emails). */
export async function listPendingInvites(weddingId: string): Promise<TeamInviteRow[]> {
  await requireRole(weddingId, 'admin');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('team_invites')
    .select('id, wedding_id, email, role, created_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false });
  // Migration 0018 pending: no invites yet, not a failure.
  if (error) {
    if (isSchemaCacheMiss(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as TeamInviteRow[];
}

export async function revokeInvite(weddingId: string, inviteId: string): Promise<void> {
  await requireRole(weddingId, 'admin');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('team_invites')
    .delete()
    .eq('id', inviteId)
    .eq('wedding_id', weddingId);
  if (error) {
    if (isSchemaCacheMiss(error)) throw new Error(pendingMigrationMessage('0018_team_invites.sql'));
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/weddings/${weddingId}`);
}

/**
 * Consume every invite matching this email into memberships. Service-role:
 * the caller just proved email ownership by authenticating. Best-effort —
 * auth must never fail because of a team-link hiccup.
 */
export async function claimTeamInvites(userId: string, email: string): Promise<string[]> {
  const normalized = email.trim().toLowerCase();
  if (!userId || !normalized) return [];
  try {
    const admin = createServiceRoleClient();
    const { data: invites } = await admin
      .from('team_invites')
      .select('id, wedding_id, role')
      .eq('email', normalized);
    const rows = ((invites ?? []) as { id: string; wedding_id: string; role: string }[]).filter(
      (i) => ['admin', 'planner', 'staff'].includes(i.role),
    );
    if (rows.length === 0) return [];
    const claimed: string[] = [];
    for (const invite of rows) {
      const { error: memberError } = await admin.from('wedding_members').upsert(
        { wedding_id: invite.wedding_id, user_id: userId, role: invite.role as WeddingRole },
        { onConflict: 'wedding_id,user_id', ignoreDuplicates: true },
      );
      if (memberError) continue;
      const { error: deleteError } = await admin.from('team_invites').delete().eq('id', invite.id);
      if (!deleteError) claimed.push(invite.wedding_id);
    }
    return claimed;
  } catch {
    return [];
  }
}
