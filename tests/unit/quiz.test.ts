import { describe, expect, it } from 'vitest';
import {
  correctIndexOrNull,
  parseOptions,
  tallyVotes,
  validateQuestion,
  validateVote,
} from '@/lib/engagement/quiz';

describe('quiz options', () => {
  it('splits one-per-line, trims, and caps at eight', () => {
    expect(parseOptions('Paris\n\n Rome \nLisbon')).toEqual(['Paris', 'Rome', 'Lisbon']);
    expect(parseOptions('a\nb\nc\nd\ne\nf\ng\nh\ni')).toHaveLength(8);
    expect(parseOptions('')).toEqual([]);
  });
});

describe('quiz validation', () => {
  it('requires text, 2–8 unique options, and a valid correct answer', () => {
    expect(
      validateQuestion({ question: '', options: [], correctOption: '' }).length,
    ).toBeGreaterThan(0);
    expect(
      validateQuestion({ question: 'Q?', options: ['Only'], correctOption: '' }),
    ).toHaveLength(1);
    expect(
      validateQuestion({ question: 'Q?', options: ['A', 'a'], correctOption: '' }),
    ).toHaveLength(1);
    expect(
      validateQuestion({ question: 'Q?', options: ['A', 'B'], correctOption: '3' }),
    ).toHaveLength(1);
    expect(
      validateQuestion({ question: 'Q?', options: ['A', 'B'], correctOption: '' }),
    ).toEqual([]);
    expect(
      validateQuestion({ question: 'Q?', options: ['A', 'B'], correctOption: '2' }),
    ).toEqual([]);
  });

  it('maps blank to poll mode and 1-based input to an index', () => {
    expect(correctIndexOrNull('')).toBeNull();
    expect(correctIndexOrNull('  ')).toBeNull();
    expect(correctIndexOrNull('1')).toBe(0);
    expect(correctIndexOrNull('3')).toBe(2);
  });

  it('validates ballots against the option count', () => {
    expect(validateVote({ guestName: '', optionIndex: 0, optionCount: 2 })).toHaveLength(1);
    expect(validateVote({ guestName: 'A', optionIndex: 2, optionCount: 2 })).toHaveLength(1);
    expect(validateVote({ guestName: 'A', optionIndex: -1, optionCount: 2 })).toHaveLength(1);
    expect(validateVote({ guestName: 'A', optionIndex: 1, optionCount: 2 })).toEqual([]);
  });
});

describe('quiz tallies', () => {
  it('counts per option with percentages', () => {
    expect(
      tallyVotes(3, [{ option_index: 0 }, { option_index: 0 }, { option_index: 2 }, { option_index: 9 }]),
    ).toEqual({ counts: [2, 0, 1], total: 3, pct: [67, 0, 33] });
    expect(tallyVotes(2, [])).toEqual({ counts: [0, 0], total: 0, pct: [0, 0] });
  });
});
