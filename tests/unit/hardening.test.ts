import { describe, expect, it, vi } from 'vitest';
import {
  canCreateWedding,
  guestHeadroom,
  isPlanId,
  planLabel,
  planLimits,
} from '@/lib/entitlements/plans';
import { logger } from '@/lib/observability/logger';
import { getAnalytics } from '@/lib/observability/analytics';
import { getEmailProvider, hasRealProviders } from '@/lib/communications/providers';

describe('entitlements', () => {
  it('reads plan tiers and unknown plans fall back to free', () => {
    expect(planLimits('free')).toEqual({ weddings: 1, guestsPerWedding: 100 });
    expect(planLimits('bogus')).toEqual(planLimits('free'));
    expect(isPlanId('plus')).toBe(true);
    expect(isPlanId('nope')).toBe(false);
    expect(planLabel('luxe')).toBe('Luxe');
  });

  it('gates wedding creation and guest headroom', () => {
    expect(canCreateWedding('free', 0)).toBe(true);
    expect(canCreateWedding('free', 1)).toBe(false);
    expect(canCreateWedding('plus', 4)).toBe(true);
    expect(canCreateWedding('plus', 5)).toBe(false);
    expect(guestHeadroom('free', 90)).toBe(10);
    expect(guestHeadroom('free', 150)).toBe(0);
  });
});

describe('observability', () => {
  it('logs structured JSON lines', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logger.info('hello', { a: 1 });
    const line = spy.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toMatchObject({ level: 'info', msg: 'hello', a: 1 });
    spy.mockRestore();
  });

  it('selects noop providers without credentials', () => {
    expect(getEmailProvider().name).toBe('noop-email');
    expect(hasRealProviders()).toEqual({ email: false, sms: false });
    expect(getAnalytics().name).toBe('noop-analytics');
  });
});
