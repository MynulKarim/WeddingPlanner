import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { listMyWeddings } from '@/lib/db/weddings';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Staff mode entry — Phase 11.
 * Simplified ops surface: pick a wedding, then check in guests. Big touch
 * targets, no dashboard chrome. Any member role (staff+) may operate;
 * planning mutations elsewhere stay planner-gated.
 */
export default async function DayOfIndex() {
  if (!isSupabaseConfigured()) redirect('/login');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const weddings = await listMyWeddings();

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Staff mode</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Today&apos;s weddings</h1>
      {weddings.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          No weddings assigned to you yet.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {weddings.map((w) => (
            <li key={w.id}>
              <Link
                href={`/day-of/${w.id}`}
                className="block rounded-2xl border border-black/10 bg-white p-6 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
              >
                <p className="font-serif text-2xl">{w.title}</p>
                <p className="mt-1 text-sm text-zinc-500">Tap to open check-in →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
