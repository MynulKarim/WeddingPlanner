/**
 * Engagement input validation — Phase 10 (pure, unit-tested).
 * Same rules run in public actions (server) so browser bypasses fail closed.
 */

export interface GuestbookInput {
  guestName: string;
  message: string;
}

export function validateGuestbook(input: GuestbookInput): string[] {
  const errors: string[] = [];
  if (!input.guestName.trim()) errors.push('Your name is required.');
  if (input.guestName.trim().length > 80) errors.push('Name is too long.');
  if (!input.message.trim()) errors.push('Message is required.');
  if (input.message.trim().length > 2000) errors.push('Message is too long.');
  return errors;
}

export interface SongInput {
  guestName: string;
  title: string;
  artist: string;
  message: string;
}

export function validateSong(input: SongInput): string[] {
  const errors: string[] = [];
  if (!input.guestName.trim()) errors.push('Your name is required.');
  if (input.guestName.trim().length > 80) errors.push('Name is too long.');
  if (!input.title.trim()) errors.push('Song title is required.');
  if (input.title.trim().length > 200) errors.push('Song title is too long.');
  if (input.artist.trim().length > 200) errors.push('Artist is too long.');
  if (input.message.trim().length > 1000) errors.push('Message is too long.');
  return errors;
}

export interface CapsuleInput {
  guestName: string;
  message: string;
  openAfter: string;
}

export function validateCapsule(input: CapsuleInput): string[] {
  const errors: string[] = [];
  if (!input.guestName.trim()) errors.push('Your name is required.');
  if (input.guestName.trim().length > 80) errors.push('Name is too long.');
  if (!input.message.trim()) errors.push('Message is required.');
  if (input.message.trim().length > 2000) errors.push('Message is too long.');
  if (input.openAfter.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(input.openAfter.trim())) {
    errors.push('Open date must be YYYY-MM-DD.');
  }
  return errors;
}

export const GAME_KINDS = ['shoe', 'quiz', 'kids', 'custom'] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export function gameKindLabel(kind: string): string {
  switch (kind) {
    case 'shoe':
      return 'Shoe game';
    case 'quiz':
      return 'Quiz';
    case 'kids':
      return 'Kids zone';
    default:
      return 'Custom game';
  }
}

export function validateGame(input: { kind: string; title: string; description: string }): string[] {
  const errors: string[] = [];
  if (!(GAME_KINDS as readonly string[]).includes(input.kind)) {
    errors.push('Choose a valid game type.');
  }
  if (!input.title.trim()) errors.push('Game title is required.');
  if (input.title.trim().length > 160) errors.push('Title is too long.');
  if (input.description.trim().length > 2000) errors.push('Description is too long.');
  return errors;
}
