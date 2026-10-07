/**
 * Wedding-date-based starter budget — Phase 15 (pure, unit-tested).
 * Seeds one line per typical cost area with a deposit/final-balance split,
 * due dates counting back from the wedding day, and a share-of-total hint
 * in notes (amounts stay zero until the couple budgets real numbers).
 * Mirrors lib/planning/checklist-template.ts; existing items are untouched.
 */

export interface StarterBudgetItem {
  category: string;
  title: string;
  /** Share-of-total hint shown in notes, e.g. "25–35%". */
  shareHint: string;
  /** Days before the wedding the line is typically due (0 = wedding day). */
  daysBefore: number;
}

const TEMPLATE: StarterBudgetItem[] = [
  { category: 'Venue', title: 'Venue deposit', shareHint: '25–35%', daysBefore: 300 },
  { category: 'Venue', title: 'Venue final balance', shareHint: '25–35%', daysBefore: 30 },
  { category: 'Catering', title: 'Catering deposit', shareHint: '20–30%', daysBefore: 270 },
  { category: 'Catering', title: 'Catering final balance', shareHint: '20–30%', daysBefore: 14 },
  { category: 'Photography', title: 'Photographer booking', shareHint: '8–12%', daysBefore: 300 },
  { category: 'Videography', title: 'Videographer booking', shareHint: '3–6%', daysBefore: 180 },
  { category: 'Attire', title: 'Attire + alterations', shareHint: '5–10%', daysBefore: 120 },
  { category: 'Flowers & decor', title: 'Florist deposit', shareHint: '5–8%', daysBefore: 150 },
  { category: 'Music', title: 'DJ / band deposit', shareHint: '3–6%', daysBefore: 180 },
  { category: 'Cake', title: 'Cake order', shareHint: '2–3%', daysBefore: 90 },
  { category: 'Stationery', title: 'Invitations + print', shareHint: '1–2%', daysBefore: 120 },
  { category: 'Rings', title: 'Rings', shareHint: '2–3%', daysBefore: 150 },
  { category: 'Transport', title: 'Guest transport', shareHint: '1–3%', daysBefore: 60 },
  { category: 'Gifts & tips', title: 'Vendor tips + gifts', shareHint: '2–3%', daysBefore: 7 },
];

function toIsoDateUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export interface DatedStarterBudgetItem extends StarterBudgetItem {
  due_date: string;
  notes: string;
}

/** Expand the template against a wedding day (YYYY-MM-DD). */
export function starterBudget(weddingDay: string): DatedStarterBudgetItem[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDay)) throw new Error('Wedding day must be YYYY-MM-DD.');
  const [y, m, d] = weddingDay.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(base.getTime())) throw new Error('Wedding day must be YYYY-MM-DD.');
  return TEMPLATE.map((t) => {
    const due = new Date(base.getTime() - t.daysBefore * 86_400_000);
    return {
      ...t,
      due_date: toIsoDateUTC(due),
      notes: `Typically ${t.shareHint} of the total budget.`,
    };
  });
}

export function starterBudgetCount(): number {
  return TEMPLATE.length;
}
