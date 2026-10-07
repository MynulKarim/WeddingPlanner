'use client';

import { useActionState } from 'react';
import {
  createHousehold,
  renameHousehold,
  type HouseholdFormState,
} from '@/lib/db/guests';

const inputClass =
  'rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-[#8a6d3b]';

export function CreateHouseholdForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<HouseholdFormState, FormData>(
    createHousehold.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="mt-6">
      <div className="flex gap-2">
        <input
          name="label"
          required
          placeholder="The Rahman Family"
          className={`${inputClass} flex-1`}
          aria-label="New household name"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {pending ? 'Adding…' : '+ Add'}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}

export function RenameHouseholdForm({
  weddingId,
  householdId,
  currentLabel,
}: {
  weddingId: string;
  householdId: string;
  currentLabel: string;
}) {
  const [state, formAction, pending] = useActionState<HouseholdFormState, FormData>(
    renameHousehold.bind(null, weddingId, householdId),
    {},
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="label"
        required
        defaultValue={currentLabel}
        className={`${inputClass} w-40`}
        aria-label={`Rename ${currentLabel}`}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
      >
        Rename
      </button>
      {state.error && <span className="text-sm text-red-700 dark:text-red-400">{state.error}</span>}
    </form>
  );
}
