'use client';

import { useActionState, useState } from 'react';
import { setOverrides, type OverridesState } from '@/lib/db/design';
import { fontStackIds, type ThemeOverrides } from '@/lib/themes/tokens';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

function ColorField({
  name,
  label,
  initial,
}: {
  name: string;
  label: string;
  initial: string;
}) {
  // Empty = theme default. The picker only writes into the field when used,
  // so untouched colors never override the theme.
  const [value, setValue] = useState(initial);
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/10"
          aria-label={`${label} picker`}
        />
        <input
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="auto"
          pattern="#(?:[0-9a-f]{3}|[0-9a-f]{6})"
          className={`${inputClass} font-mono text-xs`}
          aria-label={`${label} hex value`}
        />
      </span>
    </label>
  );
}

export function CustomizeForm({
  weddingId,
  current,
}: {
  weddingId: string;
  current: ThemeOverrides;
}) {
  const [state, formAction, pending] = useActionState<OverridesState, FormData>(
    setOverrides.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ColorField name="accent" label="Accent" initial={current.accent ?? ''} />
        <ColorField name="background" label="Background" initial={current.background ?? ''} />
        <ColorField name="surface" label="Surface" initial={current.surface ?? ''} />
        <ColorField name="ink" label="Ink (text)" initial={current.ink ?? ''} />
      </div>
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Leave a field empty to use the theme default — overrides apply instantly
        to the preview below.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Corner radius
          <select name="radius" defaultValue={current.radius ?? ''} className={inputClass}>
            <option value="">Theme default</option>
            <option value="0.25rem">Sharp</option>
            <option value="0.5rem">Soft</option>
            <option value="0.75rem">Rounded</option>
            <option value="1rem">Pill</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Display font
          <select name="displayFont" defaultValue={current.displayFont ?? ''} className={inputClass}>
            <option value="">Theme default</option>
            {fontStackIds().map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Body font
          <select name="bodyFont" defaultValue={current.bodyFont ?? ''} className={inputClass}>
            <option value="">Theme default</option>
            {fontStackIds().map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Applying…' : 'Apply customization'}
      </button>
    </form>
  );
}
