'use client';

import { useActionState } from 'react';
import {
  createAlbum,
  createGame,
  createQuestion,
  saveVows,
  type AlbumState,
  type GameState,
  type QuestionState,
  type VowState,
} from '@/lib/db/engagement';
import { GAME_KINDS, gameKindLabel } from '@/lib/engagement/validation';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

const btnClass =
  'w-fit rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200';

export function AlbumForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<AlbumState, FormData>(
    createAlbum.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex gap-2">
      <input name="title" required maxLength={120} placeholder="Reception dance floor" className={`${inputClass} flex-1`} aria-label="Album title" />
      <button type="submit" disabled={pending} className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
        {pending ? '…' : '+ Album'}
      </button>
      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}

export function GameForm({ weddingId }: { weddingId: string }) {
  const [state, formAction, pending] = useActionState<GameState, FormData>(
    createGame.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
        <select name="kind" defaultValue="quiz" className={inputClass} aria-label="Game type">
          {GAME_KINDS.map((k) => (
            <option key={k} value={k}>
              {gameKindLabel(k)}
            </option>
          ))}
        </select>
        <input name="title" required maxLength={160} placeholder="How well do you know us?" className={inputClass} aria-label="Game title" />
      </div>
      <textarea name="description" rows={2} maxLength={2000} placeholder="Rules, questions, answers…" className={inputClass} aria-label="Game description" />
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? 'Adding…' : '+ Add game'}
      </button>
    </form>
  );
}

export function QuestionForm({ weddingId, gameId }: { weddingId: string; gameId: string }) {
  const [state, formAction, pending] = useActionState<QuestionState, FormData>(
    createQuestion.bind(null, weddingId, gameId),
    {},
  );
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
      <input name="question" required maxLength={300} placeholder="Question — e.g. Where was our first date?" className={inputClass} aria-label="Question text" />
      <textarea name="options" required rows={3} maxLength={1100} placeholder={'One option per line (2–8)…\nParis\nRome\nLisbon'} className={inputClass} aria-label="Options, one per line" />
      <div className="flex items-center gap-2">
        <input name="correctOption" inputMode="numeric" pattern="[0-9]*" maxLength={1} placeholder="–" className={`${inputClass} w-16`} aria-label="Correct option number (blank for polls)" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Correct option 1–8, blank for a pure vote.</span>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? 'Adding…' : '+ Add question'}
      </button>
    </form>
  );
}

export function VowForm({
  weddingId,
  initial,
}: {
  weddingId: string;
  initial: { text_a: string; text_b: string; shared: string };
}) {
  const [state, formAction, pending] = useActionState<VowState, FormData>(
    saveVows.bind(null, weddingId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vow — partner A (private)
          <textarea name="textA" rows={4} maxLength={5000} defaultValue={initial.text_a} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vow — partner B (private)
          <textarea name="textB" rows={4} maxLength={5000} defaultValue={initial.text_b} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Shared vow (private keepsake)
        <textarea name="shared" rows={3} maxLength={5000} defaultValue={initial.shared} className={inputClass} />
      </label>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-800 dark:text-emerald-300">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? 'Saving…' : 'Save vows'}
      </button>
    </form>
  );
}
