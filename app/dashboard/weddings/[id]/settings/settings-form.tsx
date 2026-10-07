'use client';

import { useActionState } from 'react';
import { updateWedding, type UpdateWeddingState } from '@/lib/db/weddings';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import type { WeddingRow } from '@/lib/db/weddings';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function SettingsForm({ wedding }: { wedding: WeddingRow }) {
  const [state, formAction, pending] = useActionState<UpdateWeddingState, FormData>(
    updateWedding.bind(null, wedding.id),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Wedding title
        <input name="title" required defaultValue={wedding.title} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Timezone
        <input name="timezone" defaultValue={wedding.timezone} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Default language
        <select name="defaultLocale" defaultValue={wedding.default_locale} className={inputClass}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Guests see invitations and the website in their own language when set,
        otherwise in this default.
      </p>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-emerald-800 dark:text-emerald-300">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
