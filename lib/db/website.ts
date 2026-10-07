/**
 * Website data access — Phase 4 (tenant-scoped, RLS-enforced).
 * Publishing state, layout, and content. Mutations require planner+.
 * Public reads go through getPublishedWebsite (world-readable RLS policy).
 */
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import {
  normalizeSections,
  WEBSITE_SECTION_IDS,
  type SectionConfig,
} from '@/lib/invitation/sections';
import {
  sanitizeWebsiteContent,
  type WebsiteContent,
} from '@/lib/website/content';

export interface WebsiteRow {
  wedding_id: string;
  is_published: boolean;
  noindex: boolean;
  sections: SectionConfig[];
  content: WebsiteContent;
}

function websitePath(weddingId: string): string {
  return `/dashboard/weddings/${weddingId}/website`;
}

export async function getWebsite(weddingId: string): Promise<WebsiteRow | null> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('wedding_websites')
    .select('wedding_id, is_published, noindex, sections, content')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as {
    wedding_id: string;
    is_published: boolean;
    noindex: boolean;
    sections: unknown;
    content: unknown;
  };
  return {
    wedding_id: row.wedding_id,
    is_published: row.is_published,
    noindex: row.noindex,
    sections: normalizeSections(row.sections, WEBSITE_SECTION_IDS),
    content: sanitizeWebsiteContent(row.content),
  };
}

export interface WebsiteState {
  error?: string;
}

async function upsertWebsite(
  weddingId: string,
  patch: Partial<{
    is_published: boolean;
    noindex: boolean;
    sections: SectionConfig[];
    content: WebsiteContent;
  }>,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('wedding_websites')
    .upsert({ wedding_id: weddingId, ...patch });
  return error?.message ?? null;
}

export async function setPublished(
  weddingId: string,
  published: boolean,
): Promise<void> {
  await requireRole(weddingId, 'planner');
  const err = await upsertWebsite(weddingId, { is_published: published });
  if (err) throw new Error(err);
  revalidatePath(websitePath(weddingId));
  revalidatePath(`/w/[slug]`, 'page');
}

export async function saveWebsiteContent(
  weddingId: string,
  _prev: WebsiteState,
  formData: FormData,
): Promise<WebsiteState> {
  await requireRole(weddingId, 'planner');
  const raw: Record<string, unknown> = {};
  for (
    const key of [
      'partnerA',
      'partnerB',
      'tagline',
      'story',
      'venueNote',
      'directions',
      'transportation',
      'parking',
      'airport',
      'mapUrl',
      'travel',
      'accommodation',
      'menuNote',
      'dietaryNote',
      'registryNote',
    ]
  ) {
    raw[key] = String(formData.get(key) ?? '');
  }
  const questions = formData.getAll('faqQ').map(String);
  const answers = formData.getAll('faqA').map(String);
  raw.faq = questions.map((q, i) => ({ q, a: answers[i] ?? '' }));
  const content = sanitizeWebsiteContent(raw);
  const noindex = formData.get('noindex') !== null;

  const err = await upsertWebsite(weddingId, { content, noindex });
  if (err) return { error: err };
  revalidatePath(websitePath(weddingId));
  redirect(websitePath(weddingId));
}

export async function saveWebsiteSections(
  weddingId: string,
  sections: SectionConfig[],
): Promise<{ error?: string }> {
  await requireRole(weddingId, 'planner');
  const clean = normalizeSections(sections, WEBSITE_SECTION_IDS);
  const err = await upsertWebsite(weddingId, { sections: clean });
  if (err) return { error: err };
  revalidatePath(websitePath(weddingId));
  revalidatePath(`/w/[slug]`, 'page');
  return {};
}

// ---------------------------------------------------------------------------
// Public reads (world-readable RLS: published websites only)
// ---------------------------------------------------------------------------

export interface PublishedWebsite {
  wedding: {
    id: string;
    slug: string;
    title: string;
    theme_id: string;
    theme_overrides: Record<string, string>;
    default_locale: string;
  };
  website: WebsiteRow;
  events: {
    id: string;
    name: string;
    starts_at: string | null;
    timezone: string;
    venue: string | null;
    address: string | null;
    description: string | null;
    dress_code: string | null;
  }[];
  monogram: { initials: string; style: string; shape: string } | null;
  gallery: { id: string; url: string; label: string | null }[];
  guestbook: { guest_name: string; message: string }[];
  songs: { guest_name: string; title: string; artist: string; message: string }[];
  games: { kind: string; title: string; description: string }[];
  capsule: { guest_name: string; message: string }[];
  welcomeVideoUrl: string | null;
}

