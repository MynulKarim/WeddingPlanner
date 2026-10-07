'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewSend, sendMessages } from '@/lib/db/messages';
import type { PreviewInput } from '@/lib/db/messages';
import { TEMPLATE_KINDS, templateLabel, type TemplateKind } from '@/lib/communications/variables';
import type { Channel } from '@/lib/db/messages';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function ComposeForm({
  weddingId,
  events,
}: {
  weddingId: string;
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<TemplateKind>('invitation');
  const [channel, setChannel] = useState<Channel>('email');
  const [eventId, setEventId] = useState('');
  const [rsvp, setRsvp] = useState<'all' | 'attending' | 'pending' | 'declined'>('all');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [preview, setPreview] = useState<null | {
    subject: string;
    body: string;
    recipients: { guest_id: string; display_name: string; to_address: string }[];
    sampleGuest: string;
  }>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function input(): PreviewInput {
    return {
      kind,
      channel,
      eventId: eventId || null,
      rsvp,
      customSubject,
      customMessage,
      scheduledFor,
    };
  }

  function doPreview() {
    setPreviewError(null);
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    startTransition(async () => {
      const res = await previewSend(weddingId, input());
      if (res.error) setPreviewError(res.error);
      else setPreview(res);
    });
  }

  function doSend() {
    if (!confirmed) return;
    setResult(null);
    startTransition(async () => {
      const res = await sendMessages(weddingId, { ...input(), confirm: true });
      if (res.error) {
        setResult(`Error: ${res.error}`);
      } else {
        const parts = [];
        if (res.sent) parts.push(`${res.sent} sent`);
        if (res.scheduled) parts.push(`${res.scheduled} scheduled`);
        if (res.failed) parts.push(`${res.failed} failed`);
        if (res.skipped?.length) parts.push(`skipped: ${res.skipped.join('; ')}`);
        setResult(parts.join(' · ') || 'Done.');
        setPreview(null);
        setConfirmed(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Template
          <select value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)} className={inputClass}>
            {TEMPLATE_KINDS.map((k) => (
              <option key={k} value={k}>
                {templateLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Channel
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={inputClass}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Event scope
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Audience
          <select
            value={rsvp}
            onChange={(e) => setRsvp(e.target.value as typeof rsvp)}
            className={inputClass}
          >
            <option value="all">Everyone with contact details</option>
            <option value="attending">Attending</option>
            <option value="pending">Pending response</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Schedule (optional)
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      {(kind === 'announcement' || kind === 'thank_you') && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Custom subject (announcements)
          <input
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="Announcement subject"
            className={inputClass}
          />
        </label>
      )}
      {(kind === 'announcement' || channel === 'sms') && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Custom message
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={kind === 'announcement' ? 'Your announcement…' : 'Replaces the template body for this send'}
            rows={3}
            className={inputClass}
          />
        </label>
      )}
      {kind === 'invitation' && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Sending invitations creates fresh personal links for each recipient — any
          older links for them stop working.
        </p>
      )}
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={doPreview}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
        >
          {pending ? 'Working…' : 'Preview recipients & message'}
        </button>
      </div>

      {previewError && <p className="text-sm text-red-700 dark:text-red-400">{previewError}</p>}

      {preview && (
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
          <p className="text-sm">
            <strong>
              {preview.recipients.length} recipient{preview.recipients.length === 1 ? '' : 's'}
            </strong>
            {scheduledFor ? ` · scheduled for ${scheduledFor}` : ' · sends immediately'}
          </p>
          <p className="mt-2 text-sm font-medium">Subject: {preview.subject || '(none — SMS)'}</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-3 font-mono text-xs dark:bg-white/10">
            {preview.body}
          </pre>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            First recipients: {preview.recipients.slice(0, 8).map((r) => r.display_name).join(', ')}
            {preview.recipients.length > 8 && ` +${preview.recipients.length - 8} more`}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Links render per recipient in their own language — preview shows {preview.sampleGuest}&apos;s version.
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100"
            />
            I confirm sending to these {preview.recipients.length} recipients
            {scheduledFor ? ` at ${scheduledFor}` : ' right now'}.
          </label>
          <button
            type="button"
            disabled={pending || !confirmed}
            onClick={doSend}
            className="mt-3 rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Sending…' : scheduledFor ? 'Schedule send' : 'Send now'}
          </button>
        </div>
      )}
      {result && <p className="text-sm font-medium">{result}</p>}
    </div>
  );
}
