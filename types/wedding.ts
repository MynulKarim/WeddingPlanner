/**
 * Core domain types — Phase 0 foundation.
 * Mirrors ARCHITECTURE.md §4-5. No DB access here.
 */

export type WeddingRole = 'owner' | 'admin' | 'planner' | 'staff' | 'guest';

export interface Wedding {
  id: string;
  slug: string;
  title: string;
  defaultLocale: string;
  themeId: string;
  timezone: string;
}

export interface WeddingEvent {
  id: string;
  weddingId: string;
  name: string;
  startsAt: string;
  timezone: string;
  venue?: string | null;
  visibility: 'public' | 'invited-only';
  rsvpRequired: boolean;
}

export interface Household {
  id: string;
  weddingId: string;
  label: string;
}

export interface Guest {
  id: string;
  weddingId: string;
  householdId: string | null;
  displayName: string;
  locale: string | null;
  allowPlusOne: boolean;
}

export interface Invitation {
  id: string;
  weddingId: string;
  guestId: string;
  /** High-entropy opaque token. Never a sequential ID. */
  token: string;
  locale: string;
}
