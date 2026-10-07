import { describe, expect, it } from 'vitest';
import {
  buildDocument,
  fitName,
  formatPrintDate,
  isStationeryDoc,
  stationeryLabel,
  STATIONERY_DOCS,
  type StationeryData,
} from '@/lib/pdf/documents';
import { THEMES } from '@/lib/themes/tokens';
import { chromiumAvailable } from '@/lib/pdf/render';

function sampleData(): StationeryData {
  return {
    weddingTitle: 'Ayesha & Karim',
    websiteUrl: 'https://example.com/w/a-k',
    theme: THEMES[0],
    monogramSvg: '<svg xmlns="http://www.w3.org/2000/svg"><text>A&K</text></svg>',
    coverUrl: null,
    events: [
      {
        id: 'e1',
        name: 'Ceremony',
        starts_at: '2027-02-14T16:00:00Z',
        timezone: 'UTC',
        venue: 'Grand Hall',
        address: null,
        description: null,
        dress_code: 'Formal',
      },
    ],
    guests: [
      { id: 'g1', name: 'Aunt Salma Rahman', household: 'Rahman', table: 'Table 1', events: ['Ceremony'] },
      { id: 'g2', name: 'Unseated Ulysses Underwood the Third', household: null, table: null, events: [] },
    ],
    venueNote: 'Doors open at 3pm.',
    menuNote: 'Three courses.',
    dietaryNote: 'Halal options.',
  };
}

describe('stationery documents', () => {
  it('names all six kinds', () => {
    expect(STATIONERY_DOCS).toHaveLength(6);
    expect(isStationeryDoc('menu')).toBe(true);
    expect(isStationeryDoc('nope')).toBe(false);
    expect(stationeryLabel('thank-you')).toBe('Thank-you cards');
  });

  it('fits long names with ellipsis', () => {
    expect(fitName('Jo')).toBe('Jo');
    expect(fitName('Unseated Ulysses Underwood the Third', 26)).toBe('Unseated Ulysses Underwoo…');
    expect(formatPrintDate('2027-02-14T16:00:00Z')).toContain('2027');
    expect(formatPrintDate(null)).toBe('');
  });

  it('builds every kind with print CSS', () => {
    for (const doc of STATIONERY_DOCS) {
      const built = buildDocument(doc, sampleData());
      expect(built.html).toContain('@page');
      expect(built.html).toContain('print-color-adjust: exact');
      expect(built.html).toContain('--wp-accent');
    }
  });

  it('escapes guest content', () => {
    const data = sampleData();
    data.guests = [
      { id: 'x', name: '<script>alert(1)</script>', household: null, table: null, events: [] },
    ];
    const built = buildDocument('thank-you', data);
    expect(built.html).not.toContain('<script>');
    expect(built.html).toContain('&lt;script&gt;');
  });

  it('handles empty data gracefully', () => {
    const empty: StationeryData = {
      ...sampleData(),
      events: [],
      guests: [],
      monogramSvg: null,
      venueNote: null,
      menuNote: null,
      dietaryNote: null,
    };
    expect(buildDocument('place-cards', empty).html).toContain('No seated guests');
    expect(buildDocument('seating-chart', empty).html).toContain('No seats assigned');
    expect(buildDocument('menu', empty).html).toContain('Menu to follow');
  });

  it('scopes to single guests and events', () => {
    const one = buildDocument('invitation', sampleData(), { guestId: 'g1' });
    expect(one.html).toContain('Aunt Salma Rahman');
    expect(one.html).not.toContain('Unseated Ulysses');
    const menu = buildDocument(
      'menu',
      { ...sampleData(), menuNote: null, dietaryNote: null },
      { eventId: 'missing' },
    );
    expect(menu.html).toContain('Menu to follow');
  });
});

describe('theme coverage', () => {
  it('renders every theme with its tokens', () => {
    for (const theme of THEMES) {
      const built = buildDocument('save-the-date', { ...sampleData(), theme });
      expect(built.html).toContain(`--wp-accent: ${theme.colors.accent}`);
      expect(built.html).toContain(theme.typography.display.split(',')[0]);
    }
  });
});

describe('chromium pipeline', () => {
  it('renders a real PDF when a browser is available', async () => {
    if (!(await chromiumAvailable())) {
      console.warn('chromium unavailable — PDF render test skipped');
      return;
    }
    const { renderPdf } = await import('@/lib/pdf/render');
    const built = buildDocument('save-the-date', sampleData());
    const pdf = await renderPdf(built.html);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
