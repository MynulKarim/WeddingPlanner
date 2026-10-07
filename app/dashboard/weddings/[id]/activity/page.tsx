import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { listAuditLogs } from '@/lib/db/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ActivityPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const logs = await listAuditLogs(id).catch(() => []);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Activity log</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Append-only trail of important actions. Entries can never be edited or deleted.
      </p>
      {logs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-lg font-medium">No activity yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Wedding creation, invitations, RSVP overrides, and sends appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900">
          {logs.map((l) => (
            <li key={l.id} className="px-5 py-3">
              <p className="font-mono text-sm">{l.action}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(l.created_at).toLocaleString()}
                {l.entity ? ` · ${l.entity}` : ''}
                {l.entity_id ? ` · ${l.entity_id.slice(0, 8)}…` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
