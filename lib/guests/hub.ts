/**
 * Guest-hub pure domain logic — Phase 2.
 * Filtering + statistics over an in-memory guest list so the rules are
 * unit-testable without a database. DB fetching lives in lib/db/guests.ts.
 */

export interface HubGuestEvent {
  event_id: string;
  event_name: string;
}

export interface HubGuest {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  is_child: boolean;
  allow_plus_one: boolean;
  locale: string | null;
  household_id: string | null;
  household_label: string | null;
  events: HubGuestEvent[];
}

export interface GuestFilters {
  q?: string;
  tag?: string;
  eventId?: string;
  unassignedOnly?: boolean;
  type?: 'adult' | 'child';
  plusOneOnly?: boolean;
}

export function applyGuestFilters(guests: HubGuest[], filters: GuestFilters): HubGuest[] {
  const q = (filters.q ?? '').trim().toLowerCase();
  return guests.filter((g) => {
    if (q) {
      const hay = `${g.display_name} ${g.email ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.tag && !g.tags.includes(filters.tag)) return false;
    if (filters.eventId && !g.events.some((e) => e.event_id === filters.eventId))
      return false;
    if (filters.unassignedOnly && g.events.length > 0) return false;
    if (filters.type === 'adult' && g.is_child) return false;
    if (filters.type === 'child' && !g.is_child) return false;
    if (filters.plusOneOnly && !g.allow_plus_one) return false;
    return true;
  });
}

export interface GuestStats {
  total: number;
  adults: number;
  children: number;
  plusOneEligible: number;
  assigned: number;
  unassigned: number;
  households: number;
  perEvent: { event_id: string; event_name: string; count: number }[];
}

export function computeGuestStats(guests: HubGuest[]): GuestStats {
  const perEvent = new Map<string, { event_name: string; count: number }>();
  const households = new Set<string>();
  let adults = 0;
  let plusOneEligible = 0;
  let assigned = 0;

  for (const g of guests) {
    if (g.is_child) {
      // children counted separately
    } else {
      adults += 1;
    }
    if (g.allow_plus_one) plusOneEligible += 1;
    if (g.events.length > 0) assigned += 1;
    if (g.household_id) households.add(g.household_id);
    for (const e of g.events) {
      const entry = perEvent.get(e.event_id) ?? { event_name: e.event_name, count: 0 };
      entry.count += 1;
      perEvent.set(e.event_id, entry);
    }
  }

  return {
    total: guests.length,
    adults,
    children: guests.length - adults,
    plusOneEligible,
    assigned,
    unassigned: guests.length - assigned,
    households: households.size,
    perEvent: [...perEvent.entries()].map(([event_id, v]) => ({ event_id, ...v })),
  };
}

export function distinctTags(guests: HubGuest[]): string[] {
  const tags = new Set<string>();
  for (const g of guests) for (const t of g.tags) tags.add(t);
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/** Split a tags cell ("vip; family") into a clean unique list. */
export function parseTagsCell(cell: string): string[] {
  const seen = new Set<string>();
  for (const part of cell.split(/[;,]/)) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag) seen.add(tag);
  }
  return [...seen];
}
