import { describe, expect, it } from 'vitest';
import { sanitizeWebsiteContent } from '@/lib/website/content';
import {
  defaultWebsiteSections,
  normalizeSections,
  WEBSITE_SECTION_IDS,
} from '@/lib/invitation/sections';

describe('website sections', () => {
  it('defaults to the full website set, all enabled', () => {
    const s = defaultWebsiteSections();
    expect(s.map((x) => x.id)).toEqual([...WEBSITE_SECTION_IDS]);
    expect(s.every((x) => x.enabled)).toBe(true);
  });

  it('normalizes against website defaults', () => {
    const s = normalizeSections([{ id: 'faq', enabled: false }], WEBSITE_SECTION_IDS);
    expect(s[0]).toEqual({ id: 'faq', enabled: false });
    expect(s.find((x) => x.id === 'story')?.enabled).toBe(true);
  });
});

describe('website content sanitization', () => {
  it('keeps known fields, drops unknown, caps lengths', () => {
    const out = sanitizeWebsiteContent({
      partnerA: '  Ayesha  ',
      story: 'x'.repeat(6000),
      evil: '<script>',
      faq: [
        { q: 'Dress code?', a: 'Formal' },
        { q: '', a: 'empty question dropped' },
        { q: 'x'.repeat(400), a: 'long question clipped' },
      ],
    });
    expect(out.partnerA).toBe('Ayesha');
    expect(out.story?.length).toBe(5000);
    expect(out).not.toHaveProperty('evil');
    expect(out.faq).toHaveLength(2);
    expect(out.faq?.[1].q.length).toBe(300);
  });

  it('returns empty for garbage input', () => {
    expect(sanitizeWebsiteContent(null)).toEqual({});
    expect(sanitizeWebsiteContent('nope')).toEqual({});
    expect(sanitizeWebsiteContent({ faq: 'not-an-array' })).toEqual({});
  });
});
