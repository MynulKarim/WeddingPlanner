/**
 * Guest input validation — Phase 2 (pure, unit-tested).
 */
import { isSupportedLocale } from '@/lib/i18n/languages';

export interface GuestInput {
  displayName: string;
  email: string;
  locale: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateGuestInput(input: GuestInput): string[] {
  const errors: string[] = [];
  if (!input.displayName.trim()) errors.push('Guest name is required.');
  if (input.email.trim() && !EMAIL_RE.test(input.email.trim())) {
    errors.push('Email address is not valid.');
  }
  if (input.locale.trim() && !isSupportedLocale(input.locale.trim())) {
    errors.push('Language is not supported.');
  }
  return errors;
}
