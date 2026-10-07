/**
 * Day-of helpers — Phase 11 (pure, unit-tested).
 * Attendance math, QR link parsing, and the offline outbox shape.
 */

export interface AttendanceStats {
  invited: number;
  attending: number;
  checkedIn: number;
  pending: number;
}

export function attendanceStats(input: {
  assignedGuestIds: string[];
  attendingGuestIds: string[];
  checkedInGuestIds: string[];
}): AttendanceStats {
  const invited = new Set(input.assignedGuestIds).size;
  const attending = new Set(
    input.attendingGuestIds.filter((id) => input.assignedGuestIds.includes(id)),
  ).size;
  const checkedIn = new Set(
    input.checkedInGuestIds.filter((id) => input.assignedGuestIds.includes(id)),
  ).size;
  return { invited, attending, checkedIn, pending: Math.max(0, attending - checkedIn) };
}

/**
 * Extract an invitation token from scanned text. Accepts full links
 * (https://host/invite/<token>), bare paths (/invite/<token>), or the raw
 * token itself. Returns null when nothing token-shaped is found.
 */
export function extractInvitationToken(scanned: string): string | null {
  const text = scanned.trim();
  if (/^[A-Za-z0-9_-]{40,60}$/.test(text)) return text;
  const match = text.match(/\/invite\/([A-Za-z0-9_-]{40,60})/);
  return match ? match[1] : null;
}

export interface QueuedCheckin {
  weddingId: string;
  guestId: string;
  eventId: string;
  queuedAt: string;
}

/** Merge a queued check-in into the outbox (idempotent per guest+event). */
export function enqueueCheckin(queue: QueuedCheckin[], job: QueuedCheckin): QueuedCheckin[] {
  const exists = queue.some((q) => q.guestId === job.guestId && q.eventId === job.eventId);
  if (exists) return queue;
  return [...queue, job];
}

/** Drop jobs that have since succeeded server-side. */
export function dequeueCheckin(queue: QueuedCheckin[], guestId: string, eventId: string): QueuedCheckin[] {
  return queue.filter((q) => !(q.guestId === guestId && q.eventId === eventId));
}
