/**
 * Authorization roles — Phase 0 model.
 * Enforcement arrives in Phase 1 (Supabase Auth + RLS + server checks).
 * Never rely solely on UI hiding.
 */

export const WEDDING_ROLES = ['owner', 'admin', 'planner', 'staff', 'guest'] as const;
export type WeddingRole = (typeof WEDDING_ROLES)[number];

/** Rank for hierarchy checks: higher value = more privilege. */
const ROLE_RANK: Record<WeddingRole, number> = {
  owner: 100,
  admin: 80,
  planner: 60,
  staff: 20,
  guest: 10,
};

export function hasRoleAtLeast(role: WeddingRole, minimum: WeddingRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageWedding(role: WeddingRole): boolean {
  return hasRoleAtLeast(role, 'planner');
}

export function canOperateDayOf(role: WeddingRole): boolean {
  return role === 'staff' || hasRoleAtLeast(role, 'planner');
}
