/**
 * Public website renderer — Phase 4, localized in Phase 6 (server only:
 * zero client JavaScript on guest pages for mobile-network performance).
 * Renders enabled website sections in order under the resolved theme.
 * Engagement sections (guestbook, photo wall, songs, games) and RSVP render
 * as tasteful placeholders until their phases ship.
 */
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import { themeToCssVars, type ThemeTokens } from '@/lib/themes/tokens';
import { sectionLabel, type SectionConfig } from '@/lib/invitation/sections';
import type { WebsiteContent } from '@/lib/website/content';
import { formatDateTime, t } from '@/lib/i18n/dict';
import { isRtlLocale } from '@/lib/i18n/languages';
import { MonogramMark } from '@/components/monogram/monogram-mark';
import { RegistryCard } from '@/components/website/registry-card';
import {
  CapsuleForm,
  GuestbookForm,
  PhotoUploadForm,
  SongForm,
} from '@/components/website/engagement-forms';
import { PhotoWallLive } from '@/components/website/photo-wall';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';

export interface WebsiteViewData {
  weddingId: string;
  weddingTitle: string;
  theme: ThemeTokens;
  locale: string;
  sections: SectionConfig[];
  content: WebsiteContent;
  events: {
    id: string;
    name: string;
    starts_at: string | null;
    timezone: string;
    venue: string | null;
    address: string | null;
    description: string | null;
    dress_code: string | null;
  }[];
  monogram: { initials: string; style: string; shape: string } | null;
  gallery: { id: string; url: string; label: string | null }[];
  guestbook: { guest_name: string; message: string }[];
  songs: { guest_name: string; title: string; artist: string; message: string }[];
  games: { kind: string; title: string; description: string }[];
  capsule: { guest_name: string; message: string }[];
  welcomeVideoUrl: string | null;
  registry: RegistryDisplayItem[];
}

export interface RegistryDisplayItem {
  id: string;
  kind: string;
  title: string;
  description: string;
  amount_cents: number | null;
  currency: string;
  external_url: string | null;
  image_url: string | null;
  quantity_total: number | null;
  quantity_claimed: number;
  raised_cents: number;
}

