import { describe, expect, it } from 'vitest';
import { isMissingFunction, isSchemaCacheMiss, pendingMigrationMessage } from '@/lib/db/schema-guard';

describe('schema guard', () => {
  it('detects missing-table cache misses and nothing else', () => {
    expect(
      isSchemaCacheMiss({
        code: 'PGRST205',
        message: "Could not find the table 'public.vendor_payments' in the schema cache",
      }),
    ).toBe(true);
    expect(isSchemaCacheMiss({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isSchemaCacheMiss(null)).toBe(false);
    expect(isSchemaCacheMiss(undefined)).toBe(false);
    expect(pendingMigrationMessage('0017_vendor_payments.sql')).toContain('0017_vendor_payments.sql');
  });

  it('detects missing RPC functions and nothing else', () => {
    expect(
      isMissingFunction({
        message: 'Could not find the function public.claim_due_messages(p_now, p_limit) in the schema cache',
      }),
    ).toBe(true);
    expect(isMissingFunction({ message: 'permission denied for function' })).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
  });
});
