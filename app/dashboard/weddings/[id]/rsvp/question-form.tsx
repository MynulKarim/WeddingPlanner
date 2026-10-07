'use client';

import { useActionState, useState } from 'react';
import { createQuestion, type QuestionState } from '@/lib/db/rsvp';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function QuestionForm({
  weddingId,
  events,
}: {
  weddingId: string;
  events: { event_id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<QuestionState, FormData>(
    createQuestion.bind(null, weddingId),
    {},
  );
  const [kind, setKind] = useState('text');
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <input name="question" required placeholder="e.g. Which entrée?" maxLength={300} className={inputClass} aria-label="Question text" />
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={inputClass}
          aria-label="Question type"
        >
          <option value="text">Free text</option>
          <option value="choice">Multiple choice</option>
          <option value="boolean">Yes / No</option>
        </select>
        <select name="eventId" defaultValue="" className={inputClass} aria-label="Event scope">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.event_id} value={e.event_id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      {kind === 'choice' && (
        <input
          name="options"
          placeholder="Options separated by ; — e.g. Chicken; Fish; Vegan"
          aria-label="Choice options separated by semicolons"
          className={inputClass}
        />
      )}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="required" className="h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100" />
          Required
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Adding…' : 'Add question'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
