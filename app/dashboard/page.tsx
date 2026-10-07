import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';
import { listMyWeddings } from '@/lib/db/weddings';
import { getAccountUsage } from '@/lib/db/account';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Couple dashboard</h1>
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4 text-sm text-amber-900 dark:text-amber-200">
          Supabase is not configured yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code> (see{' '}
          <code>docs/supabase-setup.md</code>), then sign in.
        </p>
        <Link href="/login" className="mt-6 inline-block underline underline-offset-4">
          Go to sign in
        </Link>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect('/login');

  const weddings = await listMyWeddings();
  const usage = await getAccountUsage();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8a6d3b] dark:text-[#c9a96a]">Ever After</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your weddings</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
          {usage && (
            <p className="mt-1 inline-block rounded-full bg-black/5 px-3 py-1 font-mono text-xs dark:bg-white/10">
              {usage.planLabel} plan · {usage.weddings} wedding{usage.weddings === 1 ? '' : 's'} · {usage.guests} guests
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/profile"
            className="rounded-full border border-black/10 dark:border-white/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            Profile
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-black/10 dark:border-white/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/dashboard/weddings/new"
          className="inline-block rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200"
        >
          + New wedding
        </Link>
      </div>

      {weddings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center">
          <p className="text-lg font-medium">No weddings yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create your first wedding — you will become its owner.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {weddings.map((w) => (
            <li key={w.id}>
              <Link
                href={`/dashboard/weddings/${w.id}`}
                className="block rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 transition-shadow hover:shadow-md"
              >
                <p className="font-serif text-xl">{w.title}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">/w/{w.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
