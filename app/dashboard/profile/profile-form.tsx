'use client';

import { useActionState } from 'react';
import { updateMyProfile, type ProfileState } from '@/lib/db/profile';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';

const inputClass =
  'w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';

export function ProfileForm({
  initialName,
  initialLocale,
}: {
  initialName: string;
  initialLocale: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateMyProfile,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Display name
        <input
          name="displayName"
          defaultValue={initialName}
          placeholder="Your name"
          className={inputClass}
          autoComplete="name"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your language
        <select name="locale" defaultValue={initialLocale} className={inputClass}>
          <option value="">English (default)</option>
          {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Used for dates and numbers across your dashboard.
      </p>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-800 dark:text-emerald-300">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
