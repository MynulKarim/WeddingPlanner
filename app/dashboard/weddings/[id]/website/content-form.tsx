'use client';

import { useActionState, useState } from 'react';
import { saveWebsiteContent, type WebsiteState } from '@/lib/db/website';
import type { WebsiteContent } from '@/lib/website/content';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

const FIELDS: { key: string; label: string; multiline?: boolean; placeholder?: string }[] = [
  { key: 'partnerA', label: 'Partner A name', placeholder: 'Ayesha' },
  { key: 'partnerB', label: 'Partner B name', placeholder: 'Karim' },
  { key: 'tagline', label: 'Hero tagline', placeholder: 'We are getting married' },
  { key: 'story', label: 'Love story', multiline: true, placeholder: 'How you met…' },
  { key: 'venueNote', label: 'Venue note', multiline: true },
  { key: 'directions', label: 'Directions', multiline: true },
  { key: 'transportation', label: 'Transportation', multiline: true },
  { key: 'parking', label: 'Parking', multiline: true },
  { key: 'airport', label: 'Airport information', multiline: true },
  { key: 'mapUrl', label: 'Map link (https://)', placeholder: 'https://maps.google.com/…' },
  { key: 'travel', label: 'Travel', multiline: true },
  { key: 'accommodation', label: 'Accommodation', multiline: true },
  { key: 'menuNote', label: 'Menu note', multiline: true },
  { key: 'dietaryNote', label: 'Dietary information', multiline: true },
  { key: 'registryNote', label: 'Registry note', multiline: true },
];

export function ContentForm({
  weddingId,
  initial,
  noindex,
}: {
  weddingId: string;
  initial: WebsiteContent;
  noindex: boolean;
}) {
  const [state, formAction, pending] = useActionState<WebsiteState, FormData>(
    saveWebsiteContent.bind(null, weddingId),
    {},
  );
  const [faq, setFaq] = useState(
    initial.faq && initial.faq.length > 0 ? initial.faq : [{ q: '', a: '' }],
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.slice(0, 3).map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5 text-sm font-medium">
            {f.label}
            <input
              name={f.key}
              defaultValue={(initial as Record<string, string>)[f.key] ?? ''}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      {FIELDS.slice(3).map((f) => (
        <label key={f.key} className="flex flex-col gap-1.5 text-sm font-medium">
          {f.label}
          <textarea
            name={f.key}
            rows={3}
            defaultValue={(initial as Record<string, string>)[f.key] ?? ''}
            placeholder={f.placeholder}
            className={inputClass}
          />
        </label>
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">FAQ</legend>
        {faq.map((entry, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input
              name="faqQ"
              defaultValue={entry.q}
              placeholder="Question"
              className={inputClass}
              aria-label={`FAQ question ${i + 1}`}
            />
            <input
              name="faqA"
              defaultValue={entry.a}
              placeholder="Answer"
              className={inputClass}
              aria-label={`FAQ answer ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => setFaq(faq.filter((_, j) => j !== i))}
              className="rounded-full border border-black/10 px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFaq([...faq, { q: '', a: '' }])}
          className="w-fit rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          + Add question
        </button>
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="noindex"
          defaultChecked={noindex}
          className="h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100"
        />
        Hide from search engines (noindex)
      </label>

      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Saving…' : 'Save content'}
      </button>
    </form>
  );
}
