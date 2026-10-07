import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { listEvents } from '@/lib/db/events';
import { QrScanner } from './qr-scanner';

interface Props {
  params: Promise<{ weddingId: string }>;
}

export default async function ScanPage({ params }: Props) {
  const { weddingId } = await params;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();
  const events = await listEvents(weddingId);

  return (
    <div className="py-2">
      <h1 className="py-4 font-serif text-2xl">Scan to check in</h1>
      <p className="-mt-2 pb-2 text-sm text-zinc-600 dark:text-zinc-400">
        Guests show the QR code on their invitation. Uninvited events are labeled.
      </p>
      <QrScanner weddingId={weddingId} events={events.map((e) => ({ id: e.id, name: e.name }))} />
    </div>
  );
}
