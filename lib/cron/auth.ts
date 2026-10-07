/**
 * Cron endpoint auth — Phase 16 (pure, unit-tested).
 * /api/cron/dispatch requires Authorization: Bearer <CRON_SECRET>.
 * The endpoint refuses to run when no secret is configured rather than
 * exposing an unauthenticated global dispatch.
 */
import { timingSafeEqual } from 'node:crypto';

export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!authorizationHeader) return false;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
