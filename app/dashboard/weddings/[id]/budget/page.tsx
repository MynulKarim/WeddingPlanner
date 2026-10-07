import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteBudgetItem, listBudget } from '@/lib/db/planning';
import { budgetByCategory, budgetTotals } from '@/lib/planning/calc';
import { formatMoney } from '@/lib/registry/registry';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { BudgetForm } from './budget-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BudgetPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const items = await listBudget(id);
  const totals = budgetTotals(items);
  const byCategory = budgetByCategory(items);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Budget</h1>
        <Link
          href={`/api/weddings/${id}/export/budget?format=xlsx`}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          Export
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Budgeted', formatMoney(totals.budgeted, 'USD')],
          ['Actual', formatMoney(totals.actual, 'USD')],
          ['Paid', formatMoney(totals.paid, 'USD')],
          [`Remaining`, formatMoney(totals.remaining, 'USD')],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <dt className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 font-serif text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
      {totals.outstanding > 0 && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Outstanding to vendors: {formatMoney(totals.outstanding, 'USD')}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canEdit && (
          <Card>
            <SectionHeading title="Add expense" />
            <div className="mt-3">
              <BudgetForm weddingId={id} />
            </div>
          </Card>
        )}
        <Card>
          <SectionHeading title="By category" />
          {byCategory.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No expenses yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {byCategory.map((c) => (
                <li key={c.category} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatMoney(c.actual, 'USD')} / {formatMoney(c.budgeted, 'USD')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {items.length > 0 && (
        <ul className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div>
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {[i.category, i.vendor_name].filter(Boolean).join(' · ')} · budgeted{' '}
                  {formatMoney(i.budgeted_cents, 'USD')} · actual {formatMoney(i.actual_cents, 'USD')} · paid{' '}
                  {formatMoney(i.paid_cents, 'USD')}
                </p>
              </div>
              {canEdit && (
                <form action={deleteBudgetItem.bind(null, id, i.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
