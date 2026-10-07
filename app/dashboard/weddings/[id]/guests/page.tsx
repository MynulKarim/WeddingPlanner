import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteGuest, fetchGuestHub } from '@/lib/db/guests';
import { listEvents } from '@/lib/db/events';
import {
  applyGuestFilters,
  computeGuestStats,
  distinctTags,
} from '@/lib/guests/hub';
import { GuestFilterBar } from './filter-bar';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function GuestsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const [hub, events] = await Promise.all([fetchGuestHub(id), listEvents(id)]);
  const stats = computeGuestStats(hub);
  const filtered = applyGuestFilters(hub, {
    q: first(sp.q),
    tag: first(sp.tag) || undefined,
    eventId: first(sp.event) && first(sp.event) !== '__none' ? first(sp.event) : undefined,
    unassignedOnly: first(sp.event) === '__none',
    type: (['adult', 'child'] as const).includes(first(sp.type) as 'adult' | 'child')
      ? (first(sp.type) as 'adult' | 'child')
      : undefined,
    plusOneOnly: first(sp.plusOne) === '1',
  });

  const imported = first(sp.imported);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Guests</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/weddings/${id}/guests/import`}
              className="rounded-full border border-black/10 dark:border-white/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Import CSV
            </Link>
            <a
              href={`/api/weddings/${id}/guests/export`}
              className="rounded-full border border-black/10 dark:border-white/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Export CSV
            </a>
            <Link
              href={`/dashboard/weddings/${id}/guests/new`}
              className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200"
            >
              + Add guest
            </Link>
          </div>
        )}
      </div>

      {imported && (
        <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-3 text-sm text-emerald-900 dark:text-emerald-200">
          Imported {imported} guest{imported === '1' ? '' : 's'}.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Guests', stats.total],
          ['Households', stats.households],
          ['Children', stats.children],
          ['Unassigned', stats.unassigned],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
            <dt className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 font-serif text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      {stats.perEvent.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {stats.perEvent.map((e) => (
            <span key={e.event_id} className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5">
              {e.event_name}: {e.count}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        <GuestFilterBar tags={distinctTags(hub)} events={events} />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center">
          <p className="text-lg font-medium">
            {hub.length === 0 ? 'No guests yet' : 'No guests match these filters'}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {hub.length === 0
              ? 'Add guests individually, import a CSV, or create households first.'
              : 'Try clearing the search or filters.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
          {filtered.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="font-medium">
                  {g.display_name}
                  {g.is_child && (
                    <span className="ml-2 rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs">child</span>
                  )}
                  {g.allow_plus_one && (
                    <span className="ml-2 rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs">+1</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {[g.household_label, g.events.map((e) => e.event_name).join(' · ') || 'unassigned']
                    .filter(Boolean)
                    .join(' — ')}
                </p>
                {g.tags.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-400">{g.tags.join(', ')}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/weddings/${id}/guests/${g.id}`}
                    className="rounded-full border border-black/10 dark:border-white/10 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Edit
                  </Link>
                  <form action={deleteGuest.bind(null, id, g.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 dark:border-red-900 px-4 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
