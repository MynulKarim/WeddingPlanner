'use client';

import { useActionState } from 'react';
import { addMemberByEmail, type MemberActionState } from '@/lib/db/weddings';

const inputClass =
  'rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';

export function AddMemberForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<MemberActionState, FormData>(
    addMemberByEmail,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="weddingId" value={weddingId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="teammate@example.com"
          aria-label="Team member email"
          className={`${inputClass} flex-1`}
        />
        <select name="role" defaultValue="planner" className={inputClass} aria-label="Role">
          <option value="admin">Admin</option>
          <option value="planner">Planner</option>
          <option value="staff">Staff</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Invite'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-800 dark:text-emerald-300">{state.message}</p>}
    </form>
  );
}
