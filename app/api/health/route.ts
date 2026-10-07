import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/supabase/config';

/**
 * Health check — Phase 13.
 * Liveness + dependency status (config present, database reachable with
 * latency). No secrets, no user data. Suitable for uptime monitors and
 * container orchestration probes.
 */
export async function GET() {
  const started = Date.now();
  const { url, anonKey } = getSupabasePublicConfig();
  const configured = url.length > 0 && anonKey.length > 0;

  let database: 'ok' | 'unconfigured' | 'error' = 'unconfigured';
  let latencyMs: number | null = null;
  if (configured) {
    try {
      const supabase = createClient(url, anonKey);
      const t0 = Date.now();
      const { error } = await supabase.from('weddings').select('id').limit(0);
      latencyMs = Date.now() - t0;
      // RLS may deny (fine — the database answered); only transport/schema
      // failures count as unhealthy. PGRST205 = reachable but unmigrated.
      database =
        !error || ['42501', 'PGRST205', 'PGRST301'].includes(error.code ?? '') ? 'ok' : 'error';
    } catch {
      database = 'error';
    }
  }

  const healthy = database !== 'error';
  return NextResponse.json(
    {
      ok: healthy,
      service: 'wedding_planner',
      phase: 13,
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - started,
      checks: {
        config: configured ? 'ok' : 'missing',
        database,
        latencyMs,
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
