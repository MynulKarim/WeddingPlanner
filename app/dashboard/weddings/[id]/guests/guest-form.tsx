'use client';

import { useActionState } from 'react';
import {
  createGuest,
  updateGuest,
  type GuestFormState,
  type GuestDetail,
  type HouseholdRow,
} from '@/lib/db/guests';
import type { EventRow } from '@/lib/db/events';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';

const inputClass =
  'w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';
const checkClass = 'h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100';

export function GuestForm({
  weddingId,
  households,
  events,
  guest,
}: {
  weddingId: string;
  households: HouseholdRow[];
  events: EventRow[];
  guest?: GuestDetail;
}) {
  const bound = guest
    ? updateGuest.bind(null, weddingId, guest.id)
    : createGuest.bind(null, weddingId);
  const [state, formAction, pending] = useActionState<GuestFormState, FormData>(bound, {});
  const assigned = new Set(guest?.events.map((e) => e.event_id) ?? []);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Full name
        <input name="displayName" required defaultValue={guest?.display_name ?? ''} placeholder="Aunt Salma" className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email (optional)
          <input name="email" type="email" defaultValue={guest?.email ?? ''} placeholder="salma@example.com" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone (optional)
          <input name="phone" defaultValue={guest?.phone ?? ''} placeholder="+880 …" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Household
          <select name="householdId" defaultValue={guest?.household_id ?? ''} className={inputClass}>
            <option value="">No household</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          …or new household
          <input name="newHousehold" placeholder="The Rahman Family" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Language (optional)
          <select name="locale" defaultValue={guest?.locale ?? ''} className={inputClass}>
            <option value="">Wedding default</option>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tags (comma separated)
          <input name="tags" defaultValue={(guest?.tags ?? []).join(', ')} placeholder="vip, family" className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-medium">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isChild" defaultChecked={guest?.is_child ?? false} className={checkClass} />
          Child
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="allowPlusOne" defaultChecked={guest?.allow_plus_one ?? false} className={checkClass} />
          May bring a plus-one
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Plus-one name (if known)
        <input name="plusOneName" defaultValue={guest?.plus_one_name ?? ''} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Notes (private — never shown to guests)
        <textarea name="notes" rows={2} defaultValue={guest?.notes ?? ''} placeholder="Vegetarian, wheelchair access…" className={inputClass} />
      </label>
      {events.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Invited to</legend>
          <div className="flex flex-wrap gap-2">
            {events.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-sm has-checked:border-[#8a6d3b] has-checked:bg-[#faf8f4] dark:has-checked:bg-zinc-800"
              >
                <input type="checkbox" name="eventIds" value={e.id} defaultChecked={assigned.has(e.id)} className={checkClass} />
                {e.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? 'Saving…' : guest ? 'Save changes' : 'Add guest'}
      </button>
    </form>
  );
}