export async function getPublishedWebsite(slug: string): Promise<PublishedWebsite | null> {
  const supabase = await createServerSupabaseClient();
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, slug, title, theme_id, theme_overrides, default_locale')
    .eq('slug', slug)
    .maybeSingle();
  if (!wedding) return null;
  const w = wedding as {
    id: string;
    slug: string;
    title: string;
    theme_id: string;
    theme_overrides: Record<string, string>;
    default_locale: string;
  };

  const { data: site } = await supabase
    .from('wedding_websites')
    .select('is_published, noindex, sections, content')
    .eq('wedding_id', w.id)
    .maybeSingle();
  const s = site as {
    is_published: boolean;
    noindex: boolean;
    sections: unknown;
    content: unknown;
  } | null;
  // Unpublished (or never configured) weddings have no public page.
  if (!s || !s.is_published) return null;

  const { data: events } = await supabase
    .from('events')
    .select('id, name, starts_at, timezone, venue, address, description, dress_code')
    .eq('wedding_id', w.id)
    .order('starts_at', { ascending: true, nullsFirst: false });

  const { data: monogram } = await supabase
    .from('monograms')
    .select('initials, style, shape')
    .eq('wedding_id', w.id)
    .maybeSingle();

  // Gallery: only approved-public/public media; storage serves the bytes via
  // the public-read policy, so plain public URLs suffice (no signed URLs).
  const { data: media } = await supabase
    .from('media')
    .select('id, path, label')
    .eq('wedding_id', w.id)
    .eq('kind', 'image')
    .in('visibility', ['approved-public', 'public'])
    .order('created_at', { ascending: false })
    .limit(24);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const gallery = ((media ?? []) as { id: string; path: string; label: string | null }[]).map(
    (m) => ({
      id: m.id,
      url: `${base}/storage/v1/object/public/wedding-media/${m.path}`,
      label: m.label,
    }),
  );

  // Engagement (Phase 10): approved content only — RLS already filters to
  // publicly visible rows for anonymous readers.
  const [{ data: guestbook }, { data: songs }, { data: games }, { data: capsule }] =
    await Promise.all([
      supabase
        .from('guestbook_entries')
        .select('guest_name, message')
        .eq('wedding_id', w.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('song_requests')
        .select('guest_name, title, artist, message')
        .eq('wedding_id', w.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('games')
        .select('kind, title, description')
        .eq('wedding_id', w.id)
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('time_capsules')
        .select('guest_name, message')
        .eq('wedding_id', w.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

  const content = sanitizeWebsiteContent(s.content);
  let welcomeVideoUrl: string | null = null;
  if (content.welcomeVideo) {
    const { data: video } = await supabase
      .from('media')
      .select('path')
      .eq('id', content.welcomeVideo)
      .eq('wedding_id', w.id)
      .maybeSingle();
    const path = (video as { path?: string } | null)?.path;
    if (path) welcomeVideoUrl = `${base}/storage/v1/object/public/wedding-media/${path}`;
  }

  return {
    wedding: {
      id: w.id,
      slug: w.slug,
      title: w.title,
      theme_id: w.theme_id ?? 'editorial',
      theme_overrides: w.theme_overrides ?? {},
      default_locale: w.default_locale ?? 'en',
    },
    website: {
      wedding_id: w.id,
      is_published: s.is_published,
      noindex: s.noindex,
      sections: normalizeSections(s.sections, WEBSITE_SECTION_IDS),
      content: sanitizeWebsiteContent(s.content),
    },
    events: (events ?? []) as PublishedWebsite['events'],
    monogram: (monogram ?? null) as PublishedWebsite['monogram'],
    gallery,
    guestbook: (guestbook ?? []) as PublishedWebsite['guestbook'],
    songs: (songs ?? []) as PublishedWebsite['songs'],
    games: (games ?? []) as PublishedWebsite['games'],
    capsule: (capsule ?? []) as { guest_name: string; message: string }[],
    welcomeVideoUrl,
  };
}
