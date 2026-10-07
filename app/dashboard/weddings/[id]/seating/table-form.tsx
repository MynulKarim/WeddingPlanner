'use client';

import { useActionState } from 'react';
import { createTable, type TableFormState } from '@/lib/db/seating';

const inputClass =
  'rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function TableForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<TableFormState, FormData>(
    createTable.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="mt-6 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Table name
        <input name="name" required placeholder="Table 1" maxLength={80} className={`${inputClass} w-44`} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Seats
        <input name="capacity" inputMode="numeric" placeholder="8" className={`${inputClass} w-24`} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Shape
        <select name="shape" defaultValue="round" className={inputClass}>
          <option value="round">Round</option>
          <option value="rectangle">Rectangle</option>
          <option value="head">Head table</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Adding…' : '+ Add table'}
      </button>
      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
