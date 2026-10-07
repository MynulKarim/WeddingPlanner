import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole, listMembers } from '@/lib/db/weddings';
import { listPendingInvites, revokeInvite } from '@/lib/db/team-invites';
import { getAdminLocale } from '@/lib/db/profile';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { t } from '@/lib/i18n/dict';
import type { I18nKey } from '@/lib/i18n/keys';
import { AddMemberForm } from './member-form';

interface Props {
  params: Promise<{ id: string }>;
}

const NAV = [
  'events',
  'guests',
  'households',
  'design',
  'website',
  'rsvp',
  'messages',
  'registry',
  'seating',
  'checklist',
  'budget',
  'vendors',
  'engage',
  'stationery',
  'activity',
  'settings',
] as const;

export default async function WeddingDetailPage({ params }: Props) {
  const { id } = await params;
  const adminLocale = await getAdminLocale();

  let wedding;
  try {
    wedding = await getWedding(id);
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="rounded-xl border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4 text-sm text-red-900 dark:text-red-200">
          {t(adminLocale, 'dash.noAccess')}
        </p>
        <Link href="/dashboard" className="mt-4 inline-block underline underline-offset-4">
          ← {t(adminLocale, 'dash.allWeddings')}
        </Link>
      </main>
    );
  }
  if (!wedding) notFound();

  const role = await getMyRole(id);
  const members = await listMembers(id);
  const canManage = role !== null && hasRoleAtLeast(role, 'admin');
  const pending = canManage ? await listPendingInvites(id).catch(() => []) : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link href="/dashboard" className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← {t(adminLocale, 'dash.allWeddings')}
      </Link>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl tracking-tight">{wedding.title}</h1>
        <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 font-mono text-xs">
          /w/{wedding.slug} · {role}
        </span>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t(adminLocale, 'dash.team')}</h2>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t(adminLocale, 'dash.noMembers')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-xs">{m.user_id.slice(0, 8)}…</span>
                <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-xs font-medium">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <div className="mt-4">
            <AddMemberForm weddingId={wedding.id} inviteLabel={t(adminLocale, 'dash.invite')} />
            {pending.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium">{t(adminLocale, 'dash.pendingInvites')} ({pending.length})</p>
                <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
                  {pending.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span>{p.email} <span className="text-xs text-zinc-500">· {p.role}</span></span>
                      <form action={revokeInvite.bind(null, id, p.id)}>
                        <button type="submit" className="text-xs font-medium text-red-700 hover:underline dark:text-red-400">
                          {t(adminLocale, 'dash.revoke')}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {t(adminLocale, 'dash.onlyAdminsInvite')}
          </p>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {NAV.map((key) => (
          <Link
            key={key}
            href={`/dashboard/weddings/${wedding.id}/${key}`}
            className="block rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 transition-shadow hover:shadow-md"
          >
            <p className="text-lg font-semibold">{t(adminLocale, `dash.nav.${key}` as I18nKey)}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t(adminLocale, `dash.desc.${key}` as I18nKey)}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
