'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { issueInvitation, revokeInvitation } from '@/lib/db/invitations';
import type { GuestInviteStatus } from '@/lib/db/invitations';

export function InvitationManager({
  weddingId,
  guests,
}: {
  weddingId: string;
  guests: GuestInviteStatus[];
}) {
  const router = useRouter();
  const [links, setLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function issue(guestId: string) {
    setError(null);
    setPendingId(guestId);
    startTransition(async () => {
      const result = await issueInvitation(weddingId, guestId);
      setPendingId(null);
      if (result.error) setError(result.error);
      else if (result.link) {
        setLinks((l) => ({ ...l, [guestId]: result.link as string }));
        router.refresh();
      }
    });
  }

  function revoke(guestId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await revokeInvitation(weddingId, guestId);
        setLinks((l) => {
          const next = { ...l };
          delete next[guestId];
          return next;
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not revoke.');
      }
    });
  }

  async function copy(guestId: string) {
    const link = links[guestId];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(guestId);
      setTimeout(() => setCopied((c) => (c === guestId ? null : c)), 2000);
    } catch {
      setError('Copy failed — select the link manually.');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {guests.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add guests first — invitation links are issued per guest.
        </p>
      )}
      {guests.map((g) => (
        <div
          key={g.guest_id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-zinc-900"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{g.display_name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {g.invited ? `Invited${g.locale ? ` · ${g.locale}` : ''}` : 'No link yet'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {links[g.guest_id] ? (
              <>
                <input
                  readOnly
                  value={links[g.guest_id]}
                  onFocus={(e) => e.target.select()}
                  className="w-56 rounded-lg border border-black/10 bg-white px-2 py-1.5 font-mono text-xs dark:border-white/10 dark:bg-zinc-900"
                  aria-label={`Invitation link for ${g.display_name}`}
                />
                <button
                  type="button"
                  onClick={() => copy(g.guest_id)}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  {copied === g.guest_id ? 'Copied!' : 'Copy'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={pendingId === g.guest_id}
                onClick={() => issue(g.guest_id)}
                className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                {pendingId === g.guest_id
                  ? 'Issuing…'
                  : g.invited
                    ? 'Regenerate link'
                    : 'Create link'}
              </button>
            )}
            {g.invited && (
              <button
                type="button"
                onClick={() => revoke(g.guest_id)}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Links are shown once and never stored — only their hashes. Regenerating a
        link instantly disables the old one.
      </p>
    </div>
  );
}
