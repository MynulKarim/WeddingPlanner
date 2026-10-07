import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteVendor, listVendors } from '@/lib/db/planning';
import { vendorPaymentStatus } from '@/lib/planning/calc';
import { formatMoney } from '@/lib/registry/registry';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { VendorForm } from './vendor-form';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  unpaid: 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300',
  partial: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
};

export default async function VendorsPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const vendors = await listVendors(id);
  const totalCost = vendors.reduce((a, v) => a + v.cost_cents, 0);
  const totalPaid = vendors.reduce((a, v) => a + v.paid_cents, 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {formatMoney(totalPaid, 'USD')} paid of {formatMoney(totalCost, 'USD')} committed
          </p>
        </div>
        <Link
          href={`/api/weddings/${id}/export/vendors?format=xlsx`}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          Export
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canEdit && (
          <Card>
            <SectionHeading title="Add vendor" />
            <div className="mt-3">
              <VendorForm weddingId={id} />
            </div>
          </Card>
        )}
        <Card>
          <SectionHeading title={`Tracker (${vendors.length})`} />
          {vendors.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No vendors yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {vendors.map((v) => {
                const status = vendorPaymentStatus(v.cost_cents, v.paid_cents);
                return (
                  <li key={v.id} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {v.website ? (
                            <a href={v.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                              {v.name}
                            </a>
                          ) : (
                            v.name
                          )}
                          <span className="ml-2 text-xs font-normal text-zinc-500">{v.category}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {[v.contact_name, v.email, v.phone].filter(Boolean).join(' · ') || 'No contact details'}
                        </p>
                        <p className="mt-1 text-sm">
                          {formatMoney(v.paid_cents, 'USD')} / {formatMoney(v.cost_cents, 'USD')}
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[status]}`}>
                            {status}
                          </span>
                        </p>
                      </div>
                      {canEdit && (
                        <form action={deleteVendor.bind(null, id, v.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