export function WebsiteView({ data }: { data: WebsiteViewData }) {
  const vars = themeToCssVars(data.theme) as CSSProperties;
  const enabled = data.sections.filter((s) => s.enabled);
  return (
    <div
      className="wp-theme min-h-screen"
      lang={data.locale}
      dir={isRtlLocale(data.locale) ? 'rtl' : 'ltr'}
      style={{
        ...vars,
        background: 'var(--wp-background)',
        color: 'var(--wp-ink)',
        fontFamily: 'var(--wp-font-body)',
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-8">
        {enabled.map((s) => (
          <WebsiteSection key={s.id} id={s.id} data={data} />
        ))}
        <div className="flex justify-center pt-6">
          <Suspense>
            <LanguageSwitcher current={data.locale} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function Kicker({ label }: { label: string }) {
  return (
    <p
      className="text-xs uppercase"
      style={{ color: 'var(--wp-accent)', letterSpacing: '0.3em' }}
    >
      {label}
    </p>
  );
}

function WebsiteSection({ id, data }: { id: string; data: WebsiteViewData }) {
  const locale = data.locale;
  const display: CSSProperties = { fontFamily: 'var(--wp-font-display)' };
  const muted: CSSProperties = { color: 'var(--wp-muted)' };
  const c = data.content;

  switch (id) {
    case 'hero': {
      const names =
        c.partnerA || c.partnerB
          ? [c.partnerA, c.partnerB].filter(Boolean).join(' & ')
          : data.weddingTitle;
      return (
        <header className="py-16 text-center sm:py-24">
          {data.monogram && (
            <div className="mb-6 flex justify-center">
              <MonogramMark
                initials={data.monogram.initials}
                style={data.monogram.style as 'serif' | 'script' | 'modern' | 'traditional'}
                shape={data.monogram.shape as 'seal' | 'crest' | 'minimal'}
                accent={data.theme.colors.accent}
                ink={data.theme.colors.ink}
                size={104}
              />
            </div>
          )}
          <Kicker label={c.tagline || t(locale, 'site.tagline')} />
          <h1 className="mt-4 text-5xl leading-tight" style={display}>
            {names}
          </h1>
          {data.welcomeVideoUrl && (
            <video
              src={data.welcomeVideoUrl}
              controls
              preload="metadata"
              className="mx-auto mt-8 max-h-96 w-full max-w-xl"
              style={{ borderRadius: 'var(--wp-radius)' }}
            />
          )}
        </header>
      );
    }
    case 'message':
      return (
        <section className="py-8 text-center">
          <p className="mx-auto max-w-xl text-xl leading-9" style={display}>
            {t(locale, 'site.message')}
          </p>
        </section>
      );
    case 'couple': {
      const names =
        c.partnerA || c.partnerB
          ? [c.partnerA, c.partnerB].filter(Boolean).join(' & ')
          : data.weddingTitle;
      return (
        <section className="py-10 text-center">
          <Kicker label={sectionLabel(id)} />
          <p className="mt-3 text-3xl" style={display}>
            {names}
          </p>
        </section>
      );
    }
    case 'story':
      if (!c.story) return null;
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-center leading-8">
            {c.story}
          </p>
        </section>
      );
    case 'events':
      if (data.events.length === 0) return null;
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-4">
            {data.events.map((e) => {
              const when = formatDateTime(locale, e.starts_at);
              return (
                <li
                  key={e.id}
                  className="px-6 py-6"
                  style={{
                    background: 'var(--wp-surface)',
                    borderRadius: 'var(--wp-radius)',
                    border:
                      '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                  }}
                >
                  <p className="text-center text-2xl" style={display}>
                    {e.name}
                  </p>
                  {when && (
                    <p className="mt-1 text-center text-sm" style={muted}>
                      {when}
                    </p>
                  )}
                  {[e.venue, e.address].filter(Boolean).length > 0 && (
                    <p className="mt-2 text-center text-sm">
                      {[e.venue, e.address].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {e.description && (
                    <p className="mt-2 text-center text-sm leading-6" style={muted}>
                      {e.description}
                    </p>
                  )}
                  {e.dress_code && (
                    <p className="mt-2 text-center text-xs uppercase tracking-widest" style={muted}>
                      {t(locale, 'invite.dressCode', { code: e.dress_code })}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      );
    case 'schedule': {
      const timed = data.events.filter((e) => e.starts_at);
      if (timed.length === 0) return null;
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <ol className="mx-auto mt-6 max-w-xl">
            {timed.map((e) => (
              <li key={e.id} className="flex gap-4 py-3">
                <span className="w-28 shrink-0 text-right text-sm font-medium">
                  {formatDateTime(locale, e.starts_at)?.split('·')[1]?.trim() ??
                    formatDateTime(locale, e.starts_at)}
                </span>
                <span
                  className="w-px shrink-0"
                  style={{ background: 'var(--wp-accent)' }}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-lg" style={display}>
                    {e.name}
                  </span>
                  {e.venue && (
                    <span className="block text-sm" style={muted}>
                      {e.venue}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      );
    }
    case 'venue': {
      const blocks: { text: string }[] = [
        ...(c.venueNote ? [{ text: c.venueNote }] : []),
        ...(c.directions ? [{ text: c.directions }] : []),
        ...(c.transportation ? [{ text: c.transportation }] : []),
        ...(c.parking ? [{ text: c.parking }] : []),
        ...(c.airport ? [{ text: c.airport }] : []),
      ];
      const eventPlaces = data.events.some((e) => e.venue || e.address);
      if (blocks.length === 0 && !eventPlaces && !c.mapUrl) return null;
      return (
        <section className="py-10 text-center">
          <Kicker label={sectionLabel(id)} />
          {blocks.map((b, i) => (
            <p key={i} className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-8">
              {b.text}
            </p>
          ))}
          {eventPlaces && (
            <ul className="mx-auto mt-4 max-w-xl text-sm" style={muted}>
              {data.events
                .filter((e) => e.venue || e.address)
                .map((e) => (
                  <li key={e.id} className="mt-1">
                    {e.name}: {[e.venue, e.address].filter(Boolean).join(' · ')}
                  </li>
                ))}
            </ul>
          )}
          {c.mapUrl && (
            <div className="mx-auto mt-6 max-w-xl">
              <a
                href={c.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-4"
              >
                View map
              </a>
              <iframe
                title="Wedding map"
                src={c.mapUrl}
                loading="lazy"
                className="mt-3 h-64 w-full border-0"
                style={{ borderRadius: 'var(--wp-radius)' }}
              />
            </div>
          )}
        </section>
      );
    }
    case 'travel':
      if (!c.travel) return null;
      return (
        <section className="py-10 text-center">
          <Kicker label={sectionLabel(id)} />
          <p className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-8">{c.travel}</p>
        </section>
      );
    case 'accommodation':
      if (!c.accommodation) return null;
      return (
        <section className="py-10 text-center">
          <Kicker label={sectionLabel(id)} />
          <p className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-8">{c.accommodation}</p>
        </section>
      );
    case 'menu':
      if (!c.menuNote && !c.dietaryNote) return null;
      return (
        <section className="py-10 text-center">
          <Kicker label={sectionLabel(id)} />
          {c.menuNote && (
            <p className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-8">{c.menuNote}</p>
          )}
          {c.dietaryNote && (
            <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm leading-7" style={muted}>
              {c.dietaryNote}
            </p>
          )}
          <p className="mx-auto mt-3 max-w-xl text-sm" style={muted}>
            {t(locale, 'site.menuDiet')}
          </p>
        </section>
      );
    case 'faq':
      if (!c.faq || c.faq.length === 0) return null;
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <dl className="mx-auto mt-6 flex max-w-xl flex-col gap-4">
            {c.faq.map((f, i) => (
              <div
                key={i}
                className="px-6 py-5"
                style={{
                  background: 'var(--wp-surface)',
                  borderRadius: 'var(--wp-radius)',
                  border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                }}
              >
                <dt className="text-lg" style={display}>
                  {f.q}
                </dt>
                <dd className="mt-1 text-sm leading-7" style={muted}>
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case 'registry':
      if (data.registry.length === 0) {
        return (
          <section className="py-10 text-center">
            <Kicker label={sectionLabel(id)} />
            {c.registryNote ? (
              <p className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-8">{c.registryNote}</p>
            ) : (
              <p className="mx-auto mt-4 max-w-xl text-sm" style={muted}>
                {t(locale, 'site.registrySoon')}
              </p>
            )}
          </section>
        );
      }
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
            {c.registryNote && (
              <p className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-8">{c.registryNote}</p>
            )}
          </div>
          <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-4">
            {data.registry.map((item) => (
              <RegistryCard key={item.id} item={item} locale={locale} weddingId={data.weddingId} />
            ))}
          </ul>
        </section>
      );
    case 'gallery':
      if (data.gallery.length === 0) return null;
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            {data.gallery.map((g) => (
              <figure
                key={g.id}
                className="overflow-hidden"
                style={{ borderRadius: 'var(--wp-radius)' }}
              >
                <Image
                  src={g.url}
                  alt={g.label ?? 'Wedding photo'}
                  width={600}
                  height={600}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </figure>
            ))}
          </div>
        </section>
      );
    case 'guestbook':
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          {data.guestbook.length > 0 && (
            <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-4">
              {data.guestbook.map((g, i) => (
                <li
                  key={i}
                  className="px-6 py-5"
                  style={{
                    background: 'var(--wp-surface)',
                    borderRadius: 'var(--wp-radius)',
                    border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                  }}
                >
                  <p className="leading-7">{g.message}</p>
                  <p className="mt-2 text-sm" style={muted}>
                    — {g.guest_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <GuestbookForm weddingId={data.weddingId} />
        </section>
      );
    case 'photowall':
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <PhotoWallLive initial={data.gallery} />
          <PhotoUploadForm weddingId={data.weddingId} />
        </section>
      );
    case 'songs':
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          {data.songs.length > 0 && (
            <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-3">
              {data.songs.map((s, i) => (
                <li
                  key={i}
                  className="px-6 py-4"
                  style={{
                    background: 'var(--wp-surface)',
                    borderRadius: 'var(--wp-radius)',
                    border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                  }}
                >
                  <p className="text-lg" style={display}>
                    {s.title}
                    {s.artist && (
                      <span className="text-sm" style={muted}>
                        {' '}· {s.artist}
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={muted}>
                    requested by {s.guest_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <SongForm weddingId={data.weddingId} />
        </section>
      );
    case 'games':
      if (data.games.length === 0) return null;
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
          </div>
          <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-4">
            {data.games.map((g, i) => (
              <li
                key={i}
                className="px-6 py-5"
                style={{
                  background: 'var(--wp-surface)',
                  borderRadius: 'var(--wp-radius)',
                  border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                }}
              >
                <p className="text-xs uppercase tracking-widest" style={muted}>
                  {g.kind}
                </p>
                <p className="mt-1 text-xl" style={display}>
                  {g.title}
                </p>
                {g.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-7">{g.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      );
    case 'capsule':
      return (
        <section className="py-10">
          <div className="text-center">
            <Kicker label={sectionLabel(id)} />
            <p className="mx-auto mt-2 max-w-xl text-sm" style={muted}>
              Sealed notes for the future — they open on their dates.
            </p>
          </div>
          {data.capsule.length > 0 && (
            <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-4">
              {data.capsule.map((c, i) => (
                <li
                  key={i}
                  className="px-6 py-5"
                  style={{
                    background: 'var(--wp-surface)',
                    borderRadius: 'var(--wp-radius)',
                    border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                  }}
                >
                  <p className="leading-7">{c.message}</p>
                  <p className="mt-2 text-sm" style={muted}>
                    — {c.guest_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <CapsuleForm weddingId={data.weddingId} />
        </section>
      );
    case 'rsvp':
      return (
        <section className="py-12 text-center">
          <p className="text-3xl" style={display}>
            {t(locale, 'site.joinTitle')}
          </p>
          <p className="mt-2 text-sm" style={muted}>
            {t(locale, 'site.useLink')}
          </p>
        </section>
      );
    case 'footer':
      return (
        <footer className="py-10 text-center">
          <p className="text-xs uppercase" style={{ ...muted, letterSpacing: '0.25em' }}>
            {data.weddingTitle}
          </p>
        </footer>
      );
    default:
      return null;
  }
}
