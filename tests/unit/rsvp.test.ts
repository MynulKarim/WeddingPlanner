import { describe, expect, it } from 'vitest';
import {
  hashInvitationToken,
  verifyInvitationToken,
} from '@/lib/security/token-hash';
import {
  isPastDeadline,
  normalizeSubmission,
  questionsForEvent,
  validateSubmission,
  type EventSubmission,
  type RsvpScope,
} from '@/lib/rsvp/rules';

function scope(over: Partial<RsvpScope> = {}): RsvpScope {
  return {
    guestId: 'g1',
    weddingId: 'w1',
    allowPlusOne: true,
    eventIds: ['e1', 'e2'],
    deadline: null,
    now: '2027-01-01T00:00:00.000Z',
    ...over,
  };
}

function sub(over: Partial<EventSubmission> = {}): EventSubmission {
  return {
    eventId: 'e1',
    status: 'attending',
    plusOne: false,
    plusOneName: '',
    dietary: '',
    allergies: '',
    notes: '',
    answers: {},
    ...over,
  };
}

describe('token hashing', () => {
  it('hashes one-way and verifies constant-time', () => {
    const hash = hashInvitationToken('token-abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('token-abc');
    expect(verifyInvitationToken('token-abc', hash)).toBe(true);
    expect(verifyInvitationToken('token-abd', hash)).toBe(false);
    expect(verifyInvitationToken('token-abc', '0'.repeat(64))).toBe(false);
  });
});

describe('deadline + question scoping', () => {
  it('detects past deadlines', () => {
    expect(isPastDeadline(null, '2027-01-01')).toBe(false);
    expect(isPastDeadline('2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z')).toBe(true);
    expect(isPastDeadline('2028-01-01T00:00:00Z', '2027-01-01T00:00:00Z')).toBe(false);
  });

  it('scopes questions globally and per event', () => {
    const qs = [
      { id: 'q1', eventId: null, kind: 'text' as const, options: [], required: false },
      { id: 'q2', eventId: 'e1', kind: 'text' as const, options: [], required: false },
    ];
    expect(questionsForEvent(qs, 'e1')).toHaveLength(2);
    expect(questionsForEvent(qs, 'e2')).toHaveLength(1);
  });
});

describe('submission validation (authorization rules)', () => {
  it('accepts a valid attending submission', () => {
    expect(validateSubmission(scope(), [], [sub()])).toEqual([]);
  });

  it('rejects events the guest is not invited to', () => {
    const errors = validateSubmission(scope({ eventIds: ['e1'] }), [], [
      sub(),
      sub({ eventId: 'e2' }),
    ]);
    expect(errors).toContain('err.notInvited');
  });

  it('rejects duplicates and missing status', () => {
    expect(validateSubmission(scope(), [], [sub(), sub()]).length).toBeGreaterThan(0);
    expect(
      validateSubmission(scope(), [], [sub({ status: '' })]).length,
    ).toBeGreaterThan(0);
  });

  it('enforces plus-one permission', () => {
    const errors = validateSubmission(scope({ allowPlusOne: false }), [], [
      sub({ plusOne: true }),
    ]);
    expect(errors).toContain('err.plusOne');
  });

  it('blocks plus-one on declined events', () => {
    const errors = validateSubmission(scope(), [], [
      sub({ status: 'declined', plusOne: true }),
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('enforces the deadline for all submissions', () => {
    const errors = validateSubmission(
      scope({ deadline: '2026-06-01T00:00:00Z', now: '2026-07-01T00:00:00Z' }),
      [],
      [sub()],
    );
    expect(errors).toContain('err.deadline');
  });

  it('enforces required questions and choice options', () => {
    const qs = [
      { id: 'q1', eventId: null, kind: 'text' as const, options: [], required: true },
      {
        id: 'q2',
        eventId: null,
        kind: 'choice' as const,
        options: ['Chicken', 'Fish'],
        required: false,
      },
    ];
    expect(validateSubmission(scope(), qs, [sub()])).toContain('err.required');
    expect(
      validateSubmission(scope(), qs, [sub({ answers: { q1: 'ok', q2: 'Beef' } })]),
    ).toContain('err.choice');
    expect(
      validateSubmission(scope(), qs, [sub({ answers: { q1: 'ok', q2: 'Fish' } })]),
    ).toEqual([]);
  });
});

describe('submission normalization', () => {
  it('strips plus-one when not allowed or declined', () => {
    expect(
      normalizeSubmission(scope({ allowPlusOne: false }), sub({ plusOne: true })).plusOne,
    ).toBe(false);
    expect(
      normalizeSubmission(scope(), sub({ status: 'declined', plusOne: true })).plusOne,
    ).toBe(false);
    expect(normalizeSubmission(scope(), sub()).status).toBe('attending');
  });
});
