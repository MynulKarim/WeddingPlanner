/**
 * Error monitoring abstraction — Phase 13.
 * Console provider by default; a Sentry DSN documents the upgrade path
 * (dynamic import keeps the dependency optional until then).
 */

export interface ErrorReport {
  error: unknown;
  context?: Record<string, unknown>;
}

export interface ErrorMonitor {
  readonly name: string;
  capture(report: ErrorReport): void;
}

class ConsoleErrorMonitor implements ErrorMonitor {
  readonly name = 'console';
  capture({ error, context }: ErrorReport): void {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        msg: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.slice(0, 2000) : undefined,
        ...context,
      }),
    );
  }
}

export function getErrorMonitor(): ErrorMonitor {
  // SENTRY_DSN wiring: install @sentry/nextjs, replace this branch with the
  // SDK capture. Until then every error still lands in structured logs.
  void process.env.SENTRY_DSN;
  return new ConsoleErrorMonitor();
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  try {
    getErrorMonitor().capture({ error, context });
  } catch {
    // Monitoring must never break the request path.
  }
}
