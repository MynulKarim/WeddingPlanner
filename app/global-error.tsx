'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/observability/errors';

/**
 * Root error boundary — Phase 13. Catches render-time crashes, reports
 * them through the error monitor, and offers recovery without a dead tab.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="font-serif text-3xl">Something went wrong</p>
          <p className="mt-3 text-sm text-zinc-600">
            We&apos;ve noted the problem. Try again — your data is safe.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
