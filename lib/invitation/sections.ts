/**
 * Section model — Phase 3 invitation builder, extended in Phase 4 for the
 * public wedding website. Order = array order; enabled flags control
 * visibility. Stored as JSONB; unknown/future ids are preserved on load and
 * merged with defaults so new sections appear without wiping customization.
 */

export const SECTION_IDS = [
  'hero',
  'message',
  'couple',
  'events',
  'venue',
  'gallery',
  'rsvp',
  'footer',
] as const;

/** Website sections: invitation set plus story, logistics, and engagement. */
export const WEBSITE_SECTION_IDS = [
  'hero',
  'message',
  'couple',
  'story',
  'events',
  'schedule',
  'venue',
  'travel',
  'accommodation',
  'menu',
  'faq',
  'registry',
  'gallery',
  'guestbook',
  'photowall',
  'songs',
  'games',
  'capsule',
  'rsvp',
  'footer',
] as const;

export type SectionId = (typeof SECTION_IDS)[number] | (string & {});

export interface SectionConfig {
  id: string;
  enabled: boolean;
}

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  message: 'Invitation message',
  couple: 'Couple',
  story: 'Love story',
  events: 'Events',
  schedule: 'Order of the day',
  venue: 'Venue',
  travel: 'Travel',
  accommodation: 'Accommodation',
  menu: 'Menu',
  faq: 'FAQ',
  registry: 'Registry',
  gallery: 'Gallery',
  guestbook: 'Guestbook',
  photowall: 'Photo wall',
  songs: 'Song requests',
  games: 'Games',
  capsule: 'Time capsule',
  rsvp: 'RSVP',
  footer: 'Footer',
};

export function sectionLabel(id: string): string {
  return SECTION_LABELS[id] ?? id;
}

export function defaultSections(): SectionConfig[] {
  return SECTION_IDS.map((id) => ({ id, enabled: true }));
}

export function defaultWebsiteSections(): SectionConfig[] {
  // All website sections default on now that engagement is real (Phase 10).
  return WEBSITE_SECTION_IDS.map((id) => ({ id, enabled: true }));
}

/** Merge stored config over defaults: keeps order of stored, appends new. */
export function normalizeSections(
  stored: unknown,
  defaults: readonly string[] = SECTION_IDS,
): SectionConfig[] {
  const fallback = defaults === SECTION_IDS ? defaultSections() : defaultWebsiteSections();
  if (!Array.isArray(stored)) return fallback;
  const seen = new Set<string>();
  const out: SectionConfig[] = [];
  for (const item of stored) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, enabled } = item as { id?: unknown; enabled?: unknown };
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, enabled: enabled !== false });
  }
  for (const id of defaults) {
    if (!seen.has(id)) out.push({ id, enabled: true });
  }
  return out;
}

export function toggleSection(sections: SectionConfig[], id: string): SectionConfig[] {
  return sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
}

export function moveSection(
  sections: SectionConfig[],
  id: string,
  direction: -1 | 1,
): SectionConfig[] {
  const idx = sections.findIndex((s) => s.id === id);
  const swap = idx + direction;
  if (idx === -1 || swap < 0 || swap >= sections.length) return sections;
  const next = [...sections];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
}
