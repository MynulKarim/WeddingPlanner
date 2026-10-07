import { describe, expect, it } from 'vitest';
import {
  applyGuestFilters,
  computeGuestStats,
  distinctTags,
  type HubGuest,
} from '@/lib/guests/hub';
import { validateEventInput } from '@/validations/event';
import { validateGuestInput } from '@/validations/guest';

function guest(over: Partial<HubGuest> & { display_name: string }): HubGuest {
  return {
    id: over.display_name,
    email: null,
    phone: null,
    notes: null,
    tags: [],
    is_child: false,
    allow_plus_one: false,
    locale: null,
    household_id: null,
    household_label: null,
    events: [],
    ...over,
  };
}

const GUESTS: HubGuest[] = [
  guest({
    display_name: 'Aunt Salma',
    email: 'salma@example.com',
    tags: ['vip', 'family'],
    household_id: 'h1',
    household_label: 'Rahman',
    events: [{ event_id: 'e1', event_name: 'Ceremony' }],
  }),
  guest({
    display_name: 'Little Zayn',
    is_child: true,
    household_id: 'h1',
    household_label: 'Rahman',
    events: [],
  }),
  guest({
    display_name: 'Karim Friend',
    allow_plus_one: true,
    tags: ['friends'],
    events: [
      { event_id: 'e1', event_name: 'Ceremony' },
      { event_id: 'e2', event_name: 'Reception' },
    ],
  }),
];

describe('guest filters', () => {
  it('searches names and emails', () => {
    expect(applyGuestFilters(GUESTS, { q: 'zayn' })).toHaveLength(1);
    expect(applyGuestFilters(GUESTS, { q: 'SALMA@EXAMPLE' })).toHaveLength(1);
    expect(applyGuestFilters(GUESTS, { q: 'nobody' })).toHaveLength(0);
  });

  it('filters by tag, event, assignment, type, plus-one', () => {
    expect(applyGuestFilters(GUESTS, { tag: 'vip' })).toHaveLength(1);
    expect(applyGuestFilters(GUESTS, { eventId: 'e2' })).toHaveLength(1);
    expect(applyGuestFilters(GUESTS, { unassignedOnly: true })).toHaveLength(1);
    expect(applyGuestFilters(GUESTS, { type: 'child' })).toHaveLength(1);
    expect(applyGuestFilters(GUESTS, { type: 'adult' })).toHaveLength(2);
    expect(applyGuestFilters(GUESTS, { plusOneOnly: true })).toHaveLength(1);
  });
});

describe('guest stats', () => {
  it('computes hub statistics', () => {
    const stats = computeGuestStats(GUESTS);
    expect(stats).toMatchObject({
      total: 3,
      adults: 2,
      children: 1,
      plusOneEligible: 1,
      assigned: 2,
      unassigned: 1,
      households: 1,
    });
    expect(stats.perEvent).toHaveLength(2);
    expect(distinctTags(GUESTS)).toEqual(['family', 'friends', 'vip']);
  });
});

describe('event + guest validation', () => {
  it('validates event input', () => {
    expect(
      validateEventInput({ name: '', startsAt: '', timezone: '', venue: '', visibility: 'x' }),
    ).toHaveLength(3);
    expect(
      validateEventInput({
        name: 'Ceremony',
        startsAt: 'not-a-date',
        timezone: 'UTC',
        venue: '',
        visibility: 'public',
      }),
    ).toHaveLength(1);
    expect(
      validateEventInput({
        name: 'Ceremony',
        startsAt: '',
        timezone: 'UTC',
        venue: '',
        visibility: 'invited-only',
      }),
    ).toHaveLength(0);
  });

  it('validates guest input', () => {
    expect(validateGuestInput({ displayName: '', email: 'bad', locale: 'xx' })).toHaveLength(3);
    expect(validateGuestInput({ displayName: 'A', email: '', locale: '' })).toHaveLength(0);
  });
});
