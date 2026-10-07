/**
 * Export datasets — Phase 9 (pure row builders, unit-tested).
 * Serialized to CSV or XLSX by the export route. Amounts render as
 * major-unit decimals for spreadsheets (cents stay in the database).
 */
import type { HubGuest } from '@/lib/guests/hub';
import type { RsvpBoard } from '@/lib/db/rsvp';
import type { EventRow } from '@/lib/db/events';
import type { SeatingPlan } from '@/lib/db/seating';
import type { BudgetRow, TaskRow, VendorPaymentRow, VendorRow } from '@/lib/db/planning';

export const EXPORT_DATASETS = [
  'guests',
  'rsvp',
  'seating',
  'place-cards',
  'dietary',
  'events',
  'budget',
  'vendors',
  'vendor-payments',
  'tasks',
] as const;

export type ExportDataset = (typeof EXPORT_DATASETS)[number];

export function isExportDataset(v: string): v is ExportDataset {
  return (EXPORT_DATASETS as readonly string[]).includes(v);
}

export interface ExportBundle {
  guests: HubGuest[];
  board: RsvpBoard;
  events: EventRow[];
  plan: SeatingPlan;
  budget: BudgetRow[];
  vendors: VendorRow[];
  payments: VendorPaymentRow[];
  tasks: TaskRow[];
  guestNames: Map<string, string>;
  householdOf: Map<string, string | null>;
  tableOf: Map<string, string>;
}

function money(cents: number, currency = 'USD'): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function datasetHeaders(dataset: ExportDataset): string[] {
  switch (dataset) {
    case 'guests':
      return ['Name', 'Email', 'Phone', 'Household', 'Child', 'Plus-one allowed', 'Language', 'Tags', 'Notes', 'Events'];
    case 'rsvp':
      return ['Guest', 'Household', 'Event', 'Status', 'Plus-one', 'Plus-one name', 'Dietary', 'Allergies'];
    case 'seating':
      return ['Guest', 'Household', 'Table'];
    case 'place-cards':
      return ['Guest', 'Table', 'Household'];
    case 'dietary':
      return ['Guest', 'Event', 'Dietary', 'Allergies'];
    case 'events':
      return ['Name', 'Starts at', 'Timezone', 'Venue', 'Address', 'Visibility', 'RSVP required'];
    case 'budget':
      return ['Category', 'Title', 'Vendor', 'Budgeted', 'Actual', 'Paid', 'Remaining', 'Due date', 'Notes'];
    case 'vendors':
      return ['Name', 'Category', 'Contact', 'Email', 'Phone', 'Website', 'Cost', 'Paid', 'Status', 'Due date', 'Notes'];
    case 'vendor-payments':
      return ['Vendor', 'Amount', 'Paid on', 'Note'];
    case 'tasks':
      return ['Title', 'Category', 'Status', 'Due date', 'Assignee', 'Notes'];
  }
}

export function datasetRows(dataset: ExportDataset, b: ExportBundle): string[][] {
  switch (dataset) {
    case 'guests':
      return b.guests.map((g) => [
        g.display_name,
        g.email ?? '',
        g.phone ?? '',
        g.household_label ?? '',
        g.is_child ? 'yes' : '',
        g.allow_plus_one ? 'yes' : '',
        g.locale ?? '',
        g.tags.join('; '),
        g.notes ?? '',
        g.events.map((e) => e.event_name).join('; '),
      ]);
    case 'rsvp':
      return b.board.guests.flatMap((g) =>
        Object.entries(g.responses).map(([eventId, r]) => [
          g.display_name,
          g.household_label ?? '',
          b.board.events.find((e) => e.event_id === eventId)?.name ?? eventId,
          r.status,
          r.plus_one ? 'yes' : '',
          r.plus_one_name ?? '',
          r.dietary ?? '',
          r.allergies ?? '',
        ]),
      );
    case 'seating': {
      const tableName = (id: string | undefined) =>
        b.plan.tables.find((t) => t.id === id)?.name ?? '';
      return b.guests.map((g) => [
        g.display_name,
        g.household_label ?? '',
        tableName(b.tableOf.get(g.id)),
      ]);
    }
    case 'place-cards':
      return b.guests
        .filter((g) => b.tableOf.has(g.id))
        .map((g) => [
          g.display_name,
          b.plan.tables.find((t) => t.id === b.tableOf.get(g.id))?.name ?? '',
          g.household_label ?? '',
        ]);
    case 'dietary':
      return b.board.dietary.map((d) => [d.guest, d.event, d.dietary, d.allergies]);
    case 'events':
      return b.events.map((e) => [
        e.name,
        e.starts_at ?? '',
        e.timezone,
        e.venue ?? '',
        e.address ?? '',
        e.visibility,
        e.rsvp_required ? 'yes' : '',
      ]);
    case 'budget':
      return b.budget.map((i) => [
        i.category,
        i.title,
        i.vendor_name ?? '',
        money(i.budgeted_cents),
        money(i.actual_cents),
        money(i.paid_cents),
        money(i.budgeted_cents - i.actual_cents),
        i.due_date ?? '',
        i.notes,
      ]);
    case 'vendors':
      return b.vendors.map((v) => [
        v.name,
        v.category,
        v.contact_name ?? '',
        v.email ?? '',
        v.phone ?? '',
        v.website ?? '',
        money(v.cost_cents),
        money(v.paid_cents),
        v.paid_cents <= 0 ? 'unpaid' : v.paid_cents < v.cost_cents ? 'partial' : 'paid',
        v.due_date ?? '',
        v.notes,
      ]);
    case 'vendor-payments': {
      const vendorName = (id: string) => b.vendors.find((v) => v.id === id)?.name ?? id;
      return b.payments.map((p) => [
        vendorName(p.vendor_id),
        money(p.amount_cents),
        p.paid_on ?? '',
        p.note,
      ]);
    }
    case 'tasks':
      return b.tasks.map((t) => [
        t.title,
        t.category,
        t.status,
        t.due_date ?? '',
        t.assignee ?? '',
        t.notes,
      ]);
  }
}

function escapeCsvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n');
}
