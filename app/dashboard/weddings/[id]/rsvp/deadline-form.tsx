'use client';

import { useActionState } from 'react';
import { setDeadline, type DeadlineState } from '@/lib/db/rsvp';

const inputClass =
  'rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DeadlineForm({
  weddingId,
  current,
}: {
  weddingId: string;
  current: string | null;
}) {
  const [state, formAction, pending] = useActionState<DeadlineState, FormData>(
    setDeadline.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        RSVP deadline
        <input type="datetime-local" name="deadline" defaultValue={toLocalInput(current)} className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Saving…' : 'Set'}
      </button>
      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.ok && (
        <p className="w-full text-sm text-emerald-800 dark:text-emerald-300">Deadline saved.</p>
      )}
    </form>
  );
}
