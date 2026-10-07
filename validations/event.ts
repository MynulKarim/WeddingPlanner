/**
 * Event input validation — Phase 2 (pure, unit-tested).
 */

export interface EventInput {
  name: string;
  startsAt: string;
  timezone: string;
  venue: string;
  visibility: string;
}

export function validateEventInput(input: EventInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Event name is required.');
  if (!input.timezone.trim()) errors.push('Timezone is required.');
  if (!['public', 'invited-only'].includes(input.visibility)) {
    errors.push('Visibility must be public or invited-only.');
  }
  if (input.startsAt.trim() && Number.isNaN(Date.parse(input.startsAt))) {
    errors.push('Start time is not a valid date.');
  }
  return errors;
}
