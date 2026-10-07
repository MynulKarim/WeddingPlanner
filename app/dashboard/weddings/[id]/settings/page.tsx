import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { SettingsForm } from './settings-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Wedding settings</h1>
      <div className="mt-6">
        {canEdit ? (
          <SettingsForm wedding={wedding} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Only planners and above can change settings.
          </p>
        )}
      </div>
    </main>
  );
}
