import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  fundProgress,
  registryKindLabel,
  unitsLeft,
  validateClaim,
  validateRegistryItem,
} from '@/lib/registry/registry';
import { sanitizeWebsiteContent } from '@/lib/website/content';

describe('registry item validation', () => {
  const base = {
    kind: 'product',
    title: 'Toaster',
    description: '',
    amountCents: '',
    currency: 'USD',
    externalUrl: '',
    imageUrl: '',
    quantityTotal: '',
  };

  it('accepts minimal valid items and flags problems', () => {
    expect(validateRegistryItem(base)).toEqual([]);
    expect(validateRegistryItem({ ...base, kind: 'bogus' })).toHaveLength(1);
    expect(validateRegistryItem({ ...base, title: '' })).toHaveLength(1);
    expect(validateRegistryItem({ ...base, amountCents: '12.5' })).toHaveLength(1);
    expect(validateRegistryItem({ ...base, currency: 'US' })).toHaveLength(1);
    expect(validateRegistryItem({ ...base, externalUrl: 'http://x' })).toHaveLength(1);
    expect(validateRegistryItem({ ...base, quantityTotal: '0' })).toHaveLength(1);
    expect(registryKindLabel('cash')).toBe('Cash gift');
  });
});

describe('claim validation + progress math', () => {
  it('validates claim input', () => {
    expect(
      validateClaim({ guestName: '', guestEmail: 'bad', amountCents: '', message: '' }),
    ).toHaveLength(2);
    expect(
      validateClaim(
        { guestName: 'Salma', guestEmail: '', amountCents: '', message: '' },
        { amountRequired: true },
      ),
    ).toHaveLength(1);
    expect(
      validateClaim({ guestName: 'Salma', guestEmail: '', amountCents: '5000', message: '' }),
    ).toEqual([]);
  });

  it('computes fund progress and units', () => {
    expect(fundProgress([2000, 3000], 10000)).toEqual({ raised: 5000, goal: 10000, fraction: 0.5 });
    expect(fundProgress([20000], 10000).fraction).toBe(1);
    expect(fundProgress([5], null)).toEqual({ raised: 5, goal: null, fraction: null });
    expect(unitsLeft(10, 3)).toBe(7);
    expect(unitsLeft(2, 5)).toBe(0);
    expect(unitsLeft(null, 5)).toBeNull();
  });

  it('formats money per locale', () => {
    expect(formatMoney(5000, 'USD', 'en')).toContain('50');
    expect(formatMoney(5050, 'USD', 'en')).toContain('50.50');
  });
});

describe('website content new fields', () => {
  it('keeps logistics fields and validates map URLs', () => {
    const out = sanitizeWebsiteContent({
      directions: '  Take exit 9  ',
      airport: 'DAC',
      mapUrl: 'https://maps.google.com/?q=x',
      dietaryNote: 'Halal options',
    });
    expect(out.directions).toBe('Take exit 9');
    expect(out.airport).toBe('DAC');
    expect(out.mapUrl).toBe('https://maps.google.com/?q=x');
    expect(out.dietaryNote).toBe('Halal options');
    expect(sanitizeWebsiteContent({ mapUrl: 'javascript:alert(1)' }).mapUrl).toBeUndefined();
    expect(sanitizeWebsiteContent({ mapUrl: 'http://x' }).mapUrl).toBeUndefined();
  });
});
