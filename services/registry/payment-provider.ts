/**
 * Payment abstraction — Phase 0.
 * Registry domain logic stays provider-agnostic (Phase 8).
 */

export interface PaymentIntent {
  amountMinor: number;
  currency: string;
  reference: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: PaymentIntent): Promise<{ checkoutUrl: string; providerRef: string }>;
}

/** Placeholder until a real Stripe/regional adapter is added. */
export class NoOpPaymentProvider implements PaymentProvider {
  readonly name = 'noop-payments';
  async createCheckout(input: PaymentIntent) {
    return {
      checkoutUrl: `#checkout/${input.reference}`,
      providerRef: 'noop',
    };
  }
}
