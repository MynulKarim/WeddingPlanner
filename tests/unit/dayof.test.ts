import { describe, expect, it } from 'vitest';
import {
  attendanceStats,
  dequeueCheckin,
  enqueueCheckin,
  extractInvitationToken,
} from '@/lib/dayof/dayof';

describe('attendance stats', () => {
  it('counts invited, attending, checked-in, and pending', () => {
    expect(
      attendanceStats({
        assignedGuestIds: ['a', 'b', 'c'],
        attendingGuestIds: ['a', 'b', 'zzz'],
        checkedInGuestIds: ['a', 'zzz'],
      }),
    ).toEqual({ invited: 3, attending: 2, checkedIn: 1, pending: 1 });
  });
});

describe('invitation token extraction', () => {
  const token = 'A'.repeat(43);
  it('accepts links, paths, and raw tokens', () => {
    expect(extractInvitationToken(`https://app.example/invite/${token}?x=1`)).toBe(token);
    expect(extractInvitationToken(`/invite/${token}`)).toBe(token);
    expect(extractInvitationToken(token)).toBe(token);
    expect(extractInvitationToken('not a link')).toBeNull();
    expect(extractInvitationToken('/invite/short')).toBeNull();
    expect(extractInvitationToken('')).toBeNull();
  });
});

describe('offline outbox', () => {
  it('dedupes and drops by guest+event', () => {
    const job = { weddingId: 'w', guestId: 'g', eventId: 'e', queuedAt: 't' };
    const q1 = enqueueCheckin([], job);
    expect(enqueueCheckin(q1, job)).toHaveLength(1);
    expect(dequeueCheckin(q1, 'g', 'e')).toHaveLength(0);
    expect(dequeueCheckin(q1, 'g', 'other')).toHaveLength(1);
  });
});
