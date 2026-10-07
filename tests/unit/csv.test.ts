import { describe, expect, it } from 'vitest';
import {
  buildGuestsCsv,
  parseGuestsCsv,
  type GuestCsvRow,
} from '@/lib/guests/csv';

const SAMPLE = `display_name,email,phone,household,is_child,allow_plus_one,locale,tags,notes,events
"Aunt Salma",salma@example.com,+8801,The Rahman Family,,y,en,"vip; family",Vegetarian,"Ceremony; Reception"
Little Zayn,,,,y,,,,,"Ceremony"
No Email Guest,,,,,,,,,
,noname@example.com,,,,,,,,,
`;

describe('guest CSV parsing', () => {
  it('parses rows, booleans, lists, and quoted cells', () => {
    const { rows, errors } = parseGuestsCsv(SAMPLE);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(5);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      display_name: 'Aunt Salma',
      email: 'salma@example.com',
      household: 'The Rahman Family',
      is_child: false,
      allow_plus_one: true,
      locale: 'en',
      tags: ['vip', 'family'],
      events: ['Ceremony', 'Reception'],
    });
    expect(rows[1].is_child).toBe(true);
    expect(rows[1].tags).toEqual([]);
  });

  it('rejects empty files and missing headers', () => {
    expect(parseGuestsCsv('').errors).toHaveLength(1);
    expect(parseGuestsCsv('name,email\nfoo,bar').errors[0].message).toMatch(
      /display_name/,
    );
  });
});

describe('guest CSV building', () => {
  it('round-trips through the parser', () => {
    const rows: GuestCsvRow[] = [
      {
        display_name: 'Aunt, "Salma"',
        email: 's@example.com',
        phone: '',
        household: 'Rahman',
        is_child: false,
        allow_plus_one: true,
        locale: 'en',
        tags: ['vip'],
        notes: '',
        events: ['Ceremony'],
      },
    ];
    const csv = buildGuestsCsv(rows);
    const { rows: back, errors } = parseGuestsCsv(csv);
    expect(errors).toEqual([]);
    expect(back[0].display_name).toBe('Aunt, "Salma"');
    expect(back[0].allow_plus_one).toBe(true);
    expect(back[0].tags).toEqual(['vip']);
  });
});
