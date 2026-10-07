import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteTask, listTasks } from '@/lib/db/planning';
import { listEvents } from '@/lib/db/events';
import { taskCounts } from '@/lib/planning/calc';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { TaskForm, StarterGenerator } from './task-forms';
import { TaskStatusButton } from './task-status';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChecklistPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const [tasks, events] = await Promise.all([listTasks(id), listEvents(id)]);
  const today = new Date().toISOString();
  const counts = taskCounts(tasks, today);
  const firstEvent = events.filter((e) => e.starts_at).sort((a, b) => (a.starts_at as string).localeCompare(b.starts_at as string))[0];
  const defaultDay = firstEvent?.starts_at ? firstEvent.starts_at.slice(0, 10) : '';

  const byCategory = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, []);
    byCategory.get(t.category)?.push(t);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Checklist</h1>
        <Link
          href={`/api/weddings/${id}/export/tasks?format=xlsx`}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          Export
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['To do', counts.todo],
          ['Doing', counts.inProgress],
          ['Done', counts.done],
          ['Overdue', counts.overdue],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <dt className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 font-serif text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      {canEdit && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionHeading title="Quick add" />
            <div className="mt-3">
              <TaskForm weddingId={id} />
            </div>
          </Card>
          <Card>
            <SectionHeading title="Starter template" desc="Dated from your wedding day. Existing tasks are never touched." />
            <div className="mt-3">
              <StarterGenerator weddingId={id} defaultDay={defaultDay} />
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Add tasks above or generate the dated starter checklist.
            </p>
          </div>
        ) : (
          [...byCategory.entries()].map(([category, list]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {category}
              </h2>
              <ul className="mt-2 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <p className={`font-medium ${t.status === 'done' ? 'text-zinc-400 line-through' : ''}`}>
                        {t.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {[t.due_date, t.assignee, t.notes].filter(Boolean).join(' · ') || 'No details'}
                        {t.due_date && t.due_date < today.slice(0, 10) && t.status !== 'done' && ' · overdue'}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <TaskStatusButton weddingId={id} task={t} />
                        <form action={deleteTask.bind(null, id, t.id)}>
                          <button
                            type="submit"
                            aria-label={`Delete ${t.title}`}
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
