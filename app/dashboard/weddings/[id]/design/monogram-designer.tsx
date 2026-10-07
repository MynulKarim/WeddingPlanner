'use client';

import { useState, useTransition } from 'react';
import {
  MONOGRAM_SHAPES,
  MONOGRAM_STYLES,
  type MonogramShape,
  type MonogramStyle,
} from '@/lib/monogram/svg';
import { MonogramMark } from '@/components/monogram/monogram-mark';
import { saveMonogram, type MonogramRow } from '@/lib/db/design';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function MonogramDesigner({
  weddingId,
  initial,
  accent,
  ink,
}: {
  weddingId: string;
  initial: MonogramRow | null;
  accent: string;
  ink: string;
}) {
  const [initials, setInitials] = useState(initial?.initials ?? '');
  const [style, setStyle] = useState<MonogramStyle>(initial?.style ?? 'serif');
  const [shape, setShape] = useState<MonogramShape>(initial?.shape ?? 'seal');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveMonogram(weddingId, { initials, style, shape });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Initials
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            placeholder="A & K"
            maxLength={6}
            className={`${inputClass} max-w-52`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Style
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as MonogramStyle)}
              className={inputClass}
            >
              {MONOGRAM_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Shape
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value as MonogramShape)}
              className={inputClass}
            >
              {MONOGRAM_SHAPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {saved && <p className="text-sm text-emerald-800 dark:text-emerald-300">Monogram saved.</p>}
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="w-fit rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Save monogram'}
        </button>
      </div>
      <div className="flex justify-center rounded-2xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-900">
        <MonogramMark initials={initials || '·'} style={style} shape={shape} accent={accent} ink={ink} size={120} />
      </div>
    </div>
  );
}
