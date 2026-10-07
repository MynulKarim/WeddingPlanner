import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteVendor, deleteVendorPayment, listVendorPayments, listVendors } from '@/lib/db/planning';
import { vendorPaymentStatus } from '@/lib/planning/calc';
import { formatMoney } from '@/lib/registry/registry';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { VendorForm } from './vendor-form';
import { PaymentForm } from './payment-form';

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
  const payments = await listVendorPayments(id);
  const paymentsByVendor = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsByVendor.get(p.vendor_id) ?? [];
    list.push(p);
    paymentsByVendor.set(p.vendor_id, list);
  }
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/api/weddings/${id}/export/vendors?format=xlsx`}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Export
          </Link>
          <Link
            href={`/api/weddings/${id}/export/vendor-payments?format=csv`}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Export payments
          </Link>
        </div>
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
                const vPayments = paymentsByVendor.get(v.id) ?? [];
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
                    {vPayments.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 border-t border-black/10 pt-2 text-xs dark:border-white/10">
                        {vPayments.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2">
                            <span>
                              {formatMoney(p.amount_cents, 'USD')}
                              {p.paid_on && <span className="text-zinc-500"> · {p.paid_on}</span>}
                              {p.note && <span className="text-zinc-500"> · {p.note}</span>}
                            </span>
                            {canEdit && (
                              <form action={deleteVendorPayment.bind(null, id, p.id)}>
                                <button type="submit" className="font-medium text-red-700 hover:underline dark:text-red-400">
                                  Delete
                                </button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {canEdit && <PaymentForm weddingId={id} vendorId={v.id} />}
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
