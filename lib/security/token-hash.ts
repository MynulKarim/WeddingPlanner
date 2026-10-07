/**
 * Invitation token hashing — Phase 5 (SERVER ONLY: node:crypto).
 * Raw tokens are shown once at creation; only sha256 hex is stored.
 * Never import this module from client components.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time comparison of a raw token against a stored hash. */
export function verifyInvitationToken(token: string, hash: string): boolean {
  const candidate = hashInvitationToken(token);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
