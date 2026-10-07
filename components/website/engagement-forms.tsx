'use client';

import { useActionState } from 'react';
import {
  requestSong,
  sealCapsule,
  signGuestbook,
  uploadGuestPhoto,
  type PublicState,
} from '@/lib/db/engagement';

const inputClass =
  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--wp-accent)]';
const inputStyle = {
  background: 'var(--wp-background)',
  color: 'var(--wp-ink)',
} as const;

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
      style={{
        background: 'var(--wp-accent)',
        color: 'var(--wp-accent-ink)',
        borderRadius: 'var(--wp-radius)',
      }}
    >
      {pending ? '…' : label}
    </button>
  );
}

export function GuestbookForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<PublicState, FormData>(
    signGuestbook.bind(null, weddingId),
    {},
  );
  if (state.ok) return <p className="text-center text-sm font-medium">Thanks — the couple will see it after approval.</p>;
  return (
    <form action={formAction} className="mx-auto mt-4 flex max-w-md flex-col gap-2">
      <input name="guestName" required maxLength={80} placeholder="Your name" aria-label="Your name" className={inputClass} style={inputStyle} />
      <textarea name="message" required maxLength={2000} rows={3} placeholder="Your wishes…" aria-label="Your message" className={inputClass} style={inputStyle} />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton pending={pending} label="Sign guestbook" />
    </form>
  );
}

export function SongForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<PublicState, FormData>(
    requestSong.bind(null, weddingId),
    {},
  );
  if (state.ok) return <p className="text-center text-sm font-medium">Request received — watch the dance floor.</p>;
  return (
    <form action={formAction} className="mx-auto mt-4 flex max-w-md flex-col gap-2">
      <input name="guestName" required maxLength={80} placeholder="Your name" aria-label="Your name" className={inputClass} style={inputStyle} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="title" required maxLength={200} placeholder="Song title" aria-label="Song title" className={inputClass} style={inputStyle} />
        <input name="artist" maxLength={200} placeholder="Artist (optional)" aria-label="Artist" className={inputClass} style={inputStyle} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton pending={pending} label="Request song" />
    </form>
  );
}

export function CapsuleForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<PublicState, FormData>(
    sealCapsule.bind(null, weddingId),
    {},
  );
  if (state.ok) return <p className="text-center text-sm font-medium">Sealed — it stays closed until its open date.</p>;
  return (
    <form action={formAction} className="mx-auto mt-4 flex max-w-md flex-col gap-2">
      <input name="guestName" required maxLength={80} placeholder="Your name" aria-label="Your name" className={inputClass} style={inputStyle} />
      <textarea name="message" required maxLength={2000} rows={3} placeholder="A note for the future…" aria-label="Capsule message" className={inputClass} style={inputStyle} />
      <label className="flex items-center gap-2 text-sm">
        Open after
        <input type="date" name="openAfter" className={inputClass} aria-label="Open after date" />
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton pending={pending} label="Seal into capsule" />
    </form>
  );
}

export function PhotoUploadForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<PublicState, FormData>(
    uploadGuestPhoto.bind(null, weddingId),
    {},
  );
  if (state.ok) return <p className="text-center text-sm font-medium">Uploaded — it appears after the couple approves it.</p>;
  return (
    <form action={formAction} className="mx-auto mt-4 flex max-w-md flex-col gap-2">
      <input name="guestName" required maxLength={80} placeholder="Your name" aria-label="Your name" className={inputClass} style={inputStyle} />
      <input
        type="file"
        name="file"
        required
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="text-sm"
        aria-label="Photo file"
      />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton pending={pending} label="Upload photo" />
    </form>
  );
}
