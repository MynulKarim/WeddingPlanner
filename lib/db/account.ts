/**
 * Account usage + plan — Phase 13 (tenant-scoped reads).
 */
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { planLabel } from '@/lib/entitlements/plans';

export interface AccountUsage {
  plan: string;
  planLabel: string;
  weddings: number;
  guests: number;
}

export async function getAccountUsage(): Promise<AccountUsage | null> {
  const user = await getSessionUser();
  if (!user) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();
    const plan = (profile as { plan?: string } | null)?.plan ?? 'free';
    const { data: memberships } = await supabase
      .from('wedding_members')
      .select('wedding_id')
      .eq('user_id', user.id);
    const weddingIds = ((memberships ?? []) as { wedding_id: string }[]).map((m) => m.wedding_id);
    let guests = 0;
    if (weddingIds.length > 0) {
      const { count } = await supabase
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .in('wedding_id', weddingIds);
      guests = count ?? 0;
    }
    return { plan, planLabel: planLabel(plan), weddings: weddingIds.length, guests };
  } catch {
    return null;
  }
}
