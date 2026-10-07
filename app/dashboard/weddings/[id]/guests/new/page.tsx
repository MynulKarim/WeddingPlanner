import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { listHouseholds } from '@/lib/db/guests';
import { listEvents } from '@/lib/db/events';
import { GuestForm } from '../guest-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewGuestPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const [households, events] = await Promise.all([listHouseholds(id), listEvents(id)]);
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link
        href={`/dashboard/weddings/${id}/guests`}
        className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4"
      >
        ← Guests
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Add guest</h1>
      <div className="mt-6">
        <GuestForm weddingId={id} households={households} events={events} />
      </div>
    </main>
  );
}
