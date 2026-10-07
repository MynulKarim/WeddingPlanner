/**
 * Audit log writer — Phase 13 (plain module, imported by server actions).
 * Append-only: no update/delete path exists anywhere in the app or RLS.
 * Failures are swallowed (logging must never break the action itself).
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';

export interface AuditEntry {
  weddingId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      wedding_id: entry.weddingId,
      user_id: user?.id ?? null,
      action: entry.action,
      entity: entry.entity ?? '',
      entity_id: entry.entityId ?? '',
      meta: entry.meta ?? {},
    });
  } catch (e) {
    logger.warn('audit_write_failed', {
      action: entry.action,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export async function listAuditLogs(weddingId: string, limit = 100): Promise<AuditRow[]> {
  const { requireRole } = await import('@/lib/db/weddings');
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity, entity_id, meta, created_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditRow[];
}
