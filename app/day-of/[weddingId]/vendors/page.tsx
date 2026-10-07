import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { listVendors } from '@/lib/db/planning';
import { formatMoney } from '@/lib/registry/registry';

interface Props {
  params: Promise<{ weddingId: string }>;
}

export default async function DayOfVendorsPage({ params }: Props) {
  const { weddingId } = await params;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();
  const vendors = await listVendors(weddingId);

  return (
    <div className="py-6">
      <h1 className="font-serif text-2xl">Vendor contacts</h1>
      {vendors.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No vendors tracked.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {vendors.map((v) => (
            <li key={v.id} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
              <p className="text-lg font-medium">{v.name}</p>
              <p className="text-xs uppercase tracking-widest text-zinc-500">{v.category}</p>
              <div className="mt-2 flex flex-col gap-1 text-base">
                {v.contact_name && <p>Contact: {v.contact_name}</p>}
                {v.phone && (
                  <a href={`tel:${v.phone.replace(/\s/g, '')}`} className="font-medium text-emerald-700 underline dark:text-emerald-300">
                    Call: {v.phone}
                  </a>
                )}
                {v.email && (
                  <a href={`mailto:${v.email}`} className="underline">
                    {v.email}
                  </a>
                )}
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatMoney(v.paid_cents, 'USD')} / {formatMoney(v.cost_cents, 'USD')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
