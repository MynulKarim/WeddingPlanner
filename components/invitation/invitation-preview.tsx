'use client';

import type { CSSProperties } from 'react';
import { themeToCssVars, type ThemeTokens } from '@/lib/themes/tokens';
import { t } from '@/lib/i18n/dict';
import type { SectionConfig } from '@/lib/invitation/sections';
import { sectionLabel } from '@/lib/invitation/sections';
import { MonogramMark } from '@/components/monogram/monogram-mark';
import type { MonogramRow } from '@/lib/db/design';
import type { EventRow } from '@/lib/db/events';

export type PreviewViewport = 'desktop' | 'mobile';

export interface PreviewData {
  weddingTitle: string;
  locale: string;
  theme: ThemeTokens;
  sections: SectionConfig[];
  events: EventRow[];
  monogram: MonogramRow | null;
  coverUrl: string | null;
}

/**
 * Live invitation preview — Phase 3.
 * Renders enabled sections in order under the wedding's resolved theme.
 * Section content here is representative; the full website builder (Phase 4)
 * expands each section with real data + editing.
 */
export function InvitationPreview({ data }: { data: PreviewData }) {
  const vars = themeToCssVars(data.theme) as CSSProperties;
  const enabled = data.sections.filter((s) => s.enabled);
  return (
    <div
      className="wp-theme overflow-hidden"
      style={{
        ...vars,
        background: 'var(--wp-background)',
        color: 'var(--wp-ink)',
        fontFamily: 'var(--wp-font-body)',
        borderRadius: 'var(--wp-radius)',
      }}
    >
      {enabled.length === 0 && (
        <p className="p-10 text-center" style={{ color: 'var(--wp-muted)' }}>
          All sections are disabled — enable at least one to preview.
        </p>
      )}
      {enabled.map((s) => (
        <PreviewSection key={s.id} id={s.id} data={data} />
      ))}
    </div>
  );
}

function PreviewSection({ id, data }: { id: string; data: PreviewData }) {
  const locale = data.locale;
  const display: CSSProperties = { fontFamily: 'var(--wp-font-display)' };
  const muted: CSSProperties = { color: 'var(--wp-muted)' };
  const accentBg: CSSProperties = {
    background: 'var(--wp-accent)',
    color: 'var(--wp-accent-ink)',
  };

  switch (id) {
    case 'hero':
      return (
        <div className="px-6 py-14 text-center">
          {data.monogram && (
            <div className="mb-5 flex justify-center">
              <MonogramMark
                initials={data.monogram.initials}
                style={data.monogram.style}
                shape={data.monogram.shape}
                accent={data.theme.colors.accent}
                ink={data.theme.colors.ink}
                size={88}
              />
            </div>
          )}
          <p className="text-xs uppercase" style={{ ...muted, letterSpacing: '0.3em' }}>
            {t(locale, 'invite.kicker')}
          </p>
          <h1 className="mt-3 text-4xl leading-tight" style={display}>
            {data.weddingTitle}
          </h1>
          <p className="mt-3 text-sm" style={muted}>
            Request the honour of your presence
          </p>
        </div>
      );
    case 'message':
      return (
        <div className="px-6 py-8 text-center">
          <p className="mx-auto max-w-md text-lg leading-8" style={display}>
            {t(locale, 'site.message')}
          </p>
        </div>
      );
    case 'couple':
      return (
        <div className="px-6 py-8 text-center">
          <SectionKicker label={sectionLabel(id)} />
          <p className="mt-2 text-2xl" style={display}>
            {data.weddingTitle}
          </p>
        </div>
      );
    case 'events':
      return (
        <div className="px-6 py-8">
          <div className="text-center">
            <SectionKicker label={sectionLabel(id)} />
          </div>
          {data.events.length === 0 ? (
            <p className="mt-3 text-center text-sm" style={muted}>
              {t(locale, 'site.eventsEmpty')}
            </p>
          ) : (
            <ul className="mx-auto mt-4 flex max-w-md flex-col gap-3">
              {data.events.slice(0, 6).map((e) => (
                <li
                  key={e.id}
                  className="wp-motion px-5 py-4 text-center"
                  style={{
                    background: 'var(--wp-surface)',
                    borderRadius: 'var(--wp-radius)',
                    border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                  }}
                >
                  <p className="text-lg" style={display}>
                    {e.name}
                  </p>
                  <p className="mt-1 text-xs" style={muted}>
                    {[e.starts_at ? new Date(e.starts_at).toLocaleDateString() : null, e.venue]
                      .filter(Boolean)
                      .join(' · ') || 'Details to follow'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case 'venue':
      return (
        <div className="px-6 py-8 text-center">
          <SectionKicker label={sectionLabel(id)} />
          <p className="mt-2 text-sm" style={muted}>
            {t(locale, 'site.venueEmpty')}
          </p>
        </div>
      );
    case 'gallery':
      return (
        <div className="px-6 py-8 text-center">
          <SectionKicker label={sectionLabel(id)} />
          {data.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverUrl}
              alt="Wedding cover"
              className="mx-auto mt-4 max-h-72 object-cover"
              style={{ borderRadius: 'var(--wp-radius)' }}
            />
          ) : (
            <p className="mt-2 text-sm" style={muted}>
              {t(locale, 'site.galleryHint')}
            </p>
          )}
        </div>
      );
    case 'rsvp':
      return (
        <div className="px-6 py-10 text-center">
          <p className="text-2xl" style={display}>
            {t(locale, 'site.joinTitle')}
          </p>
          <span
            className="wp-motion mt-4 inline-block px-8 py-3 text-sm font-medium"
            style={{ ...accentBg, borderRadius: 'var(--wp-radius)' }}
          >
            {t(locale, 'invite.rsvp')}
          </span>
          <p className="mt-3 text-sm" style={muted}>
            {t(locale, 'site.useLink')}
          </p>
        </div>
      );
    case 'footer':
      return (
        <div className="px-6 py-8 text-center">
          <p className="text-xs uppercase" style={{ ...muted, letterSpacing: '0.25em' }}>
            {data.weddingTitle}
          </p>
        </div>
      );
    default:
      return (
        <div className="px-6 py-6 text-center">
          <p className="text-sm" style={muted}>
            Custom section: {sectionLabel(id)}
          </p>
        </div>
      );
  }
}

function SectionKicker({ label }: { label: string }) {
  return (
    <p className="text-xs uppercase" style={{ color: 'var(--wp-accent)', letterSpacing: '0.3em' }}>
      {label}
    </p>
  );
}
