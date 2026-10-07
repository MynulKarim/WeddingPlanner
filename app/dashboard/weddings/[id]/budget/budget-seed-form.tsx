'use client';

import { useActionState } from 'react';
import { generateStarterBudget, type GenerateState } from '@/lib/db/planning';
import { starterBudgetCount } from '@/lib/planning/budget-template';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

/** Seed the dated starter budget (deposit/final-balance lines per area). */
export function BudgetSeedForm({
  weddingId,
  defaultDay,
}: {
  weddingId: string;
  defaultDay: string;
}) {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(
    generateStarterBudget.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Wedding day
        <input type="date" name="weddingDay" required defaultValue={defaultDay} className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        {pending ? 'Generating…' : `Seed ${starterBudgetCount()} budget lines`}
      </button>
      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {typeof state.created === 'number' && (
        <p className="w-full text-sm text-emerald-800 dark:text-emerald-300">
          Added {state.created} dated budget lines with typical share hints.
        </p>
      )}
    </form>
  );
}
