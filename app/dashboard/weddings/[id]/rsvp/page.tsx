import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteQuestion, getRsvpBoard } from '@/lib/db/rsvp';
import { listInviteStatuses } from '@/lib/db/invitations';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { InvitationManager } from './invitation-manager';
import { StatusSelect } from './status-select';
import { DeadlineForm } from './deadline-form';
import { QuestionForm } from './question-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RsvpPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const [board, invites] = await Promise.all([getRsvpBoard(id), listInviteStatuses(id)]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Invitations & RSVP</h1>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {board.events.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
            Add events first — RSVP tracking lights up per event.
          </div>
        )}
        {board.events.map((e) => (
          <div key={e.event_id} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <dt className="truncate text-sm font-medium">{e.name}</dt>
            <dd className="mt-1 font-serif text-3xl">
              {e.attending}
              <span className="text-base text-zinc-500 dark:text-zinc-400">
                {' '}
                / {e.attending + e.declined + e.pending}
              </span>
            </dd>
            <dd className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {e.declined} declined · {e.pending} pending
              {e.plusOnes > 0 && ` · +${e.plusOnes} plus-ones`}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-6">
        <Card>
          <SectionHeading title="Invitation links" desc="One secure link per guest. Guests open it on any device — no account needed." />
          <div className="mt-4">
            {canEdit ? (
              <InvitationManager weddingId={id} guests={invites} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Only planners and above can issue links. {invites.filter((g) => g.invited).length} of{' '}
                {invites.length} guests invited.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeading title="Deadline & questions" desc="Deadline blocks guest edits (couple overrides still work)." />
          <div className="mt-4 flex flex-col gap-5">
            {canEdit ? (
              <DeadlineForm weddingId={id} current={board.deadline} />
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Deadline:{' '}
                {board.deadline ? new Date(board.deadline).toLocaleString() : 'none set'}
              </p>
            )}
            <div>
              <h3 className="text-sm font-semibold">Custom questions</h3>
              {board.questions.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">No custom questions.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {board.questions.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/10"
                    >
                      <span>
                        {q.question}
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {q.kind}
                          {q.event_name ? ` · ${q.event_name}` : ' · all events'}
                          {q.required ? ' · required' : ''}
                        </span>
                      </span>
                      {canEdit && (
                        <form action={deleteQuestion.bind(null, id, q.id)}>
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && (
                <div className="mt-3">
                  <QuestionForm weddingId={id} events={board.events} />
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeading title="Responses" desc="Per-guest, per-event. Overrides apply instantly and bypass the deadline." />
          <div className="mt-4 overflow-x-auto">
            {board.guests.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No guests yet.</p>
            ) : (
              <table className="w-full min-w-xl text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    <th className="py-2 pr-3">Guest</th>
                    {board.events.map((e) => (
                      <th key={e.event_id} className="py-2 pr-3">
                        {e.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board.guests.map((g) => (
                    <tr key={g.guest_id} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2 pr-3 font-medium">
                        {g.display_name}
                        {g.is_child && (
                          <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                            child
                          </span>
                        )}
                      </td>
                      {board.events.map((e) => {
                        const r = g.responses[e.event_id];
                        if (!r) return <td key={e.event_id} className="py-2 pr-3 text-zinc-300 dark:text-zinc-600">—</td>;
                        return (
                          <td key={e.event_id} className="py-2 pr-3">
                            {canEdit ? (
                              <StatusSelect
                                weddingId={id}
                                guestId={g.guest_id}
                                eventId={e.event_id}
                                current={r.status}
                              />
                            ) : (
                              <span className="text-xs">{r.status}</span>
                            )}
                            {r.plus_one && (
                              <span className="ml-1 text-xs text-zinc-500">+1{r.plus_one_name ? ` (${r.plus_one_name})` : ''}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {board.dietary.length > 0 && (
          <Card>
            <SectionHeading title="Dietary & allergies" desc="Collected per event from attending guests." />
            <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
              {board.dietary.map((d, i) => (
                <li key={i} className="py-2 text-sm">
                  <span className="font-medium">{d.guest}</span>
                  <span className="text-zinc-500 dark:text-zinc-400"> · {d.event}</span>
                  <span className="block text-zinc-600 dark:text-zinc-400">
                    Diet: {d.dietary} · Allergies: {d.allergies}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
