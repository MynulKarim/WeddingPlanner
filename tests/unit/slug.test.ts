import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify, suggestSlug } from '@/lib/security/slug';

describe('slug validation', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('ayesha-karim')).toBe(true);
    expect(isValidSlug('w2027')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Ayesha')).toBe(false);
    expect(isValidSlug('ayesha_karim')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
    expect(isValidSlug('double--hyphen')).toBe(false);
    expect(isValidSlug('a'.repeat(61))).toBe(false);
  });
});

describe('slugify', () => {
  it('normalizes free text', () => {
    expect(slugify('Ayesha & Karim 2027!')).toBe('ayesha-karim-2027');
    expect(slugify('  Sangeet Night  ')).toBe('sangeet-night');
  });
});

describe('suggestSlug', () => {
  it('returns base when free, suffixed when taken', () => {
    expect(suggestSlug('Mia & Rayan', [])).toBe('mia-rayan');
    expect(suggestSlug('Mia & Rayan', ['mia-rayan'])).toBe('mia-rayan-2');
    expect(suggestSlug('Mia & Rayan', ['mia-rayan', 'mia-rayan-2'])).toBe('mia-rayan-3');
  });
});
