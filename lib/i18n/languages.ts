/**
 * i18n language registry — Phase 0 foundation.
 * Full translation dictionaries arrive in Phase 6.
 * 32 locales per PROJECT_SPEC.md §Multilingual.
 */

export interface LanguageMeta {
  code: string;
  label: string;
  rtl: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'fr', label: 'Français', rtl: false },
  { code: 'de', label: 'Deutsch', rtl: false },
  { code: 'es', label: 'Español', rtl: false },
  { code: 'it', label: 'Italiano', rtl: false },
  { code: 'pt', label: 'Português', rtl: false },
  { code: 'nl', label: 'Nederlands', rtl: false },
  { code: 'pl', label: 'Polski', rtl: false },
  { code: 'sv', label: 'Svenska', rtl: false },
  { code: 'da', label: 'Dansk', rtl: false },
  { code: 'nb', label: 'Norsk Bokmål', rtl: false },
  { code: 'fi', label: 'Suomi', rtl: false },
  { code: 'cs', label: 'Čeština', rtl: false },
  { code: 'sk', label: 'Slovenčina', rtl: false },
  { code: 'hu', label: 'Magyar', rtl: false },
  { code: 'ro', label: 'Română', rtl: false },
  { code: 'el', label: 'Ελληνικά', rtl: false },
  { code: 'ru', label: 'Русский', rtl: false },
  { code: 'uk', label: 'Українська', rtl: false },
  { code: 'tr', label: 'Türkçe', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'he', label: 'עברית', rtl: true },
  { code: 'fa', label: 'فارسی', rtl: true },
  { code: 'ur', label: 'اردو', rtl: true },
  { code: 'hi', label: 'हिन्दी', rtl: false },
  { code: 'bn', label: 'বাংলা', rtl: false },
  { code: 'ta', label: 'தமிழ்', rtl: false },
  { code: 'zh', label: '中文', rtl: false },
  { code: 'ja', label: '日本語', rtl: false },
  { code: 'ko', label: '한국어', rtl: false },
  { code: 'id', label: 'Bahasa Indonesia', rtl: false },
  { code: 'ms', label: 'Bahasa Melayu', rtl: false },
];

export const DEFAULT_LOCALE = 'en';
export const FALLBACK_LOCALE = 'en';

export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export function isRtlLocale(code: string): boolean {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.rtl ?? false;
}

/** Resolve order: guest override → wedding default → issuance hint → fallback. */
export function resolveLocale(args: {
  guestLocale?: string | null;
  weddingLocale?: string | null;
  hintLocale?: string | null;
}): string {
  if (args.guestLocale && isSupportedLocale(args.guestLocale)) return args.guestLocale;
  if (args.weddingLocale && isSupportedLocale(args.weddingLocale)) return args.weddingLocale;
  if (args.hintLocale && isSupportedLocale(args.hintLocale)) return args.hintLocale;
  return FALLBACK_LOCALE;
}
