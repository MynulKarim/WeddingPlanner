/**
 * Product analytics abstraction — Phase 13.
 * NoOp by default; PostHog HTTP capture when POSTHOG_KEY is configured.
 * Key lifecycle events only — never guest PII beyond anonymous ids.
 */

export interface AnalyticsEvent {
  event: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsProvider {
  readonly name: string;
  track(evt: AnalyticsEvent): Promise<void>;
}

class NoOpAnalytics implements AnalyticsProvider {
  readonly name = 'noop-analytics';
  async track(evt: AnalyticsEvent): Promise<void> {
    console.log('[analytics:noop]', evt.event, evt.properties ?? {});
  }
}

class PostHogAnalytics implements AnalyticsProvider {
  readonly name = 'posthog';
  constructor(
    private apiKey: string,
    private host: string,
  ) {}

  async track(evt: AnalyticsEvent): Promise<void> {
    const res = await fetch(`${this.host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        event: evt.event,
        distinct_id: evt.distinctId ?? 'server',
        properties: evt.properties ?? {},
      }),
    });
    if (!res.ok) throw new Error(`Analytics capture failed (${res.status}).`);
  }
}

export function getAnalytics(): AnalyticsProvider {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.POSTHOG_KEY ?? '';
  if (key) {
    return new PostHogAnalytics(
      key,
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    );
  }
  return new NoOpAnalytics();
}

/** Fire-and-forget lifecycle tracking (never throws, never blocks). */
export function trackEvent(evt: AnalyticsEvent): void {
  getAnalytics()
    .track(evt)
    .catch(() => undefined);
}
