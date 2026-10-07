import { describe, expect, it } from 'vitest';
import {
  defaultSections,
  moveSection,
  normalizeSections,
  sectionLabel,
  toggleSection,
} from '@/lib/invitation/sections';
import {
  isValidInitials,
  monogramToSvg,
} from '@/lib/monogram/svg';
import {
  extensionForMime,
  kindForMime,
  validateMediaFile,
} from '@/lib/media/validation';

describe('invitation sections', () => {
  it('defaults to all enabled in order', () => {
    const s = defaultSections();
    expect(s.length).toBeGreaterThanOrEqual(8);
    expect(s.every((x) => x.enabled)).toBe(true);
  });

  it('normalizes stored config and appends new sections', () => {
    const s = normalizeSections([{ id: 'rsvp', enabled: false }, { id: 'bogus', enabled: true }]);
    expect(s[0]).toEqual({ id: 'rsvp', enabled: false });
    expect(s.find((x) => x.id === 'bogus')?.enabled).toBe(true);
    expect(s.find((x) => x.id === 'hero')?.enabled).toBe(true);
    expect(normalizeSections('garbage')).toEqual(defaultSections());
  });

  it('toggles and reorders', () => {
    const s = defaultSections();
    const toggled = toggleSection(s, 'rsvp');
    expect(toggled.find((x) => x.id === 'rsvp')?.enabled).toBe(false);
    const moved = moveSection(s, 'footer', -1);
    expect(moved[moved.length - 2].id).toBe('footer');
    expect(moveSection(s, 'hero', -1)).toEqual(s);
    expect(sectionLabel('hero')).toBe('Hero');
  });
});

describe('monogram SVG', () => {
  it('validates initials', () => {
    expect(isValidInitials('A & K')).toBe(true);
    expect(isValidInitials('')).toBe(false);
    expect(isValidInitials('TOOLONGNAME')).toBe(false);
    expect(isValidInitials('<svg>')).toBe(false);
  });

  it('renders initials with shape variants', () => {
    const seal = monogramToSvg({ initials: 'A&K', style: 'serif', shape: 'seal', accent: '#000', ink: '#111' });
    expect(seal).toContain('A&amp;K');
    expect(seal).toContain('<circle');
    const minimal = monogramToSvg({ initials: 'AK', style: 'modern', shape: 'minimal', accent: '#000', ink: '#111' });
    expect(minimal).not.toContain('<circle');
    expect(minimal).toContain('AK');
  });
});

describe('media validation', () => {
  it('accepts images/video within limits', () => {
    expect(validateMediaFile({ mime: 'image/jpeg', sizeBytes: 1000 })).toBeNull();
    expect(validateMediaFile({ mime: 'video/mp4', sizeBytes: 10 * 1024 * 1024 })).toBeNull();
    expect(kindForMime('image/png')).toBe('image');
    expect(kindForMime('video/webm')).toBe('video');
    expect(extensionForMime('image/webp')).toBe('webp');
  });

  it('rejects bad types, empty and oversized files', () => {
    expect(validateMediaFile({ mime: 'application/pdf', sizeBytes: 100 })).toMatch(/Only/);
    expect(validateMediaFile({ mime: 'image/png', sizeBytes: 0 })).toMatch(/empty/);
    expect(validateMediaFile({ mime: 'image/png', sizeBytes: 9 * 1024 * 1024 })).toMatch(/8 MB/);
    expect(validateMediaFile({ mime: 'video/mp4', sizeBytes: 64 * 1024 * 1024 })).toMatch(/32 MB/);
    expect(kindForMime('text/plain')).toBeNull();
  });
});
