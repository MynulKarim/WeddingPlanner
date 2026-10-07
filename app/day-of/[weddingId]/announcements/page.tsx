import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteAnnouncement, listAnnouncements, toggleAnnouncement } from '@/lib/db/dayof';
import { listEvents } from '@/lib/db/events';
import { AnnouncementForm } from './announcement-form';

interface Props {
  params: Promise<{ weddingId: string }>;
}

export default async function AnnouncementsPage({ params }: Props) {
  const { weddingId } = await params;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(weddingId);
  const canDelete = role !== null && hasRoleAtLeast(role, 'planner');
  const [announcements, events] = await Promise.all([
    listAnnouncements(weddingId),
    listEvents(weddingId),
  ]);

  return (
    <div className="py-6">
      <h1 className="font-serif text-2xl">Team updates</h1>
      <div className="mt-4">
        <AnnouncementForm weddingId={weddingId} events={events.map((e) => ({ id: e.id, name: e.name }))} />
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {announcements.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-zinc-500 dark:border-white/15">
            No updates yet.
          </li>
        )}
        {announcements.map((a) => (
          <li
            key={a.id}
            className={`rounded-2xl border p-4 ${
              a.is_active
                ? 'border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900'
                : 'opacity-60'
            }`}
          >
            <p className="font-medium">
              {a.title}
              {a.event_name && <span className="ml-2 text-xs font-normal text-zinc-500">· {a.event_name}</span>}
            </p>
            {a.body && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.body}</p>}
            <div className="mt-2 flex gap-2">
              <form action={toggleAnnouncement.bind(null, weddingId, a.id, !a.is_active)}>
                <button type="submit" className="rounded-full border border-black/10 px-4 py-1.5 text-sm dark:border-white/10">
                  {a.is_active ? 'Hide' : 'Show'}
                </button>
              </form>
              {canDelete && (
                <form action={deleteAnnouncement.bind(null, weddingId, a.id)}>
                  <button type="submit" className="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400">
                    Delete
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
