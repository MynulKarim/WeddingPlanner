/**
 * Profile data access — Phase 1, admin locale added in Phase 6.
 */
'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupportedLocale } from '@/lib/i18n/languages';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  locale: string | null;
}

export async function getMyProfile(): Promise<{ email?: string; profile: ProfileRow | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, locale')
    .eq('id', user.id)
    .maybeSingle();
  return { email: user.email, profile: data };
}

/** Admin locale for dashboard date/number formatting. Defaults to English. */
export async function getAdminLocale(): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'en';
    const { data } = await supabase
      .from('profiles')
      .select('locale')
      .eq('id', user.id)
      .maybeSingle();
    const locale = (data as { locale?: string | null } | null)?.locale;
    return locale && isSupportedLocale(locale) ? locale : 'en';
  } catch {
    return 'en';
  }
}

export interface ProfileState {
  error?: string;
  message?: string;
}

export async function updateMyProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const locale = String(formData.get('locale') ?? '').trim();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName || null,
      locale: locale && isSupportedLocale(locale) ? locale : null,
    })
    .eq('id', user.id);
  if (error) return { error: error.message };
  await supabase.auth.updateUser({ data: { display_name: displayName || null } });
  return { message: 'Profile updated.' };
}
