'use client';

import { useActionState, useState } from 'react';
import {
  createEvent,
  updateEvent,
  type EventFormState,
  type EventRow,
} from '@/lib/db/events';

const inputClass =
  'w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';
const checkClass = 'h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100';

/** Convert stored ISO to datetime-local value. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  weddingId,
  weddingTimezone,
  event,
}: {
  weddingId: string;
  weddingTimezone: string;
  event?: EventRow;
}) {
  const bound = event
    ? updateEvent.bind(null, weddingId, event.id)
    : createEvent.bind(null, weddingId);
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(bound, {});
  const [local, setLocal] = useState(event ? toLocalInput(event.starts_at) : '');

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Event name
        <input name="name" required defaultValue={event?.name ?? ''} placeholder="Wedding Ceremony" className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Date & time (optional)
          <input
            type="datetime-local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className={inputClass}
          />
          <input type="hidden" name="startsAt" value={local ? new Date(local).toISOString() : ''} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Timezone
          <input name="timezone" defaultValue={event?.timezone ?? weddingTimezone} className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Venue
          <input name="venue" defaultValue={event?.venue ?? ''} placeholder="Grand Hall" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Address
          <input name="address" defaultValue={event?.address ?? ''} placeholder="Street, City" className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Dress code
        <input name="dressCode" defaultValue={event?.dress_code ?? ''} placeholder="Formal / Traditional" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Description
        <textarea name="description" rows={3} defaultValue={event?.description ?? ''} placeholder="What guests should expect…" className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Visibility
          <select name="visibility" defaultValue={event?.visibility ?? 'invited-only'} className={inputClass}>
            <option value="invited-only">Invited guests only</option>
            <option value="public">Public (website)</option>
          </select>
        </label>
        <label className="mt-auto flex items-center gap-2 pb-3 text-sm font-medium">
          <input type="checkbox" name="rsvpRequired" defaultChecked={event?.rsvp_required ?? true} className={checkClass} />
          Requires RSVP
        </label>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? 'Saving…' : event ? 'Save changes' : 'Create event'}
      </button>
    </form>
  );
}
