'use client';

import { useState, useTransition } from 'react';
import {
  GUEST_CSV_HEADERS,
  parseGuestsCsv,
  type GuestCsvRow,
} from '@/lib/guests/csv';
import { importGuests } from '@/lib/db/guests';

const inputClass =
  'w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';

export function ImportForm({ weddingId }: { weddingId: string }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ rows: GuestCsvRow[]; errors: { line: number; message: string }[] } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    void file.text().then((t) => {
      setText(t);
      setPreview(parseGuestsCsv(t));
      setSubmitError(null);
    });
  }

  function confirm() {
    if (!preview || preview.rows.length === 0) return;
    setSubmitError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('rows', JSON.stringify(preview.rows));
      const result = await importGuests(weddingId, {}, formData);
      if (result.error) setSubmitError(result.error);
      // On success the action redirects to the guest list.
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        …or paste CSV text
        <textarea
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(parseGuestsCsv(e.target.value));
            setSubmitError(null);
          }}
          placeholder={GUEST_CSV_HEADERS.join(',')}
          className={`${inputClass} font-mono text-xs`}
        />
      </label>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Columns: {GUEST_CSV_HEADERS.join(', ')}. Booleans: y/n. Lists (tags, events) use
        semicolons; events match by name. Households are created when missing.
      </p>

      {preview && (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 text-sm">
          <p>
            <strong>{preview.rows.length}</strong> valid row{preview.rows.length === 1 ? '' : 's'}
            {preview.errors.length > 0 && (
              <span className="text-red-700 dark:text-red-400">
                {' '}
                · {preview.errors.length} problem{preview.errors.length === 1 ? '' : 's'}
              </span>
            )}
          </p>
          {preview.errors.length > 0 && (
            <ul className="mt-2 max-h-32 list-disc overflow-auto pl-5 text-red-700 dark:text-red-400">
              {preview.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          )}
          {preview.rows.length > 0 && (
            <div className="mt-2 max-h-56 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-500 dark:text-zinc-400">
                    <th className="py-1 pr-2">Name</th>
                    <th className="py-1 pr-2">Household</th>
                    <th className="py-1 pr-2">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-black/5">
                      <td className="py-1 pr-2 font-medium">{r.display_name}</td>
                      <td className="py-1 pr-2">{r.household || '—'}</td>
                      <td className="py-1 pr-2">{r.events.join('; ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 50 && (
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">…and {preview.rows.length - 50} more.</p>
              )}
            </div>
          )}
        </div>
      )}

      {submitError && <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>}
      <button
        type="button"
        disabled={pending || !preview || preview.rows.length === 0}
        onClick={confirm}
        className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? 'Importing…' : `Import ${preview?.rows.length ?? 0} guests`}
      </button>
    </div>
  );
}
