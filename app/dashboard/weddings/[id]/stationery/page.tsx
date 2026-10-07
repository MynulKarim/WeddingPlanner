import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { fetchGuestHub } from '@/lib/db/guests';
import { listEvents } from '@/lib/db/events';
import { StationeryStudio } from './stationery-studio';
import { chromiumAvailable } from '@/lib/pdf/render';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StationeryPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const [hub, events, pdfReady] = await Promise.all([
    fetchGuestHub(id),
    listEvents(id),
    // Serverless hosts have no Chromium: the studio offers print-via-preview.
    chromiumAvailable().catch(() => false),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Printable stationery</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Invitations, save-the-dates, place cards, menus, thank-yous, and the
        seating chart — generated from live data in your theme.
      </p>
      <div className="mt-6">
        <StationeryStudio
          weddingId={id}
          guests={hub.map((g) => ({ id: g.id, name: g.display_name }))}
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          pdfReady={pdfReady}
        />
      </div>
    </main>
  );
}
