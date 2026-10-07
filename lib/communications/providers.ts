/**
 * Real provider adapters + environment-driven factory — Phase 7.
 * Rules: real providers are used ONLY when their credentials are configured;
 * otherwise the NoOp providers log instead of sending, so development can
 * never send real messages by accident.
 */
import {
  NoOpEmailProvider,
  NoOpSmsProvider,
  type EmailPayload,
  type EmailProvider,
  type SmsPayload,
  type SmsProvider,
} from '@/services/communications/provider';

/** Resend-compatible HTTP email API (Resend or any /emails-compatible endpoint). */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async sendEmail(payload: EmailPayload): Promise<{ messageId: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? '',
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Email provider rejected the message (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { messageId: data.id ?? 'resend-unknown' };
  }
}

/** Twilio Programmable SMS adapter. */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string,
  ) {}

  async sendSms(payload: SmsPayload): Promise<{ messageId: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: this.fromNumber,
        To: payload.to,
        Body: payload.body,
      }).toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`SMS provider rejected the message (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = (await res.json().catch(() => ({}))) as { sid?: string };
    return { messageId: data.sid ?? 'twilio-unknown' };
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY ?? '';
  const from = process.env.EMAIL_FROM ?? 'Ever After <noreply@example.com>';
  if (apiKey) return new ResendEmailProvider(apiKey, from);
  return new NoOpEmailProvider();
}

export function getSmsProvider(): SmsProvider {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const token = process.env.TWILIO_AUTH_TOKEN ?? '';
  const from = process.env.TWILIO_FROM_NUMBER ?? '';
  if (sid && token && from) return new TwilioSmsProvider(sid, token, from);
  return new NoOpSmsProvider();
}

/** True when at least one real provider is configured. */
export function hasRealProviders(): { email: boolean; sms: boolean } {
  return {
    email: Boolean(process.env.RESEND_API_KEY),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER,
    ),
  };
}
