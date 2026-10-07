import { describe, expect, it } from 'vitest';
import { validateWeddingInput } from '@/validations/wedding';
import { resolveLocale, isRtlLocale } from '@/lib/i18n/languages';
import {
  generateInvitationToken,
  isPlausibleInvitationToken,
} from '@/lib/security/invitation-token';

describe('wedding input validation', () => {
  it('flags missing title, bad slug, missing timezone', () => {
    expect(
      validateWeddingInput({ title: '', slug: 'Bad Slug', timezone: '' }),
    ).toHaveLength(3);
    expect(
      validateWeddingInput({ title: 'A & K', slug: 'a-k', timezone: 'UTC' }),
    ).toHaveLength(0);
  });
});

describe('locale resolution', () => {
  it('prefers guest locale, then wedding default, then fallback', () => {
    expect(resolveLocale({ guestLocale: 'bn', weddingLocale: 'en' })).toBe('bn');
    expect(resolveLocale({ guestLocale: null, weddingLocale: 'ar' })).toBe('ar');
    expect(resolveLocale({ guestLocale: 'xx', weddingLocale: null })).toBe('en');
  });

  it('knows RTL locales', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
  });
});

describe('invitation tokens', () => {
  it('generates plausible opaque tokens', () => {
    const token = generateInvitationToken();
    expect(isPlausibleInvitationToken(token)).toBe(true);
    expect(isPlausibleInvitationToken('123')).toBe(false);
  });
});
