'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const inputClass =
  'rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-[#8a6d3b]';

export function GuestFilterBar({
  tags,
  events,
}: {
  tags: string[];
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        defaultValue={params.get('q') ?? ''}
        onChange={(e) => set('q', e.target.value)}
        placeholder="Search name or email…"
        className={`${inputClass} min-w-52 flex-1`}
        aria-label="Search guests"
      />
      <select
        value={params.get('tag') ?? ''}
        onChange={(e) => set('tag', e.target.value)}
        className={inputClass}
        aria-label="Filter by tag"
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={params.get('event') ?? ''}
        onChange={(e) => set('event', e.target.value)}
        className={inputClass}
        aria-label="Filter by event"
      >
        <option value="">All events</option>
        <option value="__none">Unassigned only</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <select
        value={params.get('type') ?? ''}
        onChange={(e) => set('type', e.target.value)}
        className={inputClass}
        aria-label="Filter by type"
      >
        <option value="">Adults + children</option>
        <option value="adult">Adults</option>
        <option value="child">Children</option>
      </select>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={params.get('plusOne') === '1'}
          onChange={(e) => set('plusOne', e.target.checked ? '1' : '')}
          className="h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100"
        />
        Plus-one
      </label>
    </div>
  );
}
