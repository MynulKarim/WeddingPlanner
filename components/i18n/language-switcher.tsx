'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import { t } from '@/lib/i18n/dict';

/**
 * Manual language override (?lang=xx). Stateless and shareable — a guest can
 * view any page in any supported language regardless of their stored locale.
 */
export function LanguageSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function setLocale(code: string) {
    const next = new URLSearchParams(params.toString());
    if (code) next.set('lang', code);
    else next.delete('lang');
    const query = next.toString();
    router.push(`${window.location.pathname}${query ? `?${query}` : ''}`);
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--wp-muted)' }}>
      {t(current, 'site.language')}
      <select
        value={current}
        onChange={(e) => setLocale(e.target.value)}
        aria-label={t(current, 'site.language')}
        className="rounded-lg border bg-transparent px-2 py-1 text-sm outline-none"
        style={{ borderColor: 'color-mix(in srgb, var(--wp-muted) 40%, transparent)', color: 'var(--wp-ink)' }}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
