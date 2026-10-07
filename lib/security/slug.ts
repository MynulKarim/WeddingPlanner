/**
 * Wedding slug utilities — Phase 1.
 * Slugs are lowercase alphanumeric with hyphens, unique per weddings table.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 60;

export function isValidSlug(slug: string): boolean {
  return (
    slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_RE.test(slug)
  );
}

/** Normalize free text ("Ayesha & Karim 2027!") into a slug ("ayesha-karim-2027"). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');
}

/**
 * Suggest an available slug given taken ones (e.g. "mia-rayan", "mia-rayan-2").
 * Pure function so uniqueness logic is unit-testable; DB check happens in lib/db.
 */
export function suggestSlug(base: string, taken: Set<string> | string[]): string {
  const takenSet = taken instanceof Set ? taken : new Set(taken);
  const clean = slugify(base) || 'wedding';
  if (!takenSet.has(clean)) return clean;
  for (let i = 2; ; i += 1) {
    const candidate = `${clean}-${i}`;
    if (!takenSet.has(candidate)) return candidate;
  }
}
