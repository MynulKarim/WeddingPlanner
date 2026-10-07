import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  renderTemplate,
  templateLabel,
  TEMPLATE_KINDS,
} from '@/lib/communications/variables';
import { renderTemplateMessage } from '@/lib/communications/templates';
import {
  deliverJob,
  processDueMessages,
} from '@/lib/communications/dispatch';
import {
  getEmailProvider,
  getSmsProvider,
} from '@/lib/communications/providers';
import {
  NoOpEmailProvider,
  NoOpSmsProvider,
} from '@/services/communications/provider';

describe('template variables', () => {
  it('renders {{vars}} and leaves unknown intact', () => {
    expect(renderTemplate('Hi {{guestName}} {{missing}}', { guestName: 'Salma' })).toBe(
      'Hi Salma {{missing}}',
    );
    expect(escapeHtml('<b>&"')).toBe('&lt;b&gt;&amp;&quot;');
  });

  it('labels all six kinds', () => {
    expect(TEMPLATE_KINDS).toHaveLength(6);
    expect(templateLabel('thank_you')).toBe('Thank you');
  });
});

describe('renderTemplateMessage', () => {
  const vars = {
    name: 'Salma',
    couple: 'Ayesha & Karim',
    date: '14 February 2027',
    event: 'Ceremony',
    venue: 'Grand Hall',
    message: 'Custom hello',
    link: 'https://example.com/invite/abc',
    website: 'https://example.com/w/a-k',
  };

  it('renders localized subjects and bodies with CTA', () => {
    const en = renderTemplateMessage('invitation', 'en', vars);
    expect(en.subject).toContain('Ayesha & Karim');
    expect(en.text).toContain('warmly');
    expect(en.html).toContain('https://example.com/invite/abc');
    const bn = renderTemplateMessage('invitation', 'bn', vars);
    expect(bn.subject).not.toBe(en.subject);
    expect(bn.text).toContain('Ayesha & Karim');
  });

  it('falls back to English for unknown locales', () => {
    const x = renderTemplateMessage('thank_you', 'xx', vars);
    expect(x.text).toBe(renderTemplateMessage('thank_you', 'en', vars).text);
  });

  it('honors overrides and custom announcements', () => {
    const over = renderTemplateMessage('invitation', 'en', vars, {
      subject: 'Custom {{event}}',
      body: 'Hi {{guestName}}!',
    });
    expect(over.subject).toBe('Custom Ceremony');
    expect(over.text).toBe('Hi Salma!');
    const ann = renderTemplateMessage('announcement', 'en', vars, {
      body: 'Traffic {{venue}}',
    });
    expect(ann.text).toBe('Traffic Grand Hall');
    expect(ann.subject).toBe('Custom hello');
  });

  it('escapes HTML in bodies', () => {
    const evil = renderTemplateMessage('announcement', 'en', { ...vars, message: '<script>' }, undefined);
    expect(evil.html).not.toContain('<script>');
    expect(evil.html).toContain('&lt;script&gt;');
  });
});

describe('delivery', () => {
  it('delivers via injected providers and reports failures', async () => {
    const ok = await deliverJob(new NoOpEmailProvider(), new NoOpSmsProvider(), 'email', {
      guestId: null,
      toAddress: 'a@example.com',
      subject: 'Hi',
      body: 'Hello',
    });
    expect(ok).toEqual({ ok: true, providerMessageId: 'noop-email' });

    const failing = {
      name: 'boom',
      sendEmail: async () => {
        throw new Error('provider down');
      },
    };
    const bad = await deliverJob(failing, new NoOpSmsProvider(), 'email', {
      guestId: null,
      toAddress: 'a@example.com',
      subject: 'Hi',
      body: 'Hello',
    });
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/provider down/);
  });

  it('selects noop providers without credentials', () => {
    expect(getEmailProvider().name).toBe('noop-email');
    expect(getSmsProvider().name).toBe('noop-sms');
  });

  it('processDueMessages with no rows returns zeros', async () => {
    const calls: string[] = [];
    const fake = {
      from: () => ({
        select: () => ({ eq: () => ({ lte: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
        update: () => ({ eq: () => { calls.push('update'); return Promise.resolve({}); } }),
      }),
    };
    const res = await processDueMessages(
      fake as never,
      new NoOpEmailProvider(),
      new NoOpSmsProvider(),
    );
    expect(res).toEqual({ sent: 0, failed: 0 });
    expect(calls).toEqual([]);
  });
});
