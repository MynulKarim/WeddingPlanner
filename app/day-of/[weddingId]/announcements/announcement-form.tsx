'use client';

import { useActionState } from 'react';
import { createAnnouncement, type AnnouncementState } from '@/lib/db/dayof';

const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none dark:border-white/10 dark:bg-zinc-900';

export function AnnouncementForm({
  weddingId,
  events,
}: {
  weddingId: string;
  events: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<AnnouncementState, FormData>(
    createAnnouncement.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <input name="title" required maxLength={160} placeholder="Announcement title" aria-label="Title" className={inputClass} />
      <textarea name="body" rows={2} maxLength={2000} placeholder="Details for the team…" aria-label="Details" className={inputClass} />
      <div className="flex gap-2">
        <select name="eventId" defaultValue="" className={`${inputClass} flex-1`} aria-label="Event scope">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-[#1a1a1a] px-5 py-3 text-base font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? '…' : 'Post'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
