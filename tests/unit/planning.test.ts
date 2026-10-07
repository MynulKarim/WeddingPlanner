import { describe, expect, it } from 'vitest';
import {
  budgetByCategory,
  budgetTotals,
  seatingStats,
  taskCounts,
  vendorPaymentStatus,
} from '@/lib/planning/calc';
import { starterTasks, starterTaskCount } from '@/lib/planning/checklist-template';
import {
  datasetHeaders,
  datasetRows,
  isExportDataset,
  toCsv,
} from '@/lib/export/datasets';

describe('budget math', () => {
  const items = [
    { budgeted_cents: 500000, actual_cents: 450000, paid_cents: 200000 },
    { budgeted_cents: 100000, actual_cents: 150000, paid_cents: 150000 },
  ];

  it('totals remaining and outstanding', () => {
    expect(budgetTotals(items)).toEqual({
      budgeted: 600000,
      actual: 600000,
      paid: 350000,
      remaining: 0,
      outstanding: 250000,
    });
    expect(budgetTotals([])).toEqual({
      budgeted: 0,
      actual: 0,
      paid: 0,
      remaining: 0,
      outstanding: 0,
    });
  });

  it('rolls up by category', () => {
    const rows = budgetByCategory([
      { category: 'Photo', budgeted_cents: 100, actual_cents: 90 },
      { category: 'Photo', budgeted_cents: 50, actual_cents: 60 },
    ]);
    expect(rows).toEqual([{ category: 'Photo', budgeted: 150, actual: 150 }]);
  });

  it('derives vendor payment status', () => {
    expect(vendorPaymentStatus(100, 0)).toBe('unpaid');
    expect(vendorPaymentStatus(100, 40)).toBe('partial');
    expect(vendorPaymentStatus(100, 100)).toBe('paid');
    expect(vendorPaymentStatus(100, 150)).toBe('paid');
  });
});

describe('seating + task math', () => {
  it('flags over-capacity tables and counts unassigned', () => {
    const stats = seatingStats(
      [
        { id: 't1', name: 'Table 1', capacity: 2 },
        { id: 't2', name: 'Table 2', capacity: null },
      ],
      { t1: 3, t2: 5 },
      10,
    );
    expect(stats).toMatchObject({
      tables: 2,
      seats: 2,
      assigned: 8,
      unassigned: 2,
      overCapacityTables: ['Table 1'],
    });
  });

  it('counts task states and overdue', () => {
    expect(
      taskCounts(
        [
          { status: 'todo', due_date: '2020-01-01' },
          { status: 'in_progress', due_date: null },
          { status: 'done', due_date: '2020-01-01' },
        ],
        '2027-01-01T00:00:00Z',
      ),
    ).toEqual({ todo: 1, inProgress: 1, done: 1, overdue: 1 });
  });
});

describe('starter checklist', () => {
  it('dates tasks back from the wedding day', () => {
    const tasks = starterTasks('2027-06-12');
    expect(tasks).toHaveLength(starterTaskCount());
    expect(tasks.find((t) => t.title === 'Wedding day')?.due_date).toBe('2027-06-12');
    const venue = tasks.find((t) => t.title === 'Book venue');
    expect(venue!.due_date < '2027-06-12').toBe(true);
    expect(() => starterTasks('not-a-date')).toThrow();
  });
});

describe('export datasets', () => {
  const bundle = {
    guests: [],
    board: { deadline: null, events: [], guests: [], dietary: [], questions: [] },
    events: [],
    plan: { tables: [], assignments: {} },
    budget: [],
    vendors: [],
    tasks: [],
    guestNames: new Map(),
    householdOf: new Map(),
    tableOf: new Map(),
  };

  it('validates dataset names and builds CSV safely', () => {
    expect(isExportDataset('guests')).toBe(true);
    expect(isExportDataset('nope')).toBe(false);
    expect(datasetHeaders('tasks')).toContain('Title');
    expect(datasetRows('tasks', bundle)).toEqual([]);
    expect(toCsv(['A', 'B'], [['x,"y"', 'z']])).toBe('A,B\n"x,""y""",z');
  });
});
