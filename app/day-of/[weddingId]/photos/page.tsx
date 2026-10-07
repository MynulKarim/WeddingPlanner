import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { getDesign } from '@/lib/db/design';
import { PhotoWallLive } from '@/components/website/photo-wall';

interface Props {
  params: Promise<{ weddingId: string }>;
}

export default async function DayOfPhotosPage({ params }: Props) {
  const { weddingId } = await params;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();
  const design = await getDesign(weddingId);
  const wall = design.media
    .filter((m) => m.kind === 'image' && m.url && (m.visibility === 'approved-public' || m.visibility === 'public'))
    .slice(0, 48)
    .map((m) => ({ id: m.id, url: m.url as string, label: m.label }));

  return (
    <div className="py-6">
      <h1 className="font-serif text-2xl">Live photo wall</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Updates automatically as photos are approved.
      </p>
      <div className="mt-4">
        {wall.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-zinc-500 dark:border-white/15">
            No approved photos yet.
          </p>
        ) : (
          <PhotoWallLive initial={wall} />
        )}
      </div>
    </div>
  );
}
