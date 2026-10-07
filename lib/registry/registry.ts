/**
 * Registry domain logic — Phase 8 (pure, unit-tested).
 * Five gift kinds; cash/honeymoon track funding progress against a goal.
 * Claims are soft reservations — no money moves until the payment provider
 * integration (Phase 13); checkout stays behind the payment abstraction.
 */

export const REGISTRY_KINDS = ['product', 'cash', 'experience', 'custom'] as const;
export type RegistryKind = (typeof REGISTRY_KINDS)[number];

export function registryKindLabel(kind: string): string {
  switch (kind) {
    case 'product':
      return 'Physical gift';
    case 'cash':
      return 'Cash gift';
    case 'experience':
      return 'Experience';
    case 'custom':
      return 'Honeymoon & custom';
    default:
      return kind;
  }
}

export interface RegistryItemInput {
  kind: string;
  title: string;
  description: string;
  amountCents: string;
  currency: string;
  externalUrl: string;
  imageUrl: string;
  quantityTotal: string;
}

export function validateRegistryItem(input: RegistryItemInput): string[] {
  const errors: string[] = [];
  if (!(REGISTRY_KINDS as readonly string[]).includes(input.kind)) {
    errors.push('Choose a valid gift type.');
  }
  if (!input.title.trim()) errors.push('Gift title is required.');
  if (input.title.trim().length > 160) errors.push('Title is too long.');
  if (input.description.trim().length > 2000) errors.push('Description is too long.');
  if (input.amountCents.trim()) {
    const cents = Number(input.amountCents);
    if (!Number.isInteger(cents) || cents <= 0 || cents > 100_000_000_00) {
      errors.push('Amount must be a positive whole number of cents.');
    }
  }
  if (input.currency.trim() && !/^[A-Za-z]{3}$/.test(input.currency.trim())) {
    errors.push('Currency must be a 3-letter code.');
  }
  for (const [key, label] of [['externalUrl', 'Product link'], ['imageUrl', 'Image link']] as const) {
    const v = input[key].trim();
    if (v && !/^https:\/\//i.test(v)) errors.push(`${label} must start with https://.`);
    if (v.length > 1000) errors.push(`${label} is too long.`);
  }
  if (input.quantityTotal.trim()) {
    const q = Number(input.quantityTotal);
    if (!Number.isInteger(q) || q <= 0 || q > 10000) {
      errors.push('Quantity must be a positive whole number.');
    }
  }
  return errors;
}

export interface ClaimInput {
  guestName: string;
  guestEmail: string;
  amountCents: string;
  message: string;
}

export function validateClaim(input: ClaimInput, opts?: { amountRequired?: boolean }): string[] {
  const errors: string[] = [];
  if (!input.guestName.trim()) errors.push('Your name is required.');
  if (input.guestName.trim().length > 120) errors.push('Name is too long.');
  if (input.guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.guestEmail.trim())) {
    errors.push('Email address is not valid.');
  }
  if (opts?.amountRequired && !input.amountCents.trim()) {
    errors.push('Contribution amount is required.');
  }
  if (input.amountCents.trim()) {
    const cents = Number(input.amountCents);
    if (!Number.isInteger(cents) || cents <= 0) {
      errors.push('Amount must be positive.');
    }
  }
  if (input.message.trim().length > 1000) errors.push('Message is too long.');
  return errors;
}

export interface FundProgress {
  /** Cents contributed (reserved). */
  raised: number;
  /** Goal in cents, or null when open-ended. */
  goal: number | null;
  /** 0..1 fraction, capped at 1, or null without a goal. */
  fraction: number | null;
}

export function fundProgress(claimsCents: number[], goalCents: number | null): FundProgress {
  const raised = claimsCents.reduce((a, b) => a + b, 0);
  if (goalCents === null || goalCents <= 0) return { raised, goal: null, fraction: null };
  return { raised, goal: goalCents, fraction: Math.min(1, raised / goalCents) };
}

export function formatMoney(cents: number, currency: string, locale = 'en'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** Remaining claimable units, or null when unlimited. */
export function unitsLeft(total: number | null, claimed: number): number | null {
  if (total === null) return null;
  return Math.max(0, total - claimed);
}
