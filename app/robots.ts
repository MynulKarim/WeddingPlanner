import type { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/supabase/server';

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
  };
}
