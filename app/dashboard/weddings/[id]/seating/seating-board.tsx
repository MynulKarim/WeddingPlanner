'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { assignSeat, unassignSeat } from '@/lib/db/seating';

export interface BoardGuest {
  id: string;
  display_name: string;
  is_child: boolean;
}

export interface BoardTable {
  id: string;
  name: string;
  capacity: number | null;
  guest_ids: string[];
}

export interface BoardProps {
  weddingId: string;
  tables: BoardTable[];
  guests: BoardGuest[];
  assignments: Record<string, string>;
  canEdit: boolean;
}

function GuestChip({ guest, canEdit }: { guest: BoardGuest; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    disabled: !canEdit,
  });
  return (
    <span
      ref={setNodeRef}
      {...(canEdit ? { ...listeners, ...attributes } : {})}
      className={`inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10 ${
        canEdit ? 'cursor-grab touch-none' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {guest.display_name}
      {guest.is_child && <span className="text-xs opacity-70">· child</span>}
    </span>
  );
}

function TableDrop({
  table,
  guests,
  canEdit,
  onRemove,
}: {
  table: BoardTable;
  guests: BoardGuest[];
  canEdit: boolean;
  onRemove: (guestId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.id}`, disabled: !canEdit });
  const over = table.capacity !== null && guests.length > table.capacity;
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition-colors ${
        isOver
          ? 'border-[#8a6d3b] ring-2 ring-[#8a6d3b]/40'
          : 'border-black/10 dark:border-white/10'
      } bg-white dark:bg-zinc-900`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-serif text-lg">{table.name}</p>
        <p className={`font-mono text-xs ${over ? 'font-bold text-red-700 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {guests.length}{table.capacity !== null ? `/${table.capacity}` : ' seats'}
          {over && ' · over capacity'}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {guests.length === 0 && (
          <p className="text-sm text-zinc-400">Drop guests here</p>
        )}
        {guests.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1">
            <GuestChip guest={g} canEdit={false} />
            {canEdit && (
              <button
                type="button"
                onClick={() => onRemove(g.id)}
                aria-label={`Remove ${g.display_name}`}
                className="rounded-full border border-black/10 px-2 text-xs transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SeatingBoard(props: BoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  function mutate(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!props.canEdit) return;
    const active = String(event.active.id);
    const over = event.over ? String(event.over.id) : null;
    if (!active.startsWith('guest:') || !over) return;
    const guestId = active.slice('guest:'.length);
    if (over === 'unassigned') mutate(() => unassignSeat(props.weddingId, guestId));
    else if (over.startsWith('table:'))
      mutate(() => assignSeat(props.weddingId, guestId, over.slice('table:'.length)));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <BoardContent {...props} onRemove={(guestId) => mutate(() => unassignSeat(props.weddingId, guestId))} />
    </DndContext>
  );
}

function BoardContent({
  tables,
  guests,
  assignments,
  canEdit,
  onRemove,
}: BoardProps & { onRemove: (guestId: string) => void }) {
  const [query, setQuery] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned', disabled: !canEdit });
  const byId = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const q = query.trim().toLowerCase();
  const matches = (g: BoardGuest) => !q || g.display_name.toLowerCase().includes(q);

  const unassigned = guests.filter((g) => !assignments[g.id] && matches(g));
  const lookup = q ? guests.filter((g) => assignments[g.id] && matches(g)) : [];
  const tableName = (tableId: string) => tables.find((t) => t.id === tableId)?.name ?? '';

  return (
    <>
      <div className="mt-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guests — matches show their table…"
          aria-label="Search guests"
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 focus:border-[#8a6d3b]"
        />
        {lookup.length > 0 && (
          <ul className="mt-2 divide-y divide-black/5 rounded-xl border border-black/10 bg-white text-sm dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900">
            {lookup.map((g) => (
              <li key={g.id} className="flex justify-between px-4 py-2">
                <span>{g.display_name}</span>
                <span className="font-medium">{tableName(assignments[g.id])}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div
          ref={setNodeRef}
          className={`h-fit rounded-2xl border p-4 transition-colors ${
            isOver
              ? 'border-[#8a6d3b] ring-2 ring-[#8a6d3b]/40'
              : 'border-dashed border-black/15 dark:border-white/15'
          }`}
        >
          <p className="text-sm font-semibold">Unassigned ({unassigned.length})</p>
          <div className="mt-3 flex max-h-[480px] flex-wrap content-start gap-1.5 overflow-auto">
            {unassigned.map((g) => (
              <GuestChip key={g.id} guest={g} canEdit={canEdit} />
            ))}
            {unassigned.length === 0 && (
              <p className="text-sm text-zinc-400">Everyone has a seat.</p>
            )}
          </div>
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2">
          {tables.map((t) => (
            <TableDrop
              key={t.id}
              table={t}
              guests={t.guest_ids.map((id) => byId.get(id)).filter((g): g is BoardGuest => Boolean(g))}
              canEdit={canEdit}
              onRemove={onRemove}
            />
          ))}
          {tables.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Create your first table below.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
