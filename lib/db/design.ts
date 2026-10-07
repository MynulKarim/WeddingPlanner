/**
 * Design data access — Phase 3 (tenant-scoped, RLS-enforced).
 * Theme selection, customization, invitation layout, monograms, media.
 * Mutations require planner+; staff have read access.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { DEFAULT_THEME_ID, type ThemeOverrides } from '@/lib/themes/tokens';
import {
  normalizeSections,
  type SectionConfig,
} from '@/lib/invitation/sections';
import {
  MONOGRAM_SHAPES,
  MONOGRAM_STYLES,
  isValidInitials,
  type MonogramShape,
  type MonogramStyle,
} from '@/lib/monogram/svg';
import {
  extensionForMime,
  kindForMime,
  validateMediaFile,
} from '@/lib/media/validation';

const MEDIA_BUCKET = 'wedding-media';

export interface MonogramRow {
  wedding_id: string;
  initials: string;
  style: MonogramStyle;
  shape: MonogramShape;
}

export interface MediaRow {
  id: string;
  wedding_id: string;
  path: string;
  kind: 'image' | 'video';
  mime: string;
  size_bytes: number;
  visibility: string;
  label: string | null;
  url: string | null;
}

export interface DesignState {
  themeId: string;
  defaultLocale: string;
  overrides: ThemeOverrides;
  sections: SectionConfig[];
  monogram: MonogramRow | null;
  media: MediaRow[];
}

function designPath(weddingId: string): string {
  return `/dashboard/weddings/${weddingId}/design`;
}

export async function getDesign(weddingId: string): Promise<DesignState> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();

  const { data: wedding, error: wError } = await supabase
    .from('weddings')
    .select('theme_id, theme_overrides, default_locale')
    .eq('id', weddingId)
    .maybeSingle();
  if (wError) throw new Error(wError.message);

  const { data: layout } = await supabase
    .from('invitation_designs')
    .select('sections')
    .eq('wedding_id', weddingId)
    .maybeSingle();

  const { data: monogram } = await supabase
    .from('monograms')
    .select('wedding_id, initials, style, shape')
    .eq('wedding_id', weddingId)
    .maybeSingle();

  const { data: media } = await supabase
    .from('media')
    .select('id, wedding_id, path, kind, mime, size_bytes, visibility, label')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false });

  const rows = (media ?? []) as Omit<MediaRow, 'url'>[];
  const withUrls: MediaRow[] = await Promise.all(
    rows.map(async (m) => {
      const { data } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(m.path, 3600);
      return { ...m, url: data?.signedUrl ?? null };
    }),
  );

  return {
    themeId:
      typeof wedding?.theme_id === 'string' && wedding.theme_id
        ? wedding.theme_id
        : DEFAULT_THEME_ID,
    defaultLocale:
      typeof wedding?.default_locale === 'string' && wedding.default_locale
        ? wedding.default_locale
        : 'en',
    overrides: (wedding?.theme_overrides ?? {}) as ThemeOverrides,
    sections: normalizeSections(
      (layout as { sections?: unknown } | null)?.sections ?? [],
    ),
    monogram: (monogram ?? null) as MonogramRow | null,
    media: withUrls,
  };
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export async function setTheme(weddingId: string, themeId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const { THEMES } = await import('@/lib/themes/tokens');
  if (!THEMES.some((t) => t.id === themeId)) {
    throw new Error('Unknown theme.');
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('weddings')
    .update({ theme_id: themeId })
    .eq('id', weddingId);
  if (error) throw new Error(error.message);
  redirect(designPath(weddingId));
}

export interface OverridesState {
  error?: string;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export async function setOverrides(
  weddingId: string,
  _prev: OverridesState,
  formData: FormData,
): Promise<OverridesState> {
  await requireRole(weddingId, 'planner');
  const color = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v && HEX_RE.test(v) ? v.toLowerCase() : undefined;
  };
  const overrides: ThemeOverrides = {};
  const assign = (k: keyof ThemeOverrides, v: string | undefined) => {
    if (v) overrides[k] = v;
  };
  assign('accent', color('accent'));
  assign('background', color('background'));
  assign('surface', color('surface'));
  assign('ink', color('ink'));
  const radius = String(formData.get('radius') ?? '').trim();
  if (/^\d+(\.\d+)?(rem|px)$/.test(radius)) overrides.radius = radius;
  const displayFont = String(formData.get('displayFont') ?? '').trim();
  const bodyFont = String(formData.get('bodyFont') ?? '').trim();
  const { fontStack } = await import('@/lib/themes/tokens');
  if (displayFont && fontStack(displayFont)) overrides.displayFont = displayFont;
  if (bodyFont && fontStack(bodyFont)) overrides.bodyFont = bodyFont;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('weddings')
    .update({ theme_overrides: overrides })
    .eq('id', weddingId);
  if (error) return { error: error.message };
  redirect(designPath(weddingId));
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function saveSections(
  weddingId: string,
  sections: SectionConfig[],
): Promise<{ error?: string }> {
  await requireRole(weddingId, 'planner');
  const clean = normalizeSections(sections);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('invitation_designs')
    .upsert({ wedding_id: weddingId, sections: clean });
  if (error) return { error: error.message };
  revalidatePath(designPath(weddingId));
  return {};
}

// ---------------------------------------------------------------------------
// Monogram
// ---------------------------------------------------------------------------

export async function saveMonogram(
  weddingId: string,
  input: { initials: string; style: string; shape: string },
): Promise<{ error?: string }> {
  await requireRole(weddingId, 'planner');
  const initials = input.initials.trim();
  if (!isValidInitials(initials)) {
    return { error: 'Initials must be 1–6 letters (A–Z, &, ·).' };
  }
  if (!(MONOGRAM_STYLES as readonly string[]).includes(input.style)) {
    return { error: 'Unknown monogram style.' };
  }
  if (!(MONOGRAM_SHAPES as readonly string[]).includes(input.shape)) {
    return { error: 'Unknown monogram shape.' };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('monograms').upsert({
    wedding_id: weddingId,
    initials,
    style: input.style,
    shape: input.shape,
  });
  if (error) return { error: error.message };
  revalidatePath(designPath(weddingId));
  return {};
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface UploadState {
  error?: string;
  ok?: boolean;
}

export async function uploadMedia(
  weddingId: string,
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireRole(weddingId, 'planner');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to upload.' };
  }
  const problem = validateMediaFile({ mime: file.type, sizeBytes: file.size });
  if (problem) return { error: problem };
  const kind = kindForMime(file.type);
  if (!kind) return { error: 'Unsupported file type.' };

  const label = String(formData.get('label') ?? '').trim() || null;
  const visibility = String(formData.get('visibility') ?? 'guest-only');
  if (!['private', 'guest-only', 'approved-public', 'public'].includes(visibility)) {
    return { error: 'Invalid visibility.' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = `${weddingId}/${crypto.randomUUID()}.${extensionForMime(file.type)}`;
  const { error: upError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upError) return { error: upError.message };

  const { error: rowError } = await supabase.from('media').insert({
    wedding_id: weddingId,
    path,
    kind,
    mime: file.type,
    size_bytes: file.size,
    visibility,
    label,
    created_by: user?.id ?? null,
  });
  if (rowError) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return { error: rowError.message };
  }
  revalidatePath(designPath(weddingId));
  return { ok: true };
}

export async function deleteMedia(weddingId: string, mediaId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('media')
    .select('path')
    .eq('id', mediaId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Media not found.');
  await supabase.storage.from(MEDIA_BUCKET).remove([(data as { path: string }).path]);
  const { error: delError } = await supabase
    .from('media')
    .delete()
    .eq('id', mediaId)
    .eq('wedding_id', weddingId);
  if (delError) throw new Error(delError.message);
  revalidatePath(designPath(weddingId));
}
