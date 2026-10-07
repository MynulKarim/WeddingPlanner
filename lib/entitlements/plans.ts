/**
 * Subscription plans + entitlements — Phase 13 (pure, unit-tested).
 * Account-level tiers enforced at creation time with friendly errors.
 * Billing provider wiring (Stripe/regional) plugs in behind the payment
 * abstraction; tiers read from profiles.plan.
 */

export const PLANS = ['free', 'plus', 'luxe'] as const;
export type PlanId = (typeof PLANS)[number];

export interface PlanLimits {
  weddings: number;
  guestsPerWedding: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { weddings: 1, guestsPerWedding: 100 },
  plus: { weddings: 5, guestsPerWedding: 2000 },
  luxe: { weddings: 50, guestsPerWedding: 20000 },
};

export function isPlanId(v: string): v is PlanId {
  return (PLANS as readonly string[]).includes(v);
}

export function planLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[isPlanId(plan) ? plan : 'free'];
}

/** Can this account create another wedding? */
export function canCreateWedding(plan: string, currentWeddings: number): boolean {
  return currentWeddings < planLimits(plan).weddings;
}

/** How many more guests may be added to this wedding? */
export function guestHeadroom(plan: string, currentGuests: number): number {
  return Math.max(0, planLimits(plan).guestsPerWedding - currentGuests);
}

export function planLabel(plan: string): string {
  switch (plan) {
    case 'plus':
      return 'Plus';
    case 'luxe':
      return 'Luxe';
    default:
      return 'Free';
  }
}
