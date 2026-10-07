import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { listEvents } from '@/lib/db/events';

interface Props {
  params: Promise<{ weddingId: string }>;
}

export default async function SchedulePage({ params }: Props) {
  const { weddingId } = await params;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();
  const events = await listEvents(weddingId);

  return (
    <div className="py-6">
      <h1 className="font-serif text-2xl">Event schedule</h1>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No events scheduled.</p>
      ) : (
        <ol className="mt-4">
          {events.map((e) => (
            <li key={e.id} className="flex gap-4 py-4">
              <span className="w-24 shrink-0 text-right text-sm font-medium">
                {e.starts_at
                  ? new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : 'TBA'}
              </span>
              <span className="w-px shrink-0 bg-black/15 dark:bg-white/15" aria-hidden="true" />
              <span>
                <span className="block font-serif text-xl">{e.name}</span>
                {[e.venue, e.address].filter(Boolean).length > 0 && (
                  <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                    {[e.venue, e.address].filter(Boolean).join(' · ')}
                  </span>
                )}
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                  {e.starts_at ? new Date(e.starts_at).toLocaleDateString() : 'Date TBA'} · {e.timezone}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
