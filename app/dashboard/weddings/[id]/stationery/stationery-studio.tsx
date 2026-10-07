'use client';

import { useState } from 'react';
import { STATIONERY_DOCS, stationeryLabel, type StationeryDoc } from '@/lib/pdf/documents';

const DOC_BLURBS: Record<StationeryDoc, string> = {
  invitation: 'One page per guest, A5. Personal invitations with their events.',
  'save-the-date': 'Single A5 landscape card with the headline date.',
  'place-cards': 'Tent cards on A4, 8 per page. Seated guests only.',
  menu: 'A5 menu per event, with dietary notes.',
  'thank-you': 'A6 cards, one per guest.',
  'seating-chart': 'A3 landscape chart with tables and unassigned list.',
};

export function StationeryStudio({
  weddingId,
  guests,
  events,
  pdfReady,
}: {
  weddingId: string;
  guests: { id: string; name: string }[];
  events: { id: string; name: string }[];
  pdfReady: boolean;
}) {
  const [guestId, setGuestId] = useState('');
  const [eventId, setEventId] = useState('');

  const href = (doc: StationeryDoc, format: 'pdf' | 'html') => {
    const params = new URLSearchParams({ format });
    const scoped =
      (doc === 'invitation' || doc === 'thank-you') && guestId ? { guestId } : {};
    const eventScoped = doc === 'menu' && eventId ? { eventId } : {};
    for (const [k, v] of Object.entries({ ...scoped, ...eventScoped })) params.set(k, v);
    return `/api/weddings/${weddingId}/stationery/${doc}?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Single guest (invitations, thank-yous)
          <select
            value={guestId}
            onChange={(e) => setGuestId(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-zinc-900"
          >
            <option value="">All guests</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Single event (menus)
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-zinc-900"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {STATIONERY_DOCS.map((doc) => (
          <li
            key={doc}
            className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900"
          >
            <p className="font-serif text-xl">{stationeryLabel(doc)}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{DOC_BLURBS[doc]}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={href(doc, 'html')}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Preview
              </a>
              {pdfReady ? (
                <a
                  href={href(doc, 'pdf')}
                  className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Download PDF
                </a>
              ) : (
                <a
                  href={href(doc, 'html')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="No PDF engine on this host — print from the preview instead."
                  className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Print via preview
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Print-ready PDFs (A-series pages, safe margins, embedded fonts) rendered
        from your live wedding data and theme. Prefer the preview + browser
        print on hosts without a PDF engine.
      </p>
    </div>
  );
}
