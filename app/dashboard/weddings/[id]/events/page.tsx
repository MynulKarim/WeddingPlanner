import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteEvent, listEvents } from '@/lib/db/events';
import { getAdminLocale } from '@/lib/db/profile';

interface Props {
  params: Promise<{ id: string }>;
}

function formatWhen(startsAt: string | null, timezone: string, locale: string): string {
  if (!startsAt) return 'Date to be announced';
  try {
    return (
      new Date(startsAt).toLocaleString(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ` (${timezone})`
    );
  } catch {
    return startsAt;
  }
}

export default async function EventsPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');
  const [events, adminLocale] = await Promise.all([listEvents(id), getAdminLocale()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
        {canEdit && (
          <Link
            href={`/dashboard/weddings/${id}/events/new`}
            className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200"
          >
            + New event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center">
          <p className="text-lg font-medium">No events yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add your ceremony, reception, holud, sangeet — as many as you need.
          </p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5"
            >
              <div>
                <p className="font-serif text-xl">{e.name}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{formatWhen(e.starts_at, e.timezone, adminLocale)}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {e.venue && <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1">{e.venue}</span>}
                  <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1">{e.visibility}</span>
                  {e.rsvp_required && (
                    <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1">RSVP</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/weddings/${id}/events/${e.id}`}
                    className="rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Edit
                  </Link>
                  <form action={deleteEvent.bind(null, id, e.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 dark:border-red-900 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
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
