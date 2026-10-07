import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { cancelClaim, deleteRegistryItem, getRegistry } from '@/lib/db/registry';
import { formatMoney, fundProgress, registryKindLabel } from '@/lib/registry/registry';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { ItemForm } from './item-form';

function itemClaimsTotal(
  claims: { item_id: string; status: string; amount_cents: number | null }[],
  itemId: string,
): number[] {
  const out: number[] = [];
  for (const c of claims) {
    if (c.item_id === itemId && c.status === 'reserved') out.push(c.amount_cents || 0);
  }
  return out;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegistryPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');
  const { items, claims } = await getRegistry(id);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Gift registry</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Reservations only in this phase — no money moves. Real charging arrives
        with the payment integration.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {canEdit && (
          <Card>
            <SectionHeading title="Add a gift" desc="Physical, cash, experience, or honeymoon & custom." />
            <div className="mt-4">
              <ItemForm weddingId={id} />
            </div>
          </Card>
        )}

        <Card>
          <SectionHeading title={`Gifts (${items.length})`} />
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              No gifts yet. Add your first gift above.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((item) => {
                const reserved = itemClaimsTotal(claims, item.id);
                const progress = fundProgress(reserved, item.amount_cents);
                const itemClaims = claims.filter((c) => c.item_id === item.id);
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-black/10 p-5 dark:border-white/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                          {registryKindLabel(item.kind)}
                          {!item.is_active && ' · hidden'}
                        </p>
                        <p className="mt-1 font-serif text-xl">{item.title}</p>
                        {item.amount_cents ? (
                          <p className="mt-1 text-sm font-medium">
                            {formatMoney(item.amount_cents, item.currency)}
                            {progress.fraction !== null && (
                              <span className="ml-2 font-normal text-zinc-500">
                                {formatMoney(progress.raised, item.currency)} raised (
                                {Math.round(progress.fraction * 100)}%)
                              </span>
                            )}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {item.claims_count} reservation{item.claims_count === 1 ? '' : 's'}
                          {item.quantity_total ? ` · ${item.quantity_total - item.quantity_claimed} left` : ''}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/weddings/${id}/registry/${item.id}`}
                            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                          >
                            Edit
                          </Link>
                          <form action={deleteRegistryItem.bind(null, id, item.id)}>
                            <button
                              type="submit"
                              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                    {itemClaims.length > 0 && (
                      <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                        {itemClaims.map((c) => (
                          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>
                              <span className="font-medium">{c.guest_name}</span>
                              {c.amount_cents ? (
                                <span className="ml-2 text-zinc-500">
                                  {formatMoney(c.amount_cents, item.currency)}
                                </span>
                              ) : null}
                              {c.message && (
                                <span className="block text-zinc-500 dark:text-zinc-400">{c.message}</span>
                              )}
                              <span className="ml-2 text-xs text-zinc-400">· {c.status}</span>
                            </span>
                            {canEdit && c.status === 'reserved' && (
                              <form action={cancelClaim.bind(null, id, c.id)}>
                                <button
                                  type="submit"
                                  className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                                >
                                  Cancel reservation
                                </button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
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
