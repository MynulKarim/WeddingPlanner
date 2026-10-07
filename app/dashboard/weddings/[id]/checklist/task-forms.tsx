'use client';

import { useActionState } from 'react';
import {
  createTask,
  generateStarterChecklist,
  type GenerateState,
  type TaskFormState,
} from '@/lib/db/planning';

const inputClass =
  'rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function TaskForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    createTask.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm font-medium">
        New task
        <input name="title" required maxLength={200} placeholder="Book florist" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Category
        <input name="category" placeholder="Vendors" maxLength={80} className={`${inputClass} w-32`} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Due
        <input type="date" name="dueDate" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Assignee
        <input name="assignee" maxLength={120} placeholder="Ayesha" className={`${inputClass} w-32`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Adding…' : '+ Add'}
      </button>
      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}

export function StarterGenerator({
  weddingId,
  defaultDay,
}: {
  weddingId: string;
  defaultDay: string;
}) {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(
    generateStarterChecklist.bind(null, weddingId),
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
        {pending ? 'Generating…' : 'Generate starter checklist'}
      </button>
      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {typeof state.created === 'number' && (
        <p className="w-full text-sm text-emerald-800 dark:text-emerald-300">
          Added {state.created} dated tasks.
        </p>
      )}
    </form>
  );
}
