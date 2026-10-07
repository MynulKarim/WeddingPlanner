/**
 * Guest CSV export — Phase 2.
 * GET /api/weddings/[id]/guests/export → text/csv download.
 * Requires staff+ membership; RLS + app-level check both apply.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getMyRole } from '@/lib/db/weddings';
import { buildGuestsCsv } from '@/lib/guests/csv';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id: weddingId } = await params;
  try {
    const role = await getMyRole(weddingId);
    if (!role) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data, error } = await supabase
      .from('guests')
      .select(
        'display_name, email, phone, is_child, allow_plus_one, locale, tags, notes, households(label), guest_events(events(name))',
      )
      .eq('wedding_id', weddingId)
      .order('display_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = buildGuestsCsv(
      ((data ?? []) as unknown as {
        display_name: string;
        email: string | null;
        phone: string | null;
        is_child: boolean;
        allow_plus_one: boolean;
        locale: string | null;
        tags: string[];
        notes: string | null;
        households: { label: string } | { label: string }[] | null;
        guest_events: { events: { name: string } | { name: string }[] | null }[];
      }[]).map((g) => {
        const household = Array.isArray(g.households) ? g.households[0] : g.households;
        return {
          display_name: g.display_name,
          email: g.email,
          phone: g.phone,
          household_label: household?.label ?? null,
          is_child: g.is_child,
          allow_plus_one: g.allow_plus_one,
          locale: g.locale,
          tags: g.tags ?? [],
          notes: g.notes,
          event_names: g.guest_events
            .map((ge) => (Array.isArray(ge.events) ? ge.events[0] : ge.events)?.name ?? '')
            .filter(Boolean),
        };
      }),
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="guests-${weddingId}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}
