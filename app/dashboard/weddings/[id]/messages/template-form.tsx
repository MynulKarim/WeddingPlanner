'use client';

import { useActionState } from 'react';
import { saveTemplate, type TemplateState } from '@/lib/db/messages';
import type { TemplateKind } from '@/lib/communications/variables';
import type { Channel } from '@/lib/db/messages';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function TemplateForm({
  weddingId,
  kind,
  kindLabel,
  channel,
  initialSubject,
  initialBody,
}: {
  weddingId: string;
  kind: TemplateKind;
  kindLabel: string;
  channel: Channel;
  initialSubject: string;
  initialBody: string;
}) {
  const [state, formAction, pending] = useActionState<TemplateState, FormData>(
    saveTemplate.bind(null, weddingId, kind, channel),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">
        {kindLabel} · {channel === 'email' ? 'Email' : 'SMS'}
      </p>
      {channel === 'email' && (
        <input
          name="subject"
          defaultValue={initialSubject}
          placeholder="Subject (empty = built-in)"
          maxLength={200}
          className={inputClass}
          aria-label="Template subject"
        />
      )}
      <textarea
        name="body"
        defaultValue={initialBody}
        placeholder="Custom body with {{guestName}}, {{link}}… (empty = built-in)"
        rows={3}
        className={`${inputClass} font-mono text-xs`}
        aria-label="Template body"
      />
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-emerald-800 dark:text-emerald-300">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full border border-black/10 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        {pending ? 'Saving…' : 'Save template'}
      </button>
    </form>
  );
}
