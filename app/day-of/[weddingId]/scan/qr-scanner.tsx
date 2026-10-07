'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkInGuest, lookupGuestByToken } from '@/lib/db/dayof';
import { extractInvitationToken } from '@/lib/dayof/dayof';

/**
 * QR scanner — Phase 11. Camera decoding via dynamically imported zxing
 * (kept out of the initial bundle), plus paste-link fallback for devices
 * without camera access.
 */
export function QrScanner({
  weddingId,
  events,
}: {
  weddingId: string;
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [pastetext, setPastetext] = useState('');
  const [found, setFound] = useState<null | {
    guestId: string;
    guestName: string;
    eventIds: string[];
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [pending, startTransition] = useTransition();
  const stopRef = useRef<(() => void) | null>(null);

  async function resolve(token: string) {
    setError(null);
    const guest = await lookupGuestByToken(weddingId, token);
    if (!guest) {
      setError('No guest found for this code in this wedding.');
      return;
    }
    setFound(guest);
    const firstAllowed = events.find((e) => guest.eventIds.includes(e.id));
    if (firstAllowed) setEventId(firstAllowed.id);
  }

  async function startCamera() {
    setError(null);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      setScanning(true);
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (result) {
            const token = extractInvitationToken(result.getText());
            if (token) {
              void stopCamera();
              void resolve(token);
            }
          }
        },
      );
      stopRef.current = () => controls.stop();
    } catch {
      setScanning(false);
      setError('Camera unavailable — paste the invitation link instead.');
    }
  }

  async function stopCamera() {
    stopRef.current?.();
    stopRef.current = null;
    setScanning(false);
  }

  function submit() {
    if (!found || !eventId) return;
    startTransition(async () => {
      const res = await checkInGuest(weddingId, found.guestId, eventId);
      if (res.error) setError(res.error);
      else {
        setFound(null);
        setPastetext('');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      {!scanning ? (
        <button
          type="button"
          onClick={startCamera}
          className="rounded-2xl bg-[#1a1a1a] px-6 py-4 text-lg font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Start camera scanner
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void stopCamera()}
          className="rounded-2xl border border-black/10 px-6 py-4 text-lg font-medium dark:border-white/10"
        >
          Stop camera
        </button>
      )}
      {scanning && <video ref={videoRef} className="aspect-square w-full rounded-2xl bg-black object-cover" playsInline muted />}

      <div className="flex gap-2">
        <input
          value={pastetext}
          onChange={(e) => setPastetext(e.target.value)}
          placeholder="…or paste an invitation link"
          aria-label="Paste invitation link"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none dark:border-white/10 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={() => {
            const token = extractInvitationToken(pastetext);
            if (token) void resolve(token);
            else setError('No invitation link found in that text.');
          }}
          className="shrink-0 rounded-xl bg-[#1a1a1a] px-5 py-3 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Look up
        </button>
      </div>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      {found && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950">
          <p className="text-2xl font-medium">{found.guestName}</p>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
            Event
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none dark:border-white/10 dark:bg-zinc-900"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {found.eventIds.includes(e.id) ? '' : ' (not invited)'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !eventId}
            onClick={submit}
            className="mt-4 w-full rounded-2xl bg-emerald-700 px-6 py-4 text-lg font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Checking in…' : `Check in ${found.guestName.split(' ')[0]}`}
          </button>
        </div>
      )}
    </div>
  );
}
