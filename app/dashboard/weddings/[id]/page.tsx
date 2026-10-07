import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole, listMembers } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { AddMemberForm } from './member-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WeddingDetailPage({ params }: Props) {
  const { id } = await params;

  let wedding;
  try {
    wedding = await getWedding(id);
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="rounded-xl border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4 text-sm text-red-900 dark:text-red-200">
          You do not have access to this wedding.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block underline underline-offset-4">
          ← All weddings
        </Link>
      </main>
    );
  }
  if (!wedding) notFound();

  const role = await getMyRole(id);
  const members = await listMembers(id);
  const canManage = role !== null && hasRoleAtLeast(role, 'admin');

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link href="/dashboard" className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← All weddings
      </Link>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl tracking-tight">{wedding.title}</h1>
        <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 font-mono text-xs">
          /w/{wedding.slug} · {role}
        </span>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Team</h2>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No members yet.</p>
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
            <AddMemberForm weddingId={wedding.id} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Only admins can invite team members.
          </p>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          { href: 'events', title: 'Events', desc: 'Ceremony, reception, parties' },
          { href: 'guests', title: 'Guests', desc: 'RSVP-ready guest hub' },
          { href: 'households', title: 'Households', desc: 'Families & couples' },
          { href: 'design', title: 'Design', desc: 'Theme, monogram, invitation' },
          { href: 'website', title: 'Website', desc: 'Public site, SEO, publish' },
          { href: 'rsvp', title: 'RSVP', desc: 'Links, responses, deadline' },
          { href: 'messages', title: 'Messages', desc: 'Email, SMS, templates' },
          { href: 'registry', title: 'Registry', desc: 'Gifts, funds, claims' },
          { href: 'seating', title: 'Seating', desc: 'Tables, chart, lookup' },
          { href: 'checklist', title: 'Checklist', desc: 'Tasks, starter plan' },
          { href: 'budget', title: 'Budget', desc: 'Expenses, categories' },
          { href: 'vendors', title: 'Vendors', desc: 'Contacts, payments' },
          { href: 'engage', title: 'Engage', desc: 'Guestbook, photos, games' },
          { href: 'stationery', title: 'Stationery', desc: 'Print-ready PDFs' },
          { href: 'activity', title: 'Activity', desc: 'Audit trail' },
          { href: 'settings', title: 'Settings', desc: 'Title, timezone, language' },
        ].map((c) => (
          <Link
            key={c.href}
            href={`/dashboard/weddings/${wedding.id}/${c.href}`}
            className="block rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 transition-shadow hover:shadow-md"
          >
            <p className="text-lg font-semibold">{c.title}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
