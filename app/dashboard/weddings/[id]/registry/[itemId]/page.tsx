import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { getRegistry } from '@/lib/db/registry';
import { ItemForm } from '../item-form';

interface Props {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function EditItemPage({ params }: Props) {
  const { id, itemId } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const { items } = await getRegistry(id);
  const item = items.find((i) => i.id === itemId);
  if (!item) notFound();
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link
        href={`/dashboard/weddings/${id}/registry`}
        className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        ← Registry
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit gift</h1>
      <div className="mt-6">
        <ItemForm weddingId={id} item={item} />
      </div>
    </main>
  );
}
