/**
 * Cron dispatch endpoint — Phase 16.
 * GET or POST /api/cron/dispatch with Authorization: Bearer <CRON_SECRET>.
 * Runs processDueMessages globally (all weddings) with the service role.
 * Wire a scheduler to hit this every few minutes (vercel.json ships a
 * 5-minute Vercel Cron); the per-wedding manual button stays for ad-hoc
 * sends. Overlapping runs are safe: rows are atomically claimed first
 * (migration 0019).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { processDueMessages } from '@/lib/communications/dispatch';
import { getEmailProvider, getSmsProvider } from '@/lib/communications/providers';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const supabase = createServiceRoleClient();
    const { sent, failed } = await processDueMessages(
      supabase,
      getEmailProvider(),
      getSmsProvider(),
    );
    return NextResponse.json({ ok: true, sent, failed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Dispatch failed.' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
