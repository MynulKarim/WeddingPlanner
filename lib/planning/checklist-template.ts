/**
 * Wedding-date-based starter checklist — Phase 9 (pure, unit-tested).
 * Generates dated tasks counting back from the wedding day. Couples can
 * regenerate with any date; existing tasks are never touched.
 */

export interface StarterTask {
  title: string;
  category: string;
  /** Days before the wedding (0 = wedding day). */
  daysBefore: number;
  assignee: string;
}

const TEMPLATE: StarterTask[] = [
  { title: 'Book venue', category: 'Venue', daysBefore: 365, assignee: '' },
  { title: 'Set budget', category: 'Budget', daysBefore: 365, assignee: '' },
  { title: 'Draft guest list', category: 'Guests', daysBefore: 300, assignee: '' },
  { title: 'Book photographer', category: 'Vendors', daysBefore: 300, assignee: '' },
  { title: 'Book caterer', category: 'Vendors', daysBefore: 270, assignee: '' },
  { title: 'Choose theme + monogram', category: 'Design', daysBefore: 240, assignee: '' },
  { title: 'Send save-the-dates', category: 'Guests', daysBefore: 210, assignee: '' },
  { title: 'Order attire', category: 'Attire', daysBefore: 180, assignee: '' },
  { title: 'Book entertainment', category: 'Vendors', daysBefore: 180, assignee: '' },
  { title: 'Plan menu + tasting', category: 'Menu', daysBefore: 150, assignee: '' },
  { title: 'Book transport + accommodation blocks', category: 'Travel', daysBefore: 150, assignee: '' },
  { title: 'Send invitations', category: 'Guests', daysBefore: 90, assignee: '' },
  { title: 'Build gift registry', category: 'Registry', daysBefore: 90, assignee: '' },
  { title: 'RSVP deadline', category: 'Guests', daysBefore: 30, assignee: '' },
  { title: 'Final headcount to caterer', category: 'Menu', daysBefore: 14, assignee: '' },
  { title: 'Seating chart', category: 'Seating', daysBefore: 14, assignee: '' },
  { title: 'Confirm vendors + timeline', category: 'Vendors', daysBefore: 7, assignee: '' },
  { title: 'Pack day-of kit', category: 'Day-of', daysBefore: 2, assignee: '' },
  { title: 'Wedding day', category: 'Day-of', daysBefore: 0, assignee: '' },
  { title: 'Send thank-you messages', category: 'Guests', daysBefore: -7, assignee: '' },
];

function toIsoDateUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export interface DatedStarterTask extends StarterTask {
  due_date: string;
  position: number;
}

/** Expand the template against a wedding day (YYYY-MM-DD). */
export function starterTasks(weddingDay: string): DatedStarterTask[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDay)) throw new Error('Wedding day must be YYYY-MM-DD.');
  const [y, m, d] = weddingDay.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(base.getTime())) throw new Error('Wedding day must be YYYY-MM-DD.');
  return TEMPLATE.map((t, i) => {
    const due = new Date(base.getTime() - t.daysBefore * 86_400_000);
    return { ...t, position: i, due_date: toIsoDateUTC(due) };
  });
}

export function starterTaskCount(): number {
  return TEMPLATE.length;
}
