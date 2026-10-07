import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAppUrl } from '@/lib/supabase/server';

/** Public sitemap: published weddings only (+ static pages). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
  ];
  if (!url || !anonKey) return entries;
  try {
    const supabase = createClient(url, anonKey);
    const { data } = await supabase
      .from('weddings')
      .select('slug, wedding_websites!inner(is_published)');
    for (const w of (data ?? []) as { slug: string }[]) {
      entries.push({ url: `${base}/w/${w.slug}`, lastModified: new Date() });
    }
  } catch {
    // Sitemap degrades to static pages when Supabase is unreachable.
  }
  return entries;
}
