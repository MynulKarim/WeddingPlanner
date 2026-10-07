/**
 * Supabase public config — Phase 1.
 * Environment-only helpers safe to import from Server AND Client Components.
 */

export function getSupabasePublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicConfig();
  return url.length > 0 && anonKey.length > 0;
}
