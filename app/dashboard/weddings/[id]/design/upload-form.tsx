'use client';

import { useActionState, useRef } from 'react';
import { uploadMedia, type UploadState } from '@/lib/db/design';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function UploadForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadMedia.bind(null, weddingId),
    {},
  );
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          ref={fileRef}
          type="file"
          name="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="text-sm text-zinc-700 dark:text-zinc-300"
          aria-label="Media file"
        />
        <select name="visibility" defaultValue="guest-only" className={inputClass} aria-label="Visibility">
          <option value="guest-only">Guests</option>
          <option value="private">Private</option>
          <option value="approved-public">Public (approved)</option>
          <option value="public">Public</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <input name="label" placeholder="Label (optional, e.g. Cover photo)" className={inputClass} aria-label="Media label" />
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-800 dark:text-emerald-300">Uploaded.</p>}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Images up to 8 MB (JPEG/PNG/WebP/GIF), videos up to 32 MB (MP4/WebM).
      </p>
    </form>
  );
}
