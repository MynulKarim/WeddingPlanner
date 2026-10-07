/**
 * RSVP rules engine — Phase 5 (pure, heavily unit-tested), localized in Phase 6.
 * All guest submissions are validated against the token-resolved scope:
 * guest identity, allowed events, plus-one permission, deadline, and custom
 * question requirements. Returns translation KEYS (err.*); callers render
 * them with t(locale, key). Server actions enforce these; tests prove them.
 */
import type { I18nKey } from '@/lib/i18n/keys';

export type RsvpStatus = 'pending' | 'attending' | 'declined';

export interface RsvpScope {
  guestId: string;
  weddingId: string;
  allowPlusOne: boolean;
  /** Event ids this guest is invited to. */
  eventIds: string[];
  /** ISO deadline or null (no deadline). */
  deadline: string | null;
  now: string;
}

export interface CustomQuestionRule {
  id: string;
  /** Null = asked for every event. */
  eventId: string | null;
  kind: 'text' | 'choice' | 'boolean';
  options: string[];
  required: boolean;
}

export interface EventSubmission {
  eventId: string;
  status: RsvpStatus | '';
  plusOne: boolean;
  plusOneName: string;
  dietary: string;
  allergies: string;
  notes: string;
  answers: Record<string, string>;
}

export function isPastDeadline(deadline: string | null, now: string): boolean {
  if (!deadline) return false;
  return Date.parse(deadline) <= Date.parse(now);
}

/** Questions applying to an event (global + event-scoped). */
export function questionsForEvent(
  questions: CustomQuestionRule[],
  eventId: string,
): CustomQuestionRule[] {
  return questions.filter((q) => q.eventId === null || q.eventId === eventId);
}

export function validateSubmission(
  scope: RsvpScope,
  questions: CustomQuestionRule[],
  submissions: EventSubmission[],
): I18nKey[] {
  const errors: I18nKey[] = [];
  if (isPastDeadline(scope.deadline, scope.now)) {
    return ['err.deadline'];
  }
  if (submissions.length === 0) return ['err.empty'];

  const seen = new Set<string>();
  for (const sub of submissions) {
    if (!sub.eventId || seen.has(sub.eventId)) {
      errors.push('err.duplicate');
      continue;
    }
    seen.add(sub.eventId);
    if (!scope.eventIds.includes(sub.eventId)) {
      errors.push('err.notInvited');
      continue;
    }
    if (sub.status !== 'attending' && sub.status !== 'declined') {
      errors.push('err.status');
      continue;
    }
    if (sub.plusOne && !scope.allowPlusOne) {
      errors.push('err.plusOne');
    }
    if (sub.status === 'declined' && sub.plusOne) {
      errors.push('err.plusOneDeclined');
    }
    for (const q of questionsForEvent(questions, sub.eventId)) {
      const answer = (sub.answers[q.id] ?? '').trim();
      if (q.required && !answer) {
        errors.push('err.required');
        break;
      }
      if (answer && q.kind === 'choice' && !q.options.includes(answer)) {
        errors.push('err.choice');
        break;
      }
      if (answer && q.kind === 'boolean' && !['yes', 'no'].includes(answer.toLowerCase())) {
        errors.push('err.yesno');
        break;
      }
    }
    for (const [field, limit] of [
      ['dietary', 500],
      ['allergies', 500],
      ['notes', 2000],
      ['plusOneName', 120],
    ] as const) {
      if (sub[field].length > limit) {
        errors.push('err.tooLong');
        break;
      }
    }
  }
  return [...new Set(errors)];
}

/** Normalize a submission for storage (plus-one stripped when not allowed). */
export function normalizeSubmission(
  scope: RsvpScope,
  sub: EventSubmission,
): Omit<EventSubmission, 'eventId'> & { status: RsvpStatus } {
  const attending = sub.status === 'attending';
  const plusOne = attending && scope.allowPlusOne && sub.plusOne;
  return {
    status: attending ? 'attending' : 'declined',
    plusOne,
    plusOneName: plusOne ? sub.plusOneName.trim().slice(0, 120) : '',
    dietary: sub.dietary.trim().slice(0, 500),
    allergies: sub.allergies.trim().slice(0, 500),
    notes: sub.notes.trim().slice(0, 2000),
    answers: Object.fromEntries(
      Object.entries(sub.answers).map(([k, v]) => [k, v.trim().slice(0, 2000)]),
    ),
  };
}
