/**
 * Communication provider abstractions — Phase 0.
 * Core domain calls `sendInvitation(...)`, never Resend/Twilio directly.
 * Real adapters + templates arrive in Phase 7.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(payload: EmailPayload): Promise<{ messageId: string }>;
}

export interface SmsPayload {
  to: string;
  body: string;
}

export interface SmsProvider {
  readonly name: string;
  sendSms(payload: SmsPayload): Promise<{ messageId: string }>;
}

/** Development no-op: logs instead of sending. */
export class NoOpEmailProvider implements EmailProvider {
  readonly name = 'noop-email';
  async sendEmail(payload: EmailPayload) {
    console.log('[email:noop]', payload.to, payload.subject);
    return { messageId: 'noop-email' };
  }
}

export class NoOpSmsProvider implements SmsProvider {
  readonly name = 'noop-sms';
  async sendSms(payload: SmsPayload) {
    console.log('[sms:noop]', payload.to);
    return { messageId: 'noop-sms' };
  }
}
