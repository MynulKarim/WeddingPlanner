/**
 * Invitation token utilities — Phase 0 foundation.
 * Tokens are opaque, high-entropy, URL-safe strings.
 * Resolution against the DB happens in Phase 5.
 */

const TOKEN_BYTES = 32;

export function generateInvitationToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Basic shape check before any DB lookup (does not authenticate). */
export function isPlausibleInvitationToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,60}$/.test(token);
}
