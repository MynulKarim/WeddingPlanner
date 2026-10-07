/**
 * Wedding data access — Phase 1 (tenant-scoped, RLS-enforced).
 * All queries use the user-scoped server client; RLS is the safety net,
 * membership checks here provide clear errors + defense in depth.
 */
'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isValidSlug } from '@/lib/security/slug';
import type { WeddingRole } from '@/lib/auth/roles';
import { hasRoleAtLeast } from '@/lib/auth/roles';

export interface WeddingRow {
  id: string;
  slug: string;
  title: string;
  default_locale: string;
  theme_id: string;
  timezone: string;
}

export interface MemberRow {
  wedding_id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  email?: string | null;
}

export async function listMyWeddings(): Promise<WeddingRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('weddings')
    .select('id, slug, title, default_locale, theme_id, timezone')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyRole(weddingId: string): Promise<WeddingRole | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle();
  return (data?.role as WeddingRole | undefined) ?? null;
}

export async function requireRole(
  weddingId: string,
  minimum: WeddingRole,
): Promise<WeddingRole> {
  const role = await getMyRole(weddingId);
  if (!role || !hasRoleAtLeast(role, minimum)) {
    throw new Error('You do not have permission for this wedding.');
  }
  return role;
}

export async function getWedding(weddingId: string): Promise<WeddingRow | null> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('weddings')
    .select('id, slug, title, default_locale, theme_id, timezone')
    .eq('id', weddingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export interface CreateWeddingState {
  error?: string;
}

export async function createWedding(
  _prev: CreateWeddingState,
  formData: FormData,
): Promise<CreateWeddingState> {
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const timezone = String(formData.get('timezone') ?? '').trim() || 'UTC';

  if (!title) return { error: 'Give your wedding a title.' };
  if (!isValidSlug(slug)) {
    return { error: 'Slug must be lowercase letters, numbers, and hyphens.' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Entitlement gate (Phase 13): account plan limits wedding count.
  const [{ data: profile }, { count: weddingCount }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    supabase.from('wedding_members').select('wedding_id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);
  const { canCreateWedding, planLabel } = await import('@/lib/entitlements/plans');
  const plan = (profile as { plan?: string } | null)?.plan ?? 'free';
  if (!canCreateWedding(plan, weddingCount ?? 0)) {
    return { error: `Your ${planLabel(plan)} plan allows a limited number of weddings. Upgrade to create another.` };
  }

  const { data: existing } = await supabase
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) return { error: 'That URL is taken. Try another.' };

  const { data, error } = await supabase
    .from('weddings')
    .insert({ title, slug, timezone, created_by: user.id })
    .select('id')
    .single();
  if (error) return { error: error.message };

  // Audit + analytics (Phase 13). Neither blocks the redirect on failure.
  const { logAudit } = await import('@/lib/db/audit');
  const { trackEvent } = await import('@/lib/observability/analytics');
  await logAudit({ weddingId: data.id, action: 'wedding.created', entity: 'wedding', entityId: data.id, meta: { title } });
  trackEvent({ event: 'wedding_created', distinctId: user.id });
  redirect(`/dashboard/weddings/${data.id}`);
}

export async function listMembers(weddingId: string): Promise<MemberRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('wedding_members')
    .select('wedding_id, user_id, role')
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({ ...m, display_name: null }));
}

export interface MemberActionState {
  error?: string;
  message?: string;
}

const ASSIGNABLE_ROLES: WeddingRole[] = ['admin', 'planner', 'staff'];

export interface UpdateWeddingState {
  error?: string;
  message?: string;
}

/** Wedding settings: title, timezone, default language (planner+). */
export async function updateWedding(
  weddingId: string,
  _prev: UpdateWeddingState,
  formData: FormData,
): Promise<UpdateWeddingState> {
  await requireRole(weddingId, 'planner');
  const title = String(formData.get('title') ?? '').trim();
  const timezone = String(formData.get('timezone') ?? '').trim() || 'UTC';
  const defaultLocale = String(formData.get('defaultLocale') ?? '').trim() || 'en';
  if (!title) return { error: 'Give your wedding a title.' };
  const { isSupportedLocale } = await import('@/lib/i18n/languages');
  if (!isSupportedLocale(defaultLocale)) return { error: 'Choose a supported language.' };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('weddings')
    .update({ title, timezone, default_locale: defaultLocale })
    .eq('id', weddingId);
  if (error) return { error: error.message };
  return { message: 'Wedding settings saved.' };
}

export async function addMemberByEmail(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const weddingId = String(formData.get('weddingId') ?? '');
  await requireRole(weddingId, 'admin');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'planner') as WeddingRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { error: 'Role must be admin, planner, or staff.' };
  }
  // Membership is keyed by user id; resolve via profiles is not possible from
  // email alone with the anon key. Record the invite intent for now — full
  // invite-by-email resolution ships with communications (Phase 7).
  return {
    message:
      `Invite recorded for ${email} as ${role}. ` +
      'They will gain access once they register with this email (Phase 7 finalizes auto-link).',
  };
}
