/**
 * Quiz/vote domain — Phase 15 (pure, unit-tested).
 * Questions carry 2–8 text options; correct_option is null for pure polls
 * and a 0-based option index for scored quizzes. Tallies are computed from
 * vote rows; one vote per name per question is enforced by a UNIQUE
 * constraint (names are guest-typed, so this is spam friction, not ID).
 */

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option: number | null;
}

export interface QuizVote {
  question_id: string;
  guest_name: string;
  option_index: number;
}

export interface QuizTally {
  counts: number[];
  total: number;
  /** Percentage share per option, 0–100 (0 when no votes). */
  pct: number[];
}

/** Split a textarea (one option per line) into clean options. */
export function parseOptions(raw: string): string[] {
  return raw
    .split('\n')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
    .slice(0, 8);
}

export function validateQuestion(input: {
  question: string;
  options: string[];
  correctOption: string;
}): string[] {
  const errors: string[] = [];
  if (!input.question.trim()) errors.push('Question text is required.');
  if (input.question.trim().length > 300) errors.push('Question is too long.');
  if (input.options.length < 2) errors.push('Add at least two options.');
  if (input.options.length > 8) errors.push('At most eight options.');
  if (input.options.some((o) => o.length > 120)) errors.push('Options must be 120 characters or less.');
  if (new Set(input.options.map((o) => o.toLowerCase())).size !== input.options.length) {
    errors.push('Options must be unique.');
  }
  const correct = input.correctOption.trim();
  if (correct !== '') {
    const n = Number(correct);
    if (!Number.isInteger(n) || n < 1 || n > input.options.length) {
      errors.push(`Correct answer must be blank or 1–${input.options.length}.`);
    }
  }
  return errors;
}

export function correctIndexOrNull(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  return Number(v) - 1;
}

export function validateVote(input: {
  guestName: string;
  optionIndex: number;
  optionCount: number;
}): string[] {
  const errors: string[] = [];
  if (!input.guestName.trim()) errors.push('Your name is required.');
  if (input.guestName.trim().length > 80) errors.push('Name is too long.');
  if (
    !Number.isInteger(input.optionIndex) ||
    input.optionIndex < 0 ||
    input.optionIndex >= input.optionCount
  ) {
    errors.push('Choose one of the listed options.');
  }
  return errors;
}

export function tallyVotes(optionCount: number, votes: { option_index: number }[]): QuizTally {
  const counts = new Array<number>(optionCount).fill(0);
  for (const v of votes) {
    if (Number.isInteger(v.option_index) && v.option_index >= 0 && v.option_index < optionCount) {
      counts[v.option_index] += 1;
    }
  }
  const total = counts.reduce((a, c) => a + c, 0);
  const pct = counts.map((c) => (total === 0 ? 0 : Math.round((c / total) * 100)));
  return { counts, total, pct };
}

/** Question with a live tally, safe to render publicly (no voter names). */
export interface PublicGameQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option: number | null;
  tally: QuizTally;
}

/** Game card with questions, shared by the public site and previews. */
export interface PublicGame {
  id: string;
  kind: string;
  title: string;
  description: string;
  is_active?: boolean;
  questions: PublicGameQuestion[];
}
