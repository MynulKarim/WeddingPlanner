/**
 * Translation runtime — Phase 6.
 * Key-based lookup with English fallback, {var} interpolation, and
 * Intl-backed localized dates/times/numbers. Never throws: unknown locales
 * fall back to English, unknown keys echo the key.
 */
import { I18N_KEYS, type I18nKey, type LocaleDict } from '@/lib/i18n/keys';
import { isSupportedLocale } from '@/lib/i18n/languages';
import { en } from '@/lib/i18n/locales/en';
import { fr } from '@/lib/i18n/locales/fr';
import { de } from '@/lib/i18n/locales/de';
import { es } from '@/lib/i18n/locales/es';
import { it } from '@/lib/i18n/locales/it';
import { pt } from '@/lib/i18n/locales/pt';
import { nl } from '@/lib/i18n/locales/nl';
import { pl } from '@/lib/i18n/locales/pl';
import { sv } from '@/lib/i18n/locales/sv';
import { da } from '@/lib/i18n/locales/da';
import { nb } from '@/lib/i18n/locales/nb';
import { fi } from '@/lib/i18n/locales/fi';
import { cs } from '@/lib/i18n/locales/cs';
import { sk } from '@/lib/i18n/locales/sk';
import { hu } from '@/lib/i18n/locales/hu';
import { ro } from '@/lib/i18n/locales/ro';
import { el } from '@/lib/i18n/locales/el';
import { ru } from '@/lib/i18n/locales/ru';
import { uk } from '@/lib/i18n/locales/uk';
import { tr } from '@/lib/i18n/locales/tr';
import { ar } from '@/lib/i18n/locales/ar';
import { he } from '@/lib/i18n/locales/he';
import { fa } from '@/lib/i18n/locales/fa';
import { ur } from '@/lib/i18n/locales/ur';
import { hi } from '@/lib/i18n/locales/hi';
import { bn } from '@/lib/i18n/locales/bn';
import { ta } from '@/lib/i18n/locales/ta';
import { zh } from '@/lib/i18n/locales/zh';
import { ja } from '@/lib/i18n/locales/ja';
import { ko } from '@/lib/i18n/locales/ko';
import { id } from '@/lib/i18n/locales/id';
import { ms } from '@/lib/i18n/locales/ms';

const DICTS: Record<string, LocaleDict> = {
  en, fr, de, es, it, pt, nl, pl, sv, da, nb, fi, cs, sk, hu, ro, el,
  ru, uk, tr, ar, he, fa, ur, hi, bn, ta, zh, ja, ko, id, ms,
};

export function supportedDictLocales(): string[] {
  return Object.keys(DICTS);
}

/** Translate with English fallback + {var} interpolation. */
export function t(locale: string, key: I18nKey, vars?: Record<string, string>): string {
  const dict = DICTS[locale];
  let text = (dict?.[key] ?? en[key] ?? key) as string;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

/** Coverage report per locale (used by completeness checks). */
export function dictionaryCoverage(): { locale: string; translated: number; total: number }[] {
  return Object.entries(DICTS).map(([locale, dict]) => ({
    locale,
    translated: I18N_KEYS.filter((k) => {
      const v = dict[k];
      return typeof v === 'string' && v.trim().length > 0;
    }).length,
    total: I18N_KEYS.length,
  }));
}

function safeLocale(locale: string): string {
  return isSupportedLocale(locale) ? locale : 'en';
}

/**
 * Manual language override (?lang=xx). Returns the override when supported,
 * else the resolved fallback. Stateless and shareable.
 */
export function pickLangParam(
  param: string | string[] | undefined,
  fallback: string,
): string {
  const code = Array.isArray(param) ? param[0] : param;
  return code && isSupportedLocale(code) ? code : fallback;
}

/** Localized date+time, e.g. event start. Falls back gracefully. */
export function formatDateTime(locale: string, iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(safeLocale(locale), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Localized date (no time), e.g. deadlines. */
export function formatDate(locale: string, iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(safeLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Localized number, e.g. headcounts and stats. */
export function formatNumber(locale: string, value: number): string {
  try {
    return new Intl.NumberFormat(safeLocale(locale)).format(value);
  } catch {
    return String(value);
  }
}
