/**
 * Minimal wedding-input validation — Phase 0.
 * Replaced/augmented by zod schemas per domain in later phases.
 */

export interface WeddingInput {
  title: string;
  slug: string;
  timezone: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateWeddingInput(input: WeddingInput): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('title is required');
  if (!SLUG_RE.test(input.slug)) errors.push('slug must be lowercase alphanumeric with hyphens');
  if (!input.timezone.trim()) errors.push('timezone is required');
  return errors;
}
