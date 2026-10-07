import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';

const NAV = [
  { href: '', label: 'Check-in' },
  { href: '/scan', label: 'Scan' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/announcements', label: 'Updates' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/photos', label: 'Photos' },
];

/**
 * Staff-mode shell — Phase 11. Minimal chrome, thumb-sized targets,
 * readable at arm's length on phones and tablets.
 */
export default async function DayOfLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/day-of" className="text-lg font-semibold" aria-label="All weddings">
            ←
          </Link>
          <p className="truncate font-serif text-lg">{wedding.title}</p>
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest dark:bg-white/10">
            Staff
          </span>
        </div>
        <nav className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-4 pb-3" aria-label="Day-of">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`/day-of/${weddingId}${n.href}`}
              className="whitespace-nowrap rounded-full bg-black/5 px-4 py-2 text-sm font-medium dark:bg-white/10"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 pb-16">{children}</div>
    </div>
  );
}
