'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkInGuest, undoCheckIn } from '@/lib/db/dayof';
import { dequeueCheckin, enqueueCheckin, type QueuedCheckin } from '@/lib/dayof/dayof';
import type { DayOfGuest } from '@/lib/db/dayof';

const OUTBOX_KEY = (weddingId: string) => `wp-outbox:${weddingId}`;

function loadOutbox(weddingId: string): QueuedCheckin[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY(weddingId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedCheckin[]) : [];
  } catch {
    return [];
  }
}

export function CheckinBoard({
  weddingId,
  events,
  guests,
  initialEventId,
}: {
  weddingId: string;
  events: { id: string; name: string }[];
  guests: DayOfGuest[];
  initialEventId: string | null;
}) {
  const router = useRouter();
  const [eventId, setEventId] = useState(initialEventId ?? events[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const isOnline = useSyncExternalStore(
    (notify) => {
      window.addEventListener('online', notify);
      window.addEventListener('offline', notify);
      return () => {
        window.removeEventListener('online', notify);
        window.removeEventListener('offline', notify);
      };
    },
    () => navigator.onLine,
    () => true,
  );
  const [outbox, setOutbox] = useState<QueuedCheckin[]>(() =>
    typeof window === 'undefined' ? [] : loadOutbox(weddingId),
  );
  const [localOn, setLocalOn] = useState<Set<string>>(new Set());
  const [localOff, setLocalOff] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Persist the outbox (no setState — lint-clean).
  useEffect(() => {
    try {
      localStorage.setItem(OUTBOX_KEY(weddingId), JSON.stringify(outbox));
    } catch {
      // Storage full/blocked — outbox stays in memory for the session.
    }
  }, [outbox, weddingId]);

  // Auto-flush queued check-ins when back online.
  useEffect(() => {
    if (!isOnline || outbox.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const job of outbox) {
        if (cancelled) return;
        const res = await checkInGuest(job.weddingId, job.guestId, job.eventId);
        if (!res.error && !cancelled) {
          setOutbox((q) => dequeueCheckin(q, job.guestId, job.eventId));
          setLocalOn((s) => new Set(s).add(`${job.guestId}:${job.eventId}`));
        }
      }
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const q = query.trim().toLowerCase();
  const visible = guests.filter((g) => !q || g.name.toLowerCase().includes(q));
  const checkedCount = guests.filter((g) => isChecked(g.id)).length;

  function isChecked(guestId: string): boolean {
    const key = `${guestId}:${eventId}`;
    if (localOff.has(key)) return false;
    if (localOn.has(key)) return true;
    return guests.find((g) => g.id === guestId)?.checked[eventId] ?? false;
  }

  function doCheckin(guestId: string) {
    setError(null);
    const key = `${guestId}:${eventId}`;
    if (!isOnline) {
      setOutbox((o) =>
        enqueueCheckin(o, { weddingId, guestId, eventId, queuedAt: new Date().toISOString() }),
      );
      setLocalOn((s) => new Set(s).add(key));
      return;
    }
    startTransition(async () => {
      const res = await checkInGuest(weddingId, guestId, eventId);
      if (res.error) {
        setError(res.error);
        setOutbox((o) =>
          enqueueCheckin(o, { weddingId, guestId, eventId, queuedAt: new Date().toISOString() }),
        );
        setLocalOn((s) => new Set(s).add(key));
      } else {
        setLocalOn((s) => new Set(s).add(key));
        setLocalOff((s) => {
          const next = new Set(s);
          next.delete(key);
          return next;
        });
        setOutbox((o) => dequeueCheckin(o, guestId, eventId));
        router.refresh();
      }
    });
  }

  function doUndo(guestId: string) {
    setError(null);
    const key = `${guestId}:${eventId}`;
    startTransition(async () => {
      try {
        await undoCheckIn(weddingId, guestId, eventId);
        setLocalOff((s) => new Set(s).add(key));
        setLocalOn((s) => {
          const next = new Set(s);
          next.delete(key);
          return next;
        });
        setOutbox((o) => dequeueCheckin(o, guestId, eventId));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reverse check-in.');
      }
    });
  }

  return (
    <div>
      {!isOnline && (
        <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Offline — check-ins are queued on this device ({outbox.length} waiting) and sync automatically.
        </p>
      )}
      {isOnline && outbox.length > 0 && (
        <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Syncing {outbox.length} queued check-in{outbox.length === 1 ? '' : 's'}…
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Event
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none dark:border-white/10 dark:bg-zinc-900"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guests…"
          aria-label="Search guests"
          autoComplete="off"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none dark:border-white/10 dark:bg-zinc-900"
        />
      </div>

      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {checkedCount} of {guests.length} checked in
      </p>
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <ul className="mt-3 flex flex-col gap-2">
        {visible.map((g) => {
          const checked = isChecked(g.id);
          const queued = outbox.some((o) => o.guestId === g.id && o.eventId === eventId);
          return (
            <li
              key={g.id}
              className={`rounded-2xl border p-4 ${
                checked
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950'
                  : 'border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">
                    {g.name}
                    {g.plusOne && <span className="ml-2 text-sm opacity-70">+1{g.plusOneName ? ` (${g.plusOneName})` : ''}</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {[g.table ? `Table: ${g.table}` : 'No table', g.household].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {(g.dietary || g.allergies) && (
                    <p className="mt-0.5 text-sm font-medium text-amber-800 dark:text-amber-200">
                      {[g.dietary, g.allergies && `allergy: ${g.allergies}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {checked ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => doUndo(g.id)}
                    className="shrink-0 rounded-full bg-emerald-700 px-6 py-3 text-base font-medium text-white disabled:opacity-50"
                  >
                    ✓ Undo
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => doCheckin(g.id)}
                    className="shrink-0 rounded-full bg-[#1a1a1a] px-6 py-3 text-base font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {queued ? 'Queued' : 'Check in'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="mt-6 text-center text-sm text-zinc-500">No guests match.</p>
      )}
    </div>
  );
}
