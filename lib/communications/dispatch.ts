/**
 * Dispatch core — Phase 7, claim-hardened in Phase 16.
 * processDueMessages takes its Supabase client + provider as arguments so it
 * runs from server actions, the cron endpoint, AND integration tests.
 *
 * Concurrency model: rows are CLAIMED (scheduled→sending) in one atomic
 * statement (migration 0019, FOR UPDATE SKIP LOCKED), then delivered, then
 * finalized. Overlapping runners never deliver the same row; a crashed
 * worker's rows become reclaimable after 10 minutes via claimed_at.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailProvider, SmsProvider } from '@/services/communications/provider';
import { isMissingFunction } from '@/lib/db/schema-guard';

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

async function finalize(
  supabase: SupabaseClient,
  row: DueRow,
  result: DeliveryResult,
): Promise<'sent' | 'failed'> {
  if (result.ok) {
    await supabase
      .from('messages')
      .update({
        status: 'sent',
        provider_message_id: result.providerMessageId ?? null,
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', row.id);
    return 'sent';
  }
  await supabase
    .from('messages')
    .update({ status: 'failed', error: result.error ?? 'Delivery failed.' })
    .eq('id', row.id);
  return 'failed';
}

function toJob(row: DueRow): MessageJob {
  return {
    guestId: null,
    toAddress: row.to_address,
    subject: row.subject ?? '',
    body: row.body_snapshot,
  };
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
  // Atomic claim first (migration 0019). Exactly one runner owns each row.
  const { data: claimed, error: claimError } = await supabase.rpc('claim_due_messages', {
    p_now: nowIso,
    p_limit: 100,
    p_wedding_id: weddingId ?? null,
  });
  if (claimError) {
    // Pre-migration database: legacy select-then-send (single-runner only).
    if (isMissingFunction(claimError)) return processDueMessagesLegacy(supabase, email, sms, nowIso, weddingId);
    throw new Error(claimError.message);
  }

  let sent = 0;
  let failed = 0;
  for (const row of (claimed ?? []) as DueRow[]) {
    const outcome = await finalize(
      supabase,
      row,
      await deliverJob(email, sms, row.channel, toJob(row)),
    );
    if (outcome === 'sent') sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

/** Legacy path for databases without migration 0019 (not overlap-safe). */
async function processDueMessagesLegacy(
  supabase: SupabaseClient,
  email: EmailProvider,
  sms: SmsProvider,
  nowIso: string,
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
    const outcome = await finalize(
      supabase,
      row,
      await deliverJob(email, sms, row.channel, toJob(row)),
    );
    if (outcome === 'sent') sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
