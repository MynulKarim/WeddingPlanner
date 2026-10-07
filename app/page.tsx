import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f4] dark:bg-zinc-950 font-sans text-[#1a1a1a] dark:text-zinc-100 antialiased">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#8a6d3b] dark:text-[#c9a96a]">
          Luxury wedding studio
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-tight tracking-tight">
          Ever After
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Invitations, websites, RSVP, and day-of operations — powerful enough
          for complex weddings, simple enough for a non-technical couple.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-full bg-[#1a1a1a] dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-black dark:hover:bg-zinc-200"
          >
            Couple dashboard
          </Link>
          <Link
            href="/w/demo"
            className="rounded-full border border-black/10 dark:border-white/10 px-6 py-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            View sample website
          </Link>
        </div>
        <p className="mt-10 font-mono text-xs text-zinc-400">
          Phase 0 — foundation only · /api/health
        </p>
      </main>
    </div>
  );
}
