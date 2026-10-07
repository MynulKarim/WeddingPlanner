'use client';

import { useActionState } from 'react';
import {
  createBudgetItem,
  type BudgetFormState,
} from '@/lib/db/planning';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function BudgetForm({
  weddingId,
}: {
  weddingId: string;
}) {
  // Create + delete only in Phase 9 (edit = delete + recreate); keeps the
  // money trail append-only and honest.
  const [state, formAction, pending] = useActionState<BudgetFormState, FormData>(
    createBudgetItem.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input name="title" required maxLength={200} placeholder="Photographer" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Category
          <input name="category" placeholder="Vendors" maxLength={80} className={inputClass} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Budgeted (cents)
          <input name="budgeted" inputMode="numeric" placeholder="500000" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Actual (cents)
          <input name="actual" inputMode="numeric" placeholder="0" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Paid (cents)
          <input name="paid" inputMode="numeric" placeholder="0" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vendor
          <input name="vendorName" maxLength={160} placeholder="Studio Annie" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Due date
          <input type="date" name="dueDate" className={inputClass} />
        </label>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Adding…' : '+ Add item'}
      </button>
    </form>
  );
}
