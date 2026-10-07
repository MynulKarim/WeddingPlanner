'use client';

import { useState, useTransition } from 'react';
import {
  moveSection,
  sectionLabel,
  toggleSection,
  type SectionConfig,
} from '@/lib/invitation/sections';

export function SectionsEditor({
  weddingId,
  initial,
  save,
}: {
  weddingId: string;
  initial: SectionConfig[];
  save: (weddingId: string, sections: SectionConfig[]) => Promise<{ error?: string }>;
}) {
  const [sections, setSections] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(next: SectionConfig[]) {
    setSections(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await save(weddingId, next);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((s, i) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-zinc-900"
        >
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={() => persist(toggleSection(sections, s.id))}
              className="h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100"
            />
            <span className={s.enabled ? '' : 'text-zinc-400 line-through'}>
              {sectionLabel(s.id)}
            </span>
          </label>
          <span className="flex gap-1">
            <button
              type="button"
              disabled={i === 0 || pending}
              onClick={() => persist(moveSection(sections, s.id, -1))}
              aria-label={`Move ${sectionLabel(s.id)} up`}
              className="rounded-full border border-black/10 px-3 py-1 text-sm transition-colors hover:bg-black/5 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/10"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === sections.length - 1 || pending}
              onClick={() => persist(moveSection(sections, s.id, 1))}
              aria-label={`Move ${sectionLabel(s.id)} down`}
              className="rounded-full border border-black/10 px-3 py-1 text-sm transition-colors hover:bg-black/5 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/10"
            >
              ↓
            </button>
          </span>
        </div>
      ))}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      {saved && !pending && (
        <p className="text-sm text-emerald-800 dark:text-emerald-300">Layout saved.</p>
      )}
    </div>
  );
}
