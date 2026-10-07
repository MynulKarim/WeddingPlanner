/**
 * Template variable rendering — Phase 7 (pure, unit-tested).
 * {{variables}} with HTML-escaping for email bodies. Unknown variables are
 * left intact so couples can spot typos in previews.
 */

const VAR_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(VAR_RE, (_match, name: string) =>
    name in vars ? vars[name] : `{{${name}}}`,
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const TEMPLATE_VARIABLES = [
  'guestName',
  'couple',
  'weddingTitle',
  'link',
  'website',
  'deadline',
  'events',
  'message',
] as const;

export type TemplateKind =
  | 'save_the_date'
  | 'invitation'
  | 'rsvp_reminder'
  | 'event_reminder'
  | 'announcement'
  | 'thank_you';

export const TEMPLATE_KINDS: TemplateKind[] = [
  'save_the_date',
  'invitation',
  'rsvp_reminder',
  'event_reminder',
  'announcement',
  'thank_you',
];

export function templateLabel(kind: TemplateKind): string {
  switch (kind) {
    case 'save_the_date':
      return 'Save the date';
    case 'invitation':
      return 'Invitation';
    case 'rsvp_reminder':
      return 'RSVP reminder';
    case 'event_reminder':
      return 'Event reminder';
    case 'announcement':
      return 'Announcement';
    case 'thank_you':
      return 'Thank you';
  }
}
