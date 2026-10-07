/**
 * Auth Server Actions — Phase 1.
 * Supports both email+password and magic-link (passwordless) sign-in.
 * Each action returns form state; success redirects.
 */
'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient, getAppUrl } from '@/lib/supabase/server';

export interface AuthFormState {
  error?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalidEmail(email: string): boolean {
  return !EMAIL_RE.test(email.trim());
}

function callbackUrl(next = '/dashboard'): string {
  return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();

  if (invalidEmail(email)) return { error: 'Enter a valid email address.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: callbackUrl('/dashboard'),
    },
  });
  if (error) return { error: error.message };
  // Team auto-link (Phase 15): consume any pending team invites for this
  // email now — access lands the moment they verify and sign in (the
  // callback and sign-in paths claim again, idempotently).
  if (data.user) {
    const { claimTeamInvites } = await import('@/lib/db/team-invites');
    await claimTeamInvites(data.user.id, email);
  }
  return { message: 'Check your email to verify your account, then sign in.' };
}

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (invalidEmail(email)) return { error: 'Enter a valid email address.' };
  if (!password) return { error: 'Enter your password.' };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  // Team auto-link (Phase 15): a proven email owns its pending invites.
  if (data.user) {
    const { claimTeamInvites } = await import('@/lib/db/team-invites');
    await claimTeamInvites(data.user.id, data.user.email ?? email);
  }
  redirect('/dashboard');
}

export async function signInWithMagicLink(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  if (invalidEmail(email)) return { error: 'Enter a valid email address.' };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl('/dashboard') },
  });
  if (error) return { error: error.message };
  return { message: 'Check your email for a sign-in link.' };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  if (invalidEmail(email)) return { error: 'Enter a valid email address.' };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/update-password'),
  });
  if (error) return { error: error.message };
  // Always respond identically to avoid account enumeration.
  return { message: 'If an account exists for that email, a reset link is on its way.' };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== confirm) return { error: 'Passwords do not match.' };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect('/dashboard');
}
