import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { getEvent } from '@/lib/db/events';
import { EventForm } from '../event-form';

interface Props {
  params: Promise<{ id: string; eventId: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id, eventId } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const event = await getEvent(id, eventId).catch(() => null);
  if (!event) notFound();
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link
        href={`/dashboard/weddings/${id}/events`}
        className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4"
      >
        ← Events
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit event</h1>
      <div className="mt-6">
        <EventForm weddingId={id} weddingTimezone={wedding.timezone} event={event} />
      </div>
    </main>
  );
}
