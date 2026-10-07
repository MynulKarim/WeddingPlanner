/**
 * Dispatch core — Phase 7.
 * Pure job-building + provider delivery + due-message processing.
 * processDueMessages takes its Supabase client + provider as arguments so it
 * runs from server actions, future cron, AND integration tests.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailProvider, SmsProvider } from '@/services/communications/provider';

export interface MessageJob {
  guestId: string | null;
  toAddress: string;
  subject: string;
  body: string;
  html?: string;
}

export interface DeliveryResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function deliverJob(
  email: EmailProvider,
  sms: SmsProvider,
  channel: 'email' | 'sms',
  job: MessageJob,
): Promise<DeliveryResult> {
  try {
    if (channel === 'email') {
      const { messageId } = await email.sendEmail({
        to: job.toAddress,
        subject: job.subject,
        html: job.html ?? job.body,
        text: job.body,
      });
      return { ok: true, providerMessageId: messageId };
    }
    const { messageId } = await sms.sendSms({ to: job.toAddress, body: job.body });
    return { ok: true, providerMessageId: messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delivery failed.' };
  }
}

interface DueRow {
  id: string;
  channel: 'email' | 'sms';
  to_address: string;
  subject: string | null;
  body_snapshot: string;
}

/**
 * Send all due scheduled messages (scheduled_for <= now). Returns counts.
 * Caller supplies an authorized client (member session or service role).
 */
export async function processDueMessages(
  supabase: SupabaseClient,
  email: EmailProvider,
  sms: SmsProvider,
  nowIso: string = new Date().toISOString(),
  weddingId?: string,
): Promise<{ sent: number; failed: number }> {
  let query = supabase
    .from('messages')
    .select('id, channel, to_address, subject, body_snapshot')
    .eq('status', 'scheduled')
    .lte('scheduled_for', nowIso)
    .limit(100);
  if (weddingId) query = query.eq('wedding_id', weddingId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as DueRow[]) {
    const result = await deliverJob(email, sms, row.channel, {
      guestId: null,
      toAddress: row.to_address,
      subject: row.subject ?? '',
      body: row.body_snapshot,
    });
    if (result.ok) {
      sent += 1;
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          provider_message_id: result.providerMessageId ?? null,
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', row.id);
    } else {
      failed += 1;
      await supabase
        .from('messages')
        .update({ status: 'failed', error: result.error ?? 'Delivery failed.' })
        .eq('id', row.id);
    }
  }
  return { sent, failed };
}
