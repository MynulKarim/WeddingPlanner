/**
 * Localized message templates — Phase 7 (pure, unit-tested).
 * Renders subject + text/email-html bodies per kind and locale.
 * Couples may override subject/body per wedding (message_templates table);
 * overrides use {{variables}} and render through the same pipeline.
 */
import { t } from '@/lib/i18n/dict';
import { escapeHtml, renderTemplate, type TemplateKind } from '@/lib/communications/variables';

export interface TemplateVars {
  name: string;
  couple: string;
  date: string;
  event: string;
  venue: string;
  message: string;
  link: string;
  website: string;
}

export interface RenderedTemplate {
  subject: string;
  text: string;
  html: string;
}

function subjectFor(kind: TemplateKind, locale: string, couple: string): string {
  switch (kind) {
    case 'invitation':
      return `${couple} — ${t(locale, 'mail.subInvite')}`;
    case 'save_the_date':
      return `${couple} — ${t(locale, 'mail.subSaveDate')}`;
    case 'rsvp_reminder':
      return `${couple} — ${t(locale, 'mail.subRsvp')}`;
    case 'event_reminder':
      return `${couple} — ${t(locale, 'mail.subEvent')}`;
    case 'thank_you':
      return `${couple} — ${t(locale, 'mail.subThanks')}`;
    case 'announcement':
      return couple;
  }
}

function bodyKey(
  kind: TemplateKind,
): 'mail.invite' | 'mail.saveDate' | 'mail.rsvpReminder' | 'mail.eventReminder' | 'mail.thanks' | null {
  switch (kind) {
    case 'invitation':
      return 'mail.invite';
    case 'save_the_date':
      return 'mail.saveDate';
    case 'rsvp_reminder':
      return 'mail.rsvpReminder';
    case 'event_reminder':
      return 'mail.eventReminder';
    case 'thank_you':
      return 'mail.thanks';
    case 'announcement':
      return null;
  }
}

/**
 * Render a template. Custom subject/body overrides (couple-edited) win over
 * built-ins. Single-brace {vars} come from dictionaries; double-brace
 * {{vars}} (overrides) render in a second pass.
 */
export function renderTemplateMessage(
  kind: TemplateKind,
  locale: string,
  vars: TemplateVars,
  override?: { subject?: string | null; body?: string | null },
): RenderedTemplate {
  const varRecord = vars as unknown as Record<string, string>;
  const key = bodyKey(kind);
  const builtIn = key ? t(locale, key, varRecord) : '';
  const rawBody = override?.body?.trim() || builtIn || vars.message;
  const text = renderTemplate(rawBody, {
    ...varRecord,
    guestName: vars.name,
    weddingTitle: vars.couple,
    deadline: vars.date,
    events: vars.event,
  });

  const rawSubject =
    override?.subject?.trim() ||
    (kind === 'announcement' ? vars.message.slice(0, 80).trim() : '') ||
    subjectFor(kind, locale, vars.couple);
  const subject = renderTemplate(rawSubject, varRecord);

  const cta = t(locale, 'mail.cta');
  const html =
    `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">` +
    `<p style="font-size:18px;line-height:1.7">${escapeHtml(text).replace(/\n/g, '<br>')}</p>` +
    (vars.link
      ? `<p style="margin:24px 0"><a href="${escapeHtml(vars.link)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none">${escapeHtml(cta)}</a></p>`
      : '') +
    `</div>`;
  return { subject, text, html };
}
