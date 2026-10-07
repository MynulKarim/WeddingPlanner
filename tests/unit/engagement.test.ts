import { describe, expect, it } from 'vitest';
import {
  gameKindLabel,
  validateCapsule,
  validateGame,
  validateGuestbook,
  validateSong,
} from '@/lib/engagement/validation';

describe('engagement validation', () => {
  it('validates guestbook entries', () => {
    expect(validateGuestbook({ guestName: '', message: '' })).toHaveLength(2);
    expect(validateGuestbook({ guestName: 'Salma', message: 'Congrats!' })).toEqual([]);
    expect(validateGuestbook({ guestName: 'S', message: 'x'.repeat(2001) })).toHaveLength(1);
  });

  it('validates song requests', () => {
    expect(
      validateSong({ guestName: 'A', title: '', artist: '', message: '' }),
    ).toHaveLength(1);
    expect(
      validateSong({ guestName: 'A', title: 'At Last', artist: 'Etta James', message: '' }),
    ).toEqual([]);
  });

  it('validates time capsule notes', () => {
    expect(validateCapsule({ guestName: 'A', message: 'Hi', openAfter: '2030-01-01' })).toEqual([]);
    expect(validateCapsule({ guestName: 'A', message: 'Hi', openAfter: 'tomorrow' })).toHaveLength(1);
    expect(validateCapsule({ guestName: '', message: '', openAfter: '' })).toHaveLength(2);
  });

  it('validates games', () => {
    expect(validateGame({ kind: 'bogus', title: '', description: '' }).length).toBeGreaterThan(0);
    expect(validateGame({ kind: 'quiz', title: 'Quiz', description: '' })).toEqual([]);
    expect(gameKindLabel('kids')).toBe('Kids zone');
  });
});
