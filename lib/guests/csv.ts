/**
 * Guest CSV import/export — Phase 2. Pure functions (no DB, no I/O).
 * Columns: display_name*,email,phone,household,is_child,allow_plus_one,
 * locale,tags,notes,events
 * Booleans accept y/yes/true/1 (case-insensitive); lists use semicolons.
 */
import { parseTagsCell } from '@/lib/guests/hub';

export const GUEST_CSV_HEADERS = [
  'display_name',
  'email',
  'phone',
  'household',
  'is_child',
  'allow_plus_one',
  'locale',
  'tags',
  'notes',
  'events',
] as const;

export interface GuestCsvRow {
  display_name: string;
  email: string;
  phone: string;
  household: string;
  is_child: boolean;
  allow_plus_one: boolean;
  locale: string;
  tags: string[];
  notes: string;
  events: string[];
}

function truthy(cell: string): boolean {
  return ['y', 'yes', 'true', '1'].includes(cell.trim().toLowerCase());
}

function splitList(cell: string): string[] {
  return cell
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export interface ParsedCsv {
  rows: GuestCsvRow[];
  errors: { line: number; message: string }[];
}

export function parseGuestsCsv(text: string): ParsedCsv {
  const rows: GuestCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
    return { rows, errors: [{ line: 0, message: 'File is empty.' }] };
  }

  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  if (idx('display_name') === -1) {
    return { rows, errors: [{ line: 1, message: 'Missing required column: display_name.' }] };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    if (lines[i].trim() === '') continue;
    const cells = parseLine(lines[i]);
    const get = (name: string) => {
      const at = idx(name);
      return at === -1 ? '' : (cells[at] ?? '').trim();
    };
    const display_name = get('display_name');
    if (!display_name) {
      errors.push({ line: lineNo, message: 'display_name is required.' });
      continue;
    }
    rows.push({
      display_name,
      email: get('email'),
      phone: get('phone'),
      household: get('household'),
      is_child: truthy(get('is_child')),
      allow_plus_one: truthy(get('allow_plus_one')),
      locale: get('locale'),
      tags: parseTagsCell(get('tags')),
      notes: get('notes'),
      events: splitList(get('events')),
    });
  }
  return { rows, errors };
}

export interface GuestExportRow {
  display_name: string;
  email?: string | null;
  phone?: string | null;
  household_label?: string | null;
  is_child?: boolean;
  allow_plus_one?: boolean;
  locale?: string | null;
  tags?: string[];
  notes?: string | null;
  event_names?: string[];
}

export function buildGuestsCsv(rows: GuestExportRow[]): string {
  const lines = [GUEST_CSV_HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.display_name,
        r.email ?? '',
        r.phone ?? '',
        r.household_label ?? '',
        r.is_child ? 'y' : '',
        r.allow_plus_one ? 'y' : '',
        r.locale ?? '',
        (r.tags ?? []).join('; '),
        r.notes ?? '',
        (r.event_names ?? []).join('; '),
      ]
        .map(escapeCell)
        .join(','),
    );
  }
  return lines.join('\n');
}
