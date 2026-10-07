'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setRsvpAdmin } from '@/lib/db/rsvp';
import type { RsvpStatus } from '@/lib/rsvp/rules';

export function StatusSelect({
  weddingId,
  guestId,
  eventId,
  current,
}: {
  weddingId: string;
  guestId: string;
  eventId: string;
  current: RsvpStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await setRsvpAdmin(weddingId, guestId, eventId, e.target.value as RsvpStatus);
          router.refresh();
        })
      }
      aria-label="RSVP status override"
      className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs outline-none disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900"
    >
      <option value="pending">Pending</option>
      <option value="attending">Attending</option>
      <option value="declined">Declined</option>
    </select>
  );
}
