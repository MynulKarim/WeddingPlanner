import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import {
  getGuestQuestions,
  getGuestRsvps,
  resolveInvitation,
} from '@/lib/invite/resolve';
import { themeToCssVars, resolveTheme } from '@/lib/themes/tokens';
import { isRtlLocale, isSupportedLocale } from '@/lib/i18n/languages';
import { formatDateTime, t } from '@/lib/i18n/dict';
import { isPastDeadline } from '@/lib/rsvp/rules';
import { MonogramMark } from '@/components/monogram/monogram-mark';
import { RsvpForm } from '@/components/invite/rsvp-form';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { getAppUrl } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickLang(param: string | string[] | undefined, fallback: string): string {
  const code = Array.isArray(param) ? param[0] : param;
  return code && isSupportedLocale(code) ? code : fallback;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const inv = await resolveInvitation(token).catch(() => null);
  if (!inv) return { title: 'Invitation', robots: { index: false, follow: false } };
  return {
    title: `${inv.guestName} — Invited to ${inv.weddingTitle}`,
    robots: { index: false, follow: false },
  };
}

function InvalidInvitation() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-3xl">{t('en', 'invite.invalidTitle')}</p>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {t('en', 'invite.invalidBody')}
      </p>
    </main>
  );
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  const inv = await resolveInvitation(token).catch(() => null);
  if (!inv) return <InvalidInvitation />;
  const locale = pickLang(sp.lang, inv.locale);

  const theme = resolveTheme(inv.themeId, inv.themeOverrides);
  const vars = themeToCssVars(theme) as CSSProperties;
  const [questions, rsvps] = await Promise.all([
    getGuestQuestions(inv).catch(() => []),
    getGuestRsvps(inv).catch(() => []),
  ]);
  const initial = Object.fromEntries(rsvps.map((r) => [r.event_id, r]));
  const deadlinePassed = isPastDeadline(inv.deadline, new Date().toISOString());

  // QR check-in code (Phase 11): SVG of this invitation's URL for the door.
  let qrSvg: string | null = null;
  try {
    const QRCode = (await import('qrcode')).default;
    qrSvg = await QRCode.toString(`${getAppUrl()}/invite/${token}`, {
      type: 'svg',
      margin: 1,
      width: 200,
    });
  } catch {
    qrSvg = null;
  }

  return (
    <div
      className="wp-theme min-h-screen"
      lang={locale}
      dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}
      style={{
        ...vars,
        background: 'var(--wp-background)',
        color: 'var(--wp-ink)',
        fontFamily: 'var(--wp-font-body)',
      }}
    >
      <main className="mx-auto w-full max-w-xl px-5 pb-20">
        <div className="flex justify-end pt-4 print:hidden">
          <Suspense>
            <LanguageSwitcher current={locale} />
          </Suspense>
        </div>
        <header className="py-10 text-center">
          {inv.monogram && (
            <div className="mb-5 flex justify-center">
              <MonogramMark
                initials={inv.monogram.initials}
                style={inv.monogram.style as 'serif' | 'script' | 'modern' | 'traditional'}
                shape={inv.monogram.shape as 'seal' | 'crest' | 'minimal'}
                accent={theme.colors.accent}
                ink={theme.colors.ink}
                size={88}
              />
            </div>
          )}
          <p
            className="text-xs uppercase"
            style={{ color: 'var(--wp-muted)', letterSpacing: '0.3em' }}
          >
            {t(locale, 'invite.kicker')}
          </p>
          <h1 className="mt-3 text-4xl leading-tight" style={{ fontFamily: 'var(--wp-font-display)' }}>
            {t(locale, 'invite.dear', { name: inv.guestName })}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--wp-muted)' }}>
            {inv.weddingTitle}
            {inv.householdLabel ? ` · ${inv.householdLabel}` : ''}
          </p>
          {inv.householdMemberNames.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: 'var(--wp-muted)' }}>
              {inv.householdMemberNames.join(', ')}
            </p>
          )}
        </header>

        {inv.events.length > 0 && (
          <section className="pb-10">
            <p
              className="text-center text-xs uppercase"
              style={{ color: 'var(--wp-accent)', letterSpacing: '0.3em' }}
            >
              {t(locale, 'invite.yourEvents')}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {inv.events.map((e) => (
                <li
                  key={e.event_id}
                  className="px-5 py-4 text-center"
                  style={{
                    background: 'var(--wp-surface)',
                    borderRadius: 'var(--wp-radius)',
                    border:
                      '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
                  }}
                >
                  <p className="text-xl" style={{ fontFamily: 'var(--wp-font-display)' }}>
                    {e.name}
                  </p>
                  {formatDateTime(locale, e.starts_at) && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--wp-muted)' }}>
                      {formatDateTime(locale, e.starts_at)}
                    </p>
                  )}
                  {[e.venue, e.address].filter(Boolean).length > 0 && (
                    <p className="mt-1 text-sm">{[e.venue, e.address].filter(Boolean).join(' · ')}</p>
                  )}
                  {e.dress_code ? (
                    <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: 'var(--wp-muted)' }}>
                      {t(locale, 'invite.dressCode', { code: e.dress_code })}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="pb-10">
          <p
            className="text-center text-xs uppercase"
            style={{ color: 'var(--wp-accent)', letterSpacing: '0.3em' }}
          >
            {t(locale, 'invite.rsvp')}
          </p>
          {inv.deadline && (
            <p className="mt-2 text-center text-sm" style={{ color: 'var(--wp-muted)' }}>
              {t(locale, 'invite.respondBy', {
                date: formatDateTime(locale, inv.deadline) ?? inv.deadline,
              })}
            </p>
          )}
          <div className="mt-5">
            <RsvpForm
              token={token}
              locale={locale}
              events={inv.events.map((e) => ({ event_id: e.event_id, name: e.name }))}
              questions={questions}
              initial={initial}
              allowPlusOne={inv.allowPlusOne}
              deadlinePassed={deadlinePassed}
            />
          </div>
        </section>

        {qrSvg && (
          <section className="pb-10 text-center">
            <p
              className="text-xs uppercase"
              style={{ color: 'var(--wp-accent)', letterSpacing: '0.3em' }}
            >
              {t(locale, 'invite.checkinTitle')}
            </p>
            <div
              className="mx-auto mt-4 w-fit bg-white p-3"
              style={{ borderRadius: 'var(--wp-radius)' }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-2 text-xs" style={{ color: 'var(--wp-muted)' }}>
              {t(locale, 'invite.showCode')}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
