import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteTable, getSeatingPlan } from '@/lib/db/seating';
import { fetchGuestHub } from '@/lib/db/guests';
import { seatingStats } from '@/lib/planning/calc';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { SeatingBoard } from './seating-board';
import { TableForm } from './table-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SeatingPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const [plan, hub] = await Promise.all([getSeatingPlan(id), fetchGuestHub(id)]);
  const counts = new Map<string, number>();
  for (const t of plan.tables) counts.set(t.id, t.guest_ids.length);
  const stats = seatingStats(plan.tables, counts, hub.length);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Seating chart</h1>
        <Link
          href={`/api/weddings/${id}/export/seating?format=xlsx`}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          Export chart
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Tables', stats.tables],
          ['Assigned', stats.assigned],
          ['Unassigned', stats.unassigned],
          ['Over capacity', stats.overCapacityTables.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <dt className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 font-serif text-3xl">{value}</dd>
          </div>
        ))}
      </dl>
      {stats.overCapacityTables.length > 0 && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Over capacity: {stats.overCapacityTables.join(', ')}
        </p>
      )}

      <SeatingBoard
        weddingId={id}
        tables={plan.tables}
        guests={hub.map((g) => ({ id: g.id, display_name: g.display_name, is_child: g.is_child }))}
        assignments={plan.assignments}
        canEdit={canEdit}
      />

      {canEdit && (
        <Card>
          <div className="mt-2">
            <SectionHeading title="Tables" desc="Delete a table to free its seats (guests become unassigned)." />
            <TableForm weddingId={id} />
            {plan.tables.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {plan.tables.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-full border border-black/10 px-4 py-1.5 text-sm dark:border-white/10">
                    {t.name}
                    <form action={deleteTable.bind(null, id, t.id)}>
                      <button type="submit" aria-label={`Delete ${t.name}`} className="text-red-700 hover:underline dark:text-red-400">
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </main>
  );
}
