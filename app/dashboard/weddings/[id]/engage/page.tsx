import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import {
  approveCapsule,
  approveGuestbook,
  approvePhoto,
  approveSong,
  clearWelcomeVideo,
  deleteAlbum,
  deleteCapsule,
  deleteGame,
  deleteGuestbook,
  deletePhoto,
  deleteSong,
  getEngagementBoard,
  setWelcomeVideo,
} from '@/lib/db/engagement';
import { getDesign } from '@/lib/db/design';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { AlbumForm, GameForm, VowForm } from './engage-forms';

interface Props {
  params: Promise<{ id: string }>;
}

function Row({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {sub && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  );
}

export default async function EngagePage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');
  const [board, design] = await Promise.all([getEngagementBoard(id), getDesign(id)]);
  const videos = design.media.filter((m) => m.kind === 'video');

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Guest engagement</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Guestbook, photos, songs, games, time capsule, and vows. Guest submissions
        wait in moderation until approved.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeading title={`Guestbook (${board.guestbookApproved} published)`} desc={board.guestbookPending.length ? `${board.guestbookPending.length} awaiting moderation` : 'Queue clear'} />
          {board.guestbookPending.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Nothing waiting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {board.guestbookPending.map((g) => (
                <Row key={g.id} title={`${g.guest_name}`} sub={g.message}>
                  {canEdit && (
                    <>
                      <form action={approveGuestbook.bind(null, id, g.id)}>
                        <button type="submit" className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Approve
                        </button>
                      </form>
                      <form action={deleteGuestbook.bind(null, id, g.id)}>
                        <button type="submit" className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-400">
                          Delete
                        </button>
                      </form>
                    </>
                  )}
                </Row>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title={`Song requests (${board.songsApproved} published)`} desc={board.songsPending.length ? `${board.songsPending.length} awaiting moderation` : 'Queue clear'} />
          {board.songsPending.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Nothing waiting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {board.songsPending.map((s) => (
                <Row key={s.id} title={`${s.title} — ${s.guest_name}`} sub={s.created_at.slice(0, 10)}>
                  {canEdit && (
                    <>
                      <form action={approveSong.bind(null, id, s.id)}>
                        <button type="submit" className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Approve
                        </button>
                      </form>
                      <form action={deleteSong.bind(null, id, s.id)}>
                        <button type="submit" className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-400">
                          Delete
                        </button>
                      </form>
                    </>
                  )}
                </Row>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title={`Photos (${board.photosPending.length} waiting)`} desc="Approve to publish approved-public to the live wall." />
          {board.photosPending.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Nothing waiting.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {board.photosPending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                  <span className="truncate">{p.label ?? 'Guest photo'}</span>
                  {canEdit && (
                    <span className="flex gap-2">
                      <form action={approvePhoto.bind(null, id, p.id)}>
                        <button type="submit" className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Approve
                        </button>
                      </form>
                      <form action={deletePhoto.bind(null, id, p.id)}>
                        <button type="submit" className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-400">
                          Delete
                        </button>
                      </form>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Albums ({board.albums.length})</h3>
              <div className="mt-2">
                <AlbumForm weddingId={id} />
              </div>
              {board.albums.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {board.albums.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{a.title} · {a.count} photos</span>
                      <form action={deleteAlbum.bind(null, id, a.id)}>
                        <button type="submit" className="text-xs font-medium text-red-700 hover:underline dark:text-red-400">
                          Delete
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeading title={`Games (${board.games.length})`} desc="Shoe game, quiz, kids zone. Displayed on the website." />
          {board.games.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {board.games.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{g.title} <span className="text-xs text-zinc-500">· {g.kind}{g.is_active ? '' : ' · off'}</span></span>
                  {canEdit && (
                    <form action={deleteGame.bind(null, id, g.id)}>
                      <button type="submit" className="text-xs font-medium text-red-700 hover:underline dark:text-red-400">
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
              <GameForm weddingId={id} />
            </div>
          )}
        </Card>

        <Card>
          <SectionHeading title={`Time capsule (${board.capsuleCount} sealed)`} desc="Sealed until each note's open date, even when approved." />
          {board.capsulePending.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Nothing waiting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {board.capsulePending.map((c) => (
                <Row key={c.id} title={c.guest_name} sub={c.message}>
                  {canEdit && (
                    <>
                      <form action={approveCapsule.bind(null, id, c.id)}>
                        <button type="submit" className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Approve
                        </button>
                      </form>
                      <form action={deleteCapsule.bind(null, id, c.id)}>
                        <button type="submit" className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-400">
                          Delete
                        </button>
                      </form>
                    </>
                  )}
                </Row>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title="Vow keepsake" desc="Private to your team — never published." />
          <div className="mt-3">
            {canEdit ? (
              <VowForm
                weddingId={id}
                initial={{
                  text_a: board.vows?.text_a ?? '',
                  text_b: board.vows?.text_b ?? '',
                  shared: board.vows?.shared ?? '',
                }}
              />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Only planners and above can edit vows.</p>
            )}
          </div>
        </Card>
      </div>

      {canEdit && videos.length > 0 && (
        <Card>
          <div className="mt-6">
            <SectionHeading title="Welcome video" desc="Pick an approved video for the website hero." />
            <div className="mt-3 flex flex-wrap gap-2">
              {videos.map((v) => (
                <form key={v.id} action={setWelcomeVideo.bind(null, id, v.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-black/10 px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    {v.label ?? 'Video'}
                  </button>
                </form>
              ))}
              <form action={clearWelcomeVideo.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded-full border border-black/10 px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  None
                </button>
              </form>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}
