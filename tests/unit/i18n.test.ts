import { describe, expect, it } from 'vitest';
import { I18N_KEYS } from '@/lib/i18n/keys';
import {
  dictionaryCoverage,
  formatDate,
  formatDateTime,
  formatNumber,
  pickLangParam,
  supportedDictLocales,
  t,
} from '@/lib/i18n/dict';
import {
  isRtlLocale,
  isSupportedLocale,
  resolveLocale,
  SUPPORTED_LANGUAGES,
} from '@/lib/i18n/languages';

describe('translation completeness', () => {
  it('covers every key in all 32 locales with no extras', () => {
    expect(supportedDictLocales()).toHaveLength(32);
    expect(new Set(supportedDictLocales()).size).toBe(32);
    for (const { locale, translated, total } of dictionaryCoverage()) {
      expect(total, locale).toBe(I18N_KEYS.length);
      expect(translated, locale).toBe(total);
    }
  });

  it('registers exactly the framework locales', () => {
    const framework = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));
    expect(new Set(supportedDictLocales())).toEqual(framework);
  });
});

describe('translation fallback', () => {
  it('falls back to English for unknown locales and echoes keys', () => {
    expect(t('xx', 'invite.send')).toBe(t('en', 'invite.send'));
    expect(t('xx', 'nonexistent' as never)).toBe('nonexistent');
  });

  it('interpolates variables', () => {
    expect(t('en', 'invite.dear', { name: 'Salma' })).toBe('Dear Salma');
    expect(t('bn', 'invite.dear', { name: 'Salma' })).toContain('Salma');
  });

  it('translates across scripts', () => {
    expect(t('ar', 'invite.send')).not.toBe(t('en', 'invite.send'));
    expect(t('ja', 'invite.send')).not.toBe(t('en', 'invite.send'));
    expect(t('bn', 'invite.send')).not.toBe(t('en', 'invite.send'));
  });
});

describe('locale resolution', () => {
  it('orders manual override, guest, wedding, fallback', () => {
    expect(
      resolveLocale({ guestLocale: 'bn', weddingLocale: 'en' }),
    ).toBe('bn');
    expect(pickLangParam('ar', 'bn')).toBe('ar');
    expect(pickLangParam('xx', 'bn')).toBe('bn');
    expect(pickLangParam(undefined, 'en')).toBe('en');
    expect(isSupportedLocale('ta')).toBe(true);
    expect(isSupportedLocale('xx')).toBe(false);
  });

  it('demotes the issuance hint below guest and wedding locales', () => {
    expect(resolveLocale({ weddingLocale: 'bn', hintLocale: 'en' })).toBe('bn');
    expect(resolveLocale({ hintLocale: 'ar' })).toBe('ar');
    expect(resolveLocale({ hintLocale: 'xx' })).toBe('en');
  });
});

describe('RTL support', () => {
  it('flags exactly the RTL locales', () => {
    const rtl = SUPPORTED_LANGUAGES.filter((l) => isRtlLocale(l.code)).map((l) => l.code);
    expect(new Set(rtl)).toEqual(new Set(['ar', 'he', 'fa', 'ur']));
  });
});

describe('localized dates, times, and numbers', () => {
  const iso = '2027-02-14T16:00:00.000Z';

  it('formats differently per locale', () => {
    const enDate = formatDateTime('en', iso) as string;
    const bnDate = formatDateTime('bn', iso) as string;
    const arDate = formatDateTime('ar', iso) as string;
    expect(enDate).toContain('2027');
    expect(bnDate).not.toBe(enDate);
    expect(arDate).not.toBe(enDate);
    expect(formatDate('ja', iso)).toContain('2027');
    expect(formatDateTime('en', null)).toBeNull();
  });

  it('localizes digits per numbering system', () => {
    expect(formatNumber('en', 1234)).toBe('1,234');
    // Bengali and Persian default to non-Latin digits.
    expect(formatNumber('bn', 1234)).not.toBe('1,234');
    expect(formatNumber('fa', 1234)).not.toBe('1,234');
  });
});
