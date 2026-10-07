import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';

describe('cron auth', () => {
  const secret = 's3cr3t-value-123';

  it('accepts the exact bearer secret', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('rejects wrong, missing, and malformed credentials', () => {
    expect(isAuthorizedCronRequest('Bearer wrong', secret)).toBe(false);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false);
    expect(isAuthorizedCronRequest('Basic abc', secret)).toBe(false);
    expect(isAuthorizedCronRequest('Bearer ', secret)).toBe(false);
  });

  it('refuses to run when no secret is configured', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, undefined)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, '')).toBe(false);
  });
});
