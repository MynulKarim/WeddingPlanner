/**
 * Stationery data assembly — Phase 12 (server).
 * Gathers one wedding's data (theme, monogram, events, guests + tables,
 * website content) into the document builders' input. Member-scoped reads.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { fetchGuestHub } from '@/lib/db/guests';
import { getSeatingPlan } from '@/lib/db/seating';
import { resolveTheme } from '@/lib/themes/tokens';
import { monogramToSvg, type MonogramShape, type MonogramStyle } from '@/lib/monogram/svg';
import { getAppUrl } from '@/lib/supabase/server';
import type { StationeryData } from '@/lib/pdf/documents';

const MONOGRAM_STYLES = ['serif', 'script', 'modern', 'traditional'] as const;
const MONOGRAM_SHAPES = ['seal', 'crest', 'minimal'] as const;

export async function getStationeryData(weddingId: string): Promise<StationeryData> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();

  const { data: wedding } = await supabase
    .from('weddings')
    .select('title, slug, theme_id, theme_overrides')
    .eq('id', weddingId)
    .maybeSingle();
  const w = (wedding ?? {}) as {
    title?: string;
    slug?: string;
    theme_id?: string;
    theme_overrides?: Record<string, string>;
  };
  const theme = resolveTheme(w.theme_id ?? 'editorial', w.theme_overrides ?? {});

  const { data: monogram } = await supabase
    .from('monograms')
    .select('initials, style, shape')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const m = (monogram ?? null) as { initials: string; style: string; shape: string } | null;
  const monogramSvg =
    m &&
    (MONOGRAM_STYLES as readonly string[]).includes(m.style) &&
    (MONOGRAM_SHAPES as readonly string[]).includes(m.shape)
      ? monogramToSvg({
          initials: m.initials,
          style: m.style as MonogramStyle,
          shape: m.shape as MonogramShape,
          accent: theme.colors.accent,
          ink: theme.colors.ink,
        })
      : null;

  const { data: events } = await supabase
    .from('events')
    .select('id, name, starts_at, timezone, venue, address, description, dress_code')
    .eq('wedding_id', weddingId)
    .order('starts_at', { ascending: true, nullsFirst: false });

  const [hub, plan, site, media] = await Promise.all([
    fetchGuestHub(weddingId),
    getSeatingPlan(weddingId),
    supabase
      .from('wedding_websites')
      .select('content')
      .eq('wedding_id', weddingId)
      .maybeSingle(),
    supabase
      .from('media')
      .select('path')
      .eq('wedding_id', weddingId)
      .eq('kind', 'image')
      .order('created_at')
      .limit(1),
  ]);
  const tableById = new Map(plan.tables.map((t) => [t.id, t.name]));
  const tableOf: Record<string, string> = {};
  for (const t of plan.tables) for (const gid of t.guest_ids) tableOf[gid] = t.id;

  const content = ((site.data as { content?: Record<string, string> } | null)?.content ?? {}) as Record<string, string>;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const coverPath = ((media.data ?? []) as { path: string }[])[0]?.path;
  // Cover only when publicly reachable (approved-public/public); the PDF
  // renderer fetches it like any guest would.
  let coverUrl: string | null = null;
  if (coverPath) {
    const { data: cover } = await supabase
      .from('media')
      .select('visibility')
      .eq('wedding_id', weddingId)
      .eq('path', coverPath)
      .maybeSingle();
    const vis = (cover as { visibility?: string } | null)?.visibility;
    if (vis === 'approved-public' || vis === 'public') {
      coverUrl = `${base}/storage/v1/object/public/wedding-media/${coverPath}`;
    }
  }

  return {
    weddingTitle: w.title ?? 'Our wedding',
    websiteUrl: w.slug ? `${getAppUrl()}/w/${w.slug}` : getAppUrl(),
    theme,
    monogramSvg,
    coverUrl,
    events: ((events ?? []) as StationeryData['events']).map((e) => ({ ...e })),
    guests: hub.map((g) => ({
      id: g.id,
      name: g.display_name,
      household: g.household_label,
      table: tableOf[g.id] ? (tableById.get(tableOf[g.id]) ?? null) : null,
      events: g.events.map((e) => e.event_name),
    })),
    venueNote: content.venueNote ?? null,
    menuNote: content.menuNote ?? null,
    dietaryNote: content.dietaryNote ?? null,
  };
}
