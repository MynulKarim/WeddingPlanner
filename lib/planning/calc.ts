/**
 * Planning math — Phase 9 (pure, unit-tested).
 * Budget, vendor, seating, and checklist calculations in cents/integers.
 */

export interface BudgetTotals {
  budgeted: number;
  actual: number;
  paid: number;
  /** budgeted - actual (negative = over budget). */
  remaining: number;
  /** actual - paid (what is still owed). */
  outstanding: number;
}

export function budgetTotals(
  items: { budgeted_cents: number; actual_cents: number; paid_cents: number }[],
): BudgetTotals {
  const budgeted = items.reduce((a, i) => a + i.budgeted_cents, 0);
  const actual = items.reduce((a, i) => a + i.actual_cents, 0);
  const paid = items.reduce((a, i) => a + i.paid_cents, 0);
  return { budgeted, actual, paid, remaining: budgeted - actual, outstanding: actual - paid };
}

export function budgetByCategory(
  items: { category: string; budgeted_cents: number; actual_cents: number }[],
): { category: string; budgeted: number; actual: number }[] {
  const map = new Map<string, { budgeted: number; actual: number }>();
  for (const i of items) {
    const e = map.get(i.category) ?? { budgeted: 0, actual: 0 };
    e.budgeted += i.budgeted_cents;
    e.actual += i.actual_cents;
    map.set(i.category, e);
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v }));
}

export type VendorPaymentStatus = 'unpaid' | 'partial' | 'paid';

export function vendorPaymentStatus(cost: number, paid: number): VendorPaymentStatus {
  if (paid <= 0) return 'unpaid';
  if (paid < cost) return 'partial';
  return 'paid';
}

export interface SeatingStats {
  tables: number;
  seats: number;
  assigned: number;
  unassigned: number;
  overCapacityTables: string[];
}

export function seatingStats(
  tables: { id: string; name: string; capacity: number | null }[],
  assignments: Map<string, number> | Record<string, number>,
  totalGuests: number,
): SeatingStats {
  const countOf = (id: string) =>
    assignments instanceof Map ? (assignments.get(id) ?? 0) : (assignments[id] ?? 0);
  const assigned = tables.reduce((a, t) => a + countOf(t.id), 0);
  return {
    tables: tables.length,
    seats: tables.reduce((a, t) => a + (t.capacity ?? 0), 0),
    assigned,
    unassigned: Math.max(0, totalGuests - assigned),
    overCapacityTables: tables
      .filter((t) => t.capacity !== null && countOf(t.id) > t.capacity)
      .map((t) => t.name),
  };
}

export interface TaskCounts {
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export function taskCounts(
  tasks: { status: string; due_date: string | null }[],
  todayIso: string,
): TaskCounts {
  const today = todayIso.slice(0, 10);
  let todo = 0;
  let inProgress = 0;
  let done = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (t.status === 'done') {
      done += 1;
      continue;
    }
    if (t.status === 'in_progress') inProgress += 1;
    else todo += 1;
    if (t.due_date && t.due_date < today) overdue += 1;
  }
  return { todo, inProgress, done, overdue };
}
