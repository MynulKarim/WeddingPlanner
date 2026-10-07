'use client';

import { useActionState, useState } from 'react';
import { createWedding, type CreateWeddingState } from '@/lib/db/weddings';
import { slugify } from '@/lib/security/slug';

const inputClass =
  'w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]';

export function NewWeddingForm() {
  const [state, formAction, pending] = useActionState<CreateWeddingState, FormData>(
    createWedding,
    {},
  );
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Wedding title
        <input
          name="title"
          required
          placeholder="Ayesha & Karim"
          className={inputClass}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!touched) setSlug(slugify(e.target.value));
          }}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Website address
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">/w/</span>
          <input
            name="slug"
            required
            placeholder="ayesha-karim"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className={`${inputClass} font-mono`}
            value={slug}
            onChange={(e) => {
              setTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Timezone
        <input name="timezone" defaultValue="UTC" placeholder="Asia/Dhaka" className={inputClass} />
      </label>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create wedding'}
      </button>
    </form>
  );
}
