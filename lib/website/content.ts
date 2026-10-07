/**
 * Website content model — Phase 4 (pure, unit-tested).
 * Free-text content for website sections, stored as JSONB in
 * wedding_websites.content. Sanitized on save: unknown keys dropped,
 * lengths capped, FAQ entries validated.
 */

export interface FaqEntry {
  q: string;
  a: string;
}

export interface WebsiteContent {
  partnerA?: string;
  partnerB?: string;
  tagline?: string;
  story?: string;
  venueNote?: string;
  directions?: string;
  transportation?: string;
  parking?: string;
  airport?: string;
  mapUrl?: string;
  travel?: string;
  accommodation?: string;
  menuNote?: string;
  dietaryNote?: string;
  registryNote?: string;
  welcomeVideo?: string;
  faq?: FaqEntry[];
}

const LIMITS: Record<string, number> = {
  partnerA: 80,
  partnerB: 80,
  tagline: 160,
  story: 5000,
  venueNote: 2000,
  directions: 2000,
  transportation: 2000,
  parking: 1000,
  airport: 1000,
  travel: 2000,
  accommodation: 2000,
  menuNote: 2000,
  dietaryNote: 2000,
  registryNote: 2000,
};

function clip(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, limit);
}

/** Sanitize arbitrary input into WebsiteContent. Never throws. */
export function sanitizeWebsiteContent(input: unknown): WebsiteContent {
  if (typeof input !== 'object' || input === null) return {};
  const src = input as Record<string, unknown>;
  const out: WebsiteContent = {};
  for (const [key, limit] of Object.entries(LIMITS)) {
    const v = clip(src[key], limit);
    if (v !== undefined) (out as Record<string, string>)[key] = v;
  }
  // Map links must be https (rendered as link + iframe embed).
  const mapUrl = typeof src.mapUrl === 'string' ? src.mapUrl.trim().slice(0, 500) : '';
  if (/^https:\/\//i.test(mapUrl)) out.mapUrl = mapUrl;
  // Welcome video references a media-library video id.
  if (typeof src.welcomeVideo === 'string' && /^[0-9a-f-]{36}$/i.test(src.welcomeVideo.trim())) {
    out.welcomeVideo = src.welcomeVideo.trim();
  }
  if (Array.isArray(src.faq)) {
    const faq: FaqEntry[] = [];
    for (const entry of src.faq.slice(0, 50)) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { q, a } = entry as { q?: unknown; a?: unknown };
      if (typeof q !== 'string' || typeof a !== 'string') continue;
      const qq = q.trim().slice(0, 300);
      const aa = a.trim().slice(0, 2000);
      if (qq && aa) faq.push({ q: qq, a: aa });
    }
    if (faq.length > 0) out.faq = faq;
  }
  return out;
}
