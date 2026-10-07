'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setTaskStatus } from '@/lib/db/planning';
import type { TaskRow } from '@/lib/db/planning';

const NEXT: Record<TaskRow['status'], TaskRow['status']> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

const LABEL: Record<TaskRow['status'], string> = {
  todo: 'To do',
  in_progress: 'Doing',
  done: 'Done',
};

export function TaskStatusButton({
  weddingId,
  task,
}: {
  weddingId: string;
  task: TaskRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setTaskStatus(weddingId, task.id, NEXT[task.status]);
          router.refresh();
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        task.status === 'done'
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          : task.status === 'in_progress'
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
            : 'bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
      }`}
    >
      {LABEL[task.status]}
    </button>
  );
}
