/**
 * Messages data access — Phase 7 (tenant-scoped, RLS-enforced).
 * Product rule: rows are created ONLY by explicit couple confirmation
 * (send-now or schedule). Automated dispatch only flips scheduled rows.
 * Mutations require planner+; staff read history.
 */
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { getAppUrl } from '@/lib/supabase/server';
import { resolveLocale } from '@/lib/i18n/languages';
import { formatDate } from '@/lib/i18n/dict';
import {
  deliverJob,
  processDueMessages,
} from '@/lib/communications/dispatch';
import { getEmailProvider, getSmsProvider } from '@/lib/communications/providers';
import type { TemplateVars } from '@/lib/communications/templates';
import {
  TEMPLATE_KINDS,
  type TemplateKind,
} from '@/lib/communications/variables';

export type Channel = 'email' | 'sms';

export interface MessageRow {
  id: string;
  guest_id: string | null;
  guest_name: string | null;
  template_kind: string;
  channel: Channel;
  to_address: string;
  subject: string | null;
  body_snapshot: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  provider_message_id: string | null;
  error: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

interface GuestContact {
  guest_id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  locale: string | null;
  event_ids: string[];
  statuses: string[];
}

async function fetchGuestContacts(weddingId: string): Promise<{
  contacts: GuestContact[];
  weddingTitle: string;
  defaultLocale: string;
  deadline: string | null;
  websiteUrl: string;
  events: { id: string; name: string; starts_at: string | null; venue: string | null }[];
}> {
  const supabase = await createServerSupabaseClient();
  const { data: wedding } = await supabase
    .from('weddings')
    .select('title, slug, default_locale, rsvp_deadline')
    .eq('id', weddingId)
    .maybeSingle();
  const w = (wedding ?? {}) as {
    title?: string;
    slug?: string;
    default_locale?: string | null;
    rsvp_deadline?: string | null;
  };
  const { data: guests } = await supabase
    .from('guests')
    .select('id, display_name, email, phone, locale')
    .eq('wedding_id', weddingId)
    .order('display_name');
  const guestList = ((guests ?? []) as {
    id: string;
    display_name: string;
    email: string | null;
    phone: string | null;
    locale: string | null;
  }[]);
  const { data: assignments } = await supabase
    .from('guest_events')
    .select('guest_id, event_id')
    .in('guest_id', guestList.map((g) => g.id));
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('guest_id, event_id, status')
    .eq('wedding_id', weddingId);
  const { data: events } = await supabase
    .from('events')
    .select('id, name, starts_at, venue')
    .eq('wedding_id', weddingId)
    .order('starts_at', { ascending: true, nullsFirst: false });

  const byGuest = new Map<string, { events: string[]; statuses: string[] }>();
  for (const a of (assignments ?? []) as { guest_id: string; event_id: string }[]) {
    if (!byGuest.has(a.guest_id)) byGuest.set(a.guest_id, { events: [], statuses: [] });
    byGuest.get(a.guest_id)?.events.push(a.event_id);
  }
  for (const r of (rsvps ?? []) as { guest_id: string; status: string }[]) {
    byGuest.get(r.guest_id)?.statuses.push(r.status);
  }
  return {
    contacts: guestList.map((g) => ({
      guest_id: g.id,
      display_name: g.display_name,
      email: g.email,
      phone: g.phone,
      locale: g.locale,
      event_ids: byGuest.get(g.id)?.events ?? [],
      statuses: byGuest.get(g.id)?.statuses ?? [],
    })),
    weddingTitle: w.title ?? 'Our wedding',
    defaultLocale: w.default_locale ?? 'en',
    deadline: w.rsvp_deadline ?? null,
    websiteUrl: w.slug ? `${getAppUrl()}/w/${w.slug}` : '',
    events: ((events ?? []) as {
      id: string;
      name: string;
      starts_at: string | null;
      venue: string | null;
    }[]),
  };
}

export interface AudienceSpec {
  eventId: string | null;
  rsvp: 'all' | 'attending' | 'pending' | 'declined';
}

function filterAudience(
  contacts: GuestContact[],
  channel: Channel,
  audience: AudienceSpec,
): GuestContact[] {
  return contacts.filter((c) => {
    const address = channel === 'email' ? c.email : c.phone;
    if (!address || !address.trim()) return false;
    if (audience.eventId && !c.event_ids.includes(audience.eventId)) return false;
    if (audience.rsvp !== 'all') {
      if (c.statuses.length === 0) return audience.rsvp === 'pending';
      if (audience.rsvp === 'pending') return false;
      if (!c.statuses.includes(audience.rsvp)) return false;
    }
    return true;
  });
}

/**
 * Invitation-kind links: sending invitations issues FRESH links (old links
 * die, same as manual regeneration). The confirm screen states this. Other
 * kinds link to the public website.
 */
async function invitationLink(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  weddingId: string,
  guestId: string,
  guestLocale: string | null,
  websiteUrl: string,
  issueFresh: boolean,
): Promise<string> {
  if (!issueFresh) return websiteUrl;
  const { generateInvitationToken } = await import('@/lib/security/invitation-token');
  const { hashInvitationToken } = await import('@/lib/security/token-hash');
  const { data: guest } = await supabase
    .from('guests')
    .select('locale')
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (!guest) return websiteUrl;
  const token = generateInvitationToken();
  const { error } = await supabase.from('invitations').upsert(
    {
      wedding_id: weddingId,
      guest_id: guestId,
      token_hash: hashInvitationToken(token),
      locale: (guest as { locale?: string | null }).locale ?? guestLocale ?? 'en',
    },
    { onConflict: 'guest_id' },
  );
  if (error) return websiteUrl;
  return `${getAppUrl()}/invite/${token}`;
}

export interface RecipientPreview {
  guest_id: string;
  display_name: string;
  to_address: string;
  locale: string;
}

export interface ComposePreview {
  subject: string;
  body: string;
  recipients: RecipientPreview[];
  sampleGuest: string;
}

export interface PreviewInput {
  kind: TemplateKind;
  channel: Channel;
  eventId: string | null;
  rsvp: AudienceSpec['rsvp'];
  customSubject: string;
  customMessage: string;
  scheduledFor: string;
}

export async function previewSend(
  weddingId: string,
  input: PreviewInput,
): Promise<ComposePreview & { error?: string }> {
  await requireRole(weddingId, 'staff');
  if (!TEMPLATE_KINDS.includes(input.kind)) return { error: 'Invalid template.', subject: '', body: '', recipients: [], sampleGuest: '' };
  const supabase = await createServerSupabaseClient();
  const ctx = await fetchGuestContacts(weddingId);
  const recipients = filterAudience(ctx.contacts, input.channel, {
    eventId: input.eventId,
    rsvp: input.kind === 'thank_you' && input.rsvp === 'all' ? 'attending' : input.rsvp,
  });
  if (recipients.length === 0) {
    return { error: 'No recipients match (missing contact details or filters).', subject: '', body: '', recipients: [], sampleGuest: '' };
  }
  const first = recipients[0];
  const locale = resolveLocale({ guestLocale: first.locale, weddingLocale: ctx.defaultLocale });
  const rendered = await renderForGuest(supabase, weddingId, ctx, input, first, locale, false);
  return {
    subject: rendered.subject,
    body: rendered.text,
    recipients: recipients.map((r) => ({
      guest_id: r.guest_id,
      display_name: r.display_name,
      to_address: (input.channel === 'email' ? r.email : r.phone) as string,
      locale: resolveLocale({ guestLocale: r.locale, weddingLocale: ctx.defaultLocale }),
    })),
    sampleGuest: first.display_name,
  };
}

async function renderForGuest(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  weddingId: string,
  ctx: Awaited<ReturnType<typeof fetchGuestContacts>>,
  input: PreviewInput,
  guest: GuestContact,
  locale: string,
  issueFresh: boolean,
): Promise<{ subject: string; text: string; html: string }> {
  const { data: override } = await supabase
    .from('message_templates')
    .select('subject, body')
    .eq('wedding_id', weddingId)
    .eq('kind', input.kind)
    .eq('channel', input.channel)
    .maybeSingle();
  const event = ctx.events.find((e) => e.id === input.eventId) ?? ctx.events[0];
  const link = await invitationLink(
    supabase,
    weddingId,
    guest.guest_id,
    guest.locale,
    ctx.websiteUrl,
    issueFresh && input.kind === 'invitation',
  );
  const vars: TemplateVars = {
    name: guest.display_name,
    couple: ctx.weddingTitle,
    date: formatDate(locale, ctx.deadline) ?? '',
    event: event?.name ?? '',
    venue: event?.venue ?? '',
    message: input.customMessage.trim(),
    link,
    website: ctx.websiteUrl,
  };
  const { renderTemplateMessage } = await import('@/lib/communications/templates');
  return renderTemplateMessage(input.kind, locale, vars, {
    subject: input.customSubject.trim() || (override as { subject?: string | null } | null)?.subject,
    body: (override as { body?: string | null } | null)?.body,
  });
}

// ---------------------------------------------------------------------------
// Explicit send / schedule (confirmation required)
// ---------------------------------------------------------------------------

export interface SendInput extends PreviewInput {
  /** Must be true — the UI confirm step. Never defaulted. */
  confirm: boolean;
}

export interface SendResult {
  error?: string;
  sent?: number;
  failed?: number;
  scheduled?: number;
  skipped?: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMessages(weddingId: string, input: SendInput): Promise<SendResult> {
  await requireRole(weddingId, 'planner');
  if (input.confirm !== true) {
    return { error: 'Please confirm explicitly before sending.' };
  }
  if (!TEMPLATE_KINDS.includes(input.kind)) return { error: 'Invalid template.' };
  if (input.kind === 'announcement' && !input.customMessage.trim()) {
    return { error: 'Announcements need a message.' };
  }
  if (input.kind === 'event_reminder' && !input.eventId) {
    return { error: 'Event reminders need an event.' };
  }
  const scheduledFor = input.scheduledFor.trim();
  if (scheduledFor && Number.isNaN(Date.parse(scheduledFor))) {
    return { error: 'Scheduled time is not valid.' };
  }

  const supabase = await createServerSupabaseClient();
  const ctx = await fetchGuestContacts(weddingId);
  const recipients = filterAudience(ctx.contacts, input.channel, {
    eventId: input.eventId,
    rsvp: input.kind === 'thank_you' && input.rsvp === 'all' ? 'attending' : input.rsvp,
  });
  if (recipients.length === 0) return { error: 'No recipients match.' };
  if (recipients.length > 2000) return { error: 'Limit sends to 2,000 recipients.' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const emailProvider = getEmailProvider();
  const smsProvider = getSmsProvider();

  let sent = 0;
  let failed = 0;
  let scheduled = 0;
  const skipped: string[] = [];

  for (const guest of recipients) {
    const to = (input.channel === 'email' ? guest.email : guest.phone)?.trim() ?? '';
    if (input.channel === 'email' && !EMAIL_RE.test(to)) {
      skipped.push(`${guest.display_name} (bad email)`);
      continue;
    }
    if (input.channel === 'sms' && to.replace(/\D/g, '').length < 7) {
      skipped.push(`${guest.display_name} (bad phone)`);
      continue;
    }
    const locale = resolveLocale({ guestLocale: guest.locale, weddingLocale: ctx.defaultLocale });
    const rendered = await renderForGuest(supabase, weddingId, ctx, input, guest, locale, true);

    if (scheduledFor) {
      const { error } = await supabase.from('messages').insert({
        wedding_id: weddingId,
        guest_id: guest.guest_id,
        template_kind: input.kind,
        channel: input.channel,
        to_address: to,
        subject: input.channel === 'email' ? rendered.subject : null,
        body_snapshot: input.channel === 'email' ? rendered.text : rendered.text,
        status: 'scheduled',
        scheduled_for: new Date(scheduledFor).toISOString(),
        created_by: user?.id ?? null,
      });
      if (error) {
        failed += 1;
      } else {
        scheduled += 1;
      }
      continue;
    }

    const result = await (input.channel === 'email'
      ? deliverJob(emailProvider, smsProvider, 'email', {
          guestId: guest.guest_id,
          toAddress: to,
          subject: rendered.subject,
          body: rendered.text,
          html: rendered.html,
        })
      : deliverJob(emailProvider, smsProvider, 'sms', {
          guestId: guest.guest_id,
          toAddress: to,
          subject: '',
          body: rendered.text,
        }));
    const { error } = await supabase.from('messages').insert({
      wedding_id: weddingId,
      guest_id: guest.guest_id,
      template_kind: input.kind,
      channel: input.channel,
      to_address: to,
      subject: input.channel === 'email' ? rendered.subject : null,
      body_snapshot: rendered.text,
      status: result.ok ? 'sent' : 'failed',
      provider_message_id: result.providerMessageId ?? null,
      error: result.error ?? null,
      sent_at: result.ok ? new Date().toISOString() : null,
      created_by: user?.id ?? null,
    });
    if (error) {
      failed += 1;
    } else if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  const { logAudit } = await import('@/lib/db/audit');
  const { trackEvent } = await import('@/lib/observability/analytics');
  await logAudit({
    weddingId,
    action: scheduledFor ? 'messages.scheduled' : 'messages.sent',
    entity: 'message',
    meta: { kind: input.kind, channel: input.channel, sent, failed, scheduled },
  });
  trackEvent({ event: 'messages_sent', properties: { kind: input.kind, channel: input.channel, sent } });
  return { sent, failed, scheduled, skipped };
}

export async function listMessages(weddingId: string): Promise<MessageRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, guest_id, template_kind, channel, to_address, subject, body_snapshot, status, provider_message_id, error, scheduled_for, sent_at, created_at, guests(display_name)',
    )
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as (Omit<MessageRow, 'guest_name'> & {
    guests: { display_name: string } | { display_name: string }[] | null;
  })[]).map((m) => ({
    ...m,
    guest_name: Array.isArray(m.guests) ? (m.guests[0]?.display_name ?? null) : (m.guests?.display_name ?? null),
  }));
}

export async function cancelMessage(weddingId: string, messageId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('messages')
    .update({ status: 'cancelled' })
    .eq('id', messageId)
    .eq('wedding_id', weddingId)
    .eq('status', 'scheduled');
  if (error) throw new Error(error.message);
}

export async function retryMessage(weddingId: string, messageId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('channel, to_address, subject, body_snapshot')
    .eq('id', messageId)
    .eq('wedding_id', weddingId)
    .eq('status', 'failed')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Failed message not found.');
  const row = data as { channel: 'email' | 'sms'; to_address: string; subject: string | null; body_snapshot: string };
  const result = await deliverJob(getEmailProvider(), getSmsProvider(), row.channel, {
    guestId: null,
    toAddress: row.to_address,
    subject: row.subject ?? '',
    body: row.body_snapshot,
  });
  const { error: upError } = await supabase
    .from('messages')
    .update(
      result.ok
        ? {
            status: 'sent',
            provider_message_id: result.providerMessageId ?? null,
            sent_at: new Date().toISOString(),
            error: null,
          }
        : { error: result.error ?? 'Delivery failed.' },
    )
    .eq('id', messageId);
  if (upError) throw new Error(upError.message);
}

/** Deliver due scheduled messages now (manual trigger; cron wiring is ops). */
export async function processDueNow(weddingId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  await processDueMessages(supabase, getEmailProvider(), getSmsProvider(), undefined, weddingId);
}

// ---------------------------------------------------------------------------
// Template overrides
// ---------------------------------------------------------------------------

export interface TemplateOverride {
  subject: string | null;
  body: string | null;
}

export async function getTemplateOverride(
  weddingId: string,
  kind: TemplateKind,
  channel: Channel,
): Promise<TemplateOverride> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('message_templates')
    .select('subject, body')
    .eq('wedding_id', weddingId)
    .eq('kind', kind)
    .eq('channel', channel)
    .maybeSingle();
  const row = (data ?? null) as TemplateOverride | null;
  return { subject: row?.subject ?? null, body: row?.body ?? null };
}

export interface TemplateState {
  error?: string;
  message?: string;
}

export async function saveTemplate(
  weddingId: string,
  kind: TemplateKind,
  channel: Channel,
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  await requireRole(weddingId, 'planner');
  if (!TEMPLATE_KINDS.includes(kind)) return { error: 'Invalid template.' };
  const subject = String(formData.get('subject') ?? '').trim().slice(0, 200);
  const body = String(formData.get('body') ?? '').trim().slice(0, 10000);
  const supabase = await createServerSupabaseClient();
  if (!body) {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('kind', kind)
      .eq('channel', channel);
    if (error) return { error: error.message };
    return { message: 'Custom template cleared — built-in restored.' };
  }
  const { error } = await supabase.from('message_templates').upsert(
    { wedding_id: weddingId, kind, channel, subject: subject || null, body },
    { onConflict: 'wedding_id,kind,channel' },
  );
  if (error) return { error: error.message };
  return { message: 'Template saved.' };
}
