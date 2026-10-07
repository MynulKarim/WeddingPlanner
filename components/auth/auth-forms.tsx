/**
 * Auth forms — Phase 1 (client components, `useActionState` + server actions).
 */
'use client';

import { useActionState } from 'react';
import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  updatePassword,
  type AuthFormState,
} from '@/lib/auth/actions';

const inputClass =
  'w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';
const buttonClass =
  'w-full rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50';
const feedbackClass = 'text-sm';

function Feedback({ state }: { state: AuthFormState }) {
  if (state.error) return <p className={`${feedbackClass} text-red-700 dark:text-red-400`}>{state.error}</p>;
  if (state.message)
    return <p className={`${feedbackClass} text-emerald-800 dark:text-emerald-300`}>{state.message}</p>;
  return null;
}

export function PasswordForm({ mode }: { mode: 'login' | 'register' }) {
  const action = mode === 'login' ? signInWithPassword : signUpWithPassword;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {mode === 'register' && (
        <input name="displayName" placeholder="Your name (optional)" aria-label="Your name (optional)" className={inputClass} autoComplete="name" />
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        aria-label="Email address"
        className={inputClass}
        autoComplete="email"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder={mode === 'register' ? 'Create a password (8+ characters)' : 'Password'}
        aria-label="Password"
        className={inputClass}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
      />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signInWithMagicLink,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        aria-label="Email address"
        className={inputClass}
        autoComplete="email"
      />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full border border-black/10 dark:border-white/10 px-6 py-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}

export function ResetForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        aria-label="Email address"
        className={inputClass}
        autoComplete="email"
      />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="New password (8+ characters)"
        aria-label="New password"
        className={inputClass}
        autoComplete="new-password"
      />
      <input
        name="confirm"
        type="password"
        required
        placeholder="Confirm new password"
        aria-label="Confirm new password"
        className={inputClass}
        autoComplete="new-password"
      />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}
