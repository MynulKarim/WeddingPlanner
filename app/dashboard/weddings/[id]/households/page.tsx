import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import {
  deleteHousehold,
  listHouseholds,
} from '@/lib/db/guests';
import { CreateHouseholdForm, RenameHouseholdForm } from './household-forms';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HouseholdsPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');
  const households = await listHouseholds(id);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Households</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Group guests into families and couples. Deleting a household unlinks its
        members — guests are never deleted with it.
      </p>

      {canEdit && <CreateHouseholdForm weddingId={id} />}

      {households.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center">
          <p className="text-lg font-medium">No households yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Households are created here, from the guest form, or by CSV import.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
          {households.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="font-medium">{h.label}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {h.member_count} member{h.member_count === 1 ? '' : 's'}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <RenameHouseholdForm weddingId={id} householdId={h.id} currentLabel={h.label} />
                  <form action={deleteHousehold.bind(null, id, h.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 dark:border-red-900 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
