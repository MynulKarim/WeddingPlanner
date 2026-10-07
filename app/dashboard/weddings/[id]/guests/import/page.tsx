import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { ImportForm } from './import-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ImportPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link
        href={`/dashboard/weddings/${id}/guests`}
        className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4"
      >
        ← Guests
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Import guests</h1>
      <div className="mt-6">
        <ImportForm weddingId={id} />
      </div>
    </main>
  );
}
