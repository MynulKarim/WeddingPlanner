'use client';

import { useState, useTransition } from 'react';
import { submitRsvp } from '@/lib/db/rsvp';
import type { EventSubmission } from '@/lib/rsvp/rules';
import type { PublicQuestion, ResolvedRsvp } from '@/lib/invite/resolve';
import { t } from '@/lib/i18n/dict';
import type { I18nKey } from '@/lib/i18n/keys';

interface EventInfo {
  event_id: string;
  name: string;
}

const inputClass =
  'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--wp-accent)]';

export function RsvpForm({
  token,
  locale,
  events,
  questions,
  initial,
  allowPlusOne,
  deadlinePassed,
}: {
  token: string;
  locale: string;
  events: EventInfo[];
  questions: PublicQuestion[];
  initial: Record<string, ResolvedRsvp>;
  allowPlusOne: boolean;
  deadlinePassed: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<string, 'attending' | 'declined' | ''>>(() =>
    Object.fromEntries(
      events.map((e) => {
        const s = initial[e.event_id]?.status;
        return [e.event_id, s === 'attending' || s === 'declined' ? s : ''];
      }),
    ),
  );
  const [plusOne, setPlusOne] = useState(
    Object.fromEntries(events.map((e) => [e.event_id, initial[e.event_id]?.plus_one ?? false] as const)),
  );
  const [fields, setFields] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(
      events.map((e) => {
        const r = initial[e.event_id];
        const answers: Record<string, string> = {};
        for (const q of questions) {
          if (q.event_id === null || q.event_id === e.event_id) {
            answers[q.id] = r?.answers?.[q.id] ?? '';
          }
        }
        return [
          e.event_id,
          {
            plusOneName: r?.plus_one_name ?? '',
            dietary: r?.dietary ?? '',
            allergies: r?.allergies ?? '',
            notes: r?.notes ?? '',
            ...answers,
          },
        ] as const;
      }),
    ),
  );
  const [errorKey, setErrorKey] = useState<I18nKey | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function setField(eventId: string, key: string, value: string) {
    setFields((f) => ({ ...f, [eventId]: { ...f[eventId], [key]: value } }));
  }

  function submit() {
    setErrorKey(null);
    const submissions: EventSubmission[] = [];
    for (const e of events) {
      const status = statuses[e.event_id];
      if (!status) continue;
      submissions.push({
        eventId: e.event_id,
        status,
        plusOne: plusOne[e.event_id] ?? false,
        plusOneName: fields[e.event_id]?.plusOneName ?? '',
        dietary: fields[e.event_id]?.dietary ?? '',
        allergies: fields[e.event_id]?.allergies ?? '',
        notes: fields[e.event_id]?.notes ?? '',
        answers: Object.fromEntries(
          questions
            .filter((q) => q.event_id === null || q.event_id === e.event_id)
            .map((q) => [q.id, fields[e.event_id]?.[q.id] ?? '']),
        ),
      });
    }
    if (submissions.length === 0) {
      setErrorKey('invite.chooseOne');
      return;
    }
    startTransition(async () => {
      const result = await submitRsvp(token, submissions);
      if (result.errorKey) setErrorKey(result.errorKey as I18nKey);
      else setConfirmed(true);
    });
  }

  if (deadlinePassed && !confirmed) {
    return (
      <p className="text-center text-sm" style={{ color: 'var(--wp-muted)' }}>
        {t(locale, 'invite.deadlinePassed')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {confirmed && (
        <p
          className="rounded-xl px-5 py-4 text-center text-sm font-medium"
          style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-accent)' }}
        >
          {t(locale, 'invite.saved')} {t(locale, 'invite.savedHint')}
        </p>
      )}
      {events.map((e) => {
        const eventQuestions = questions.filter(
          (q) => q.event_id === null || q.event_id === e.event_id,
        );
        return (
          <div
            key={e.event_id}
            className="px-5 py-5"
            style={{
              background: 'var(--wp-surface)',
              borderRadius: 'var(--wp-radius)',
              border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
            }}
          >
            <p className="text-lg" style={{ fontFamily: 'var(--wp-font-display)' }}>
              {e.name}
            </p>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label={`${t(locale, 'invite.rsvp')} — ${e.name}`}>
              {(['attending', 'declined'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={statuses[e.event_id] === s}
                  onClick={() =>
                    setStatuses((prev) => ({ ...prev, [e.event_id]: s }))
                  }
                  className="flex-1 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={
                    statuses[e.event_id] === s
                      ? { background: 'var(--wp-accent)', color: 'var(--wp-accent-ink)', borderColor: 'transparent' }
                      : { borderColor: 'color-mix(in srgb, var(--wp-muted) 40%, transparent)' }
                  }
                >
                  {t(locale, s === 'attending' ? 'invite.attending' : 'invite.declined')}
                </button>
              ))}
            </div>

            {statuses[e.event_id] === 'attending' && (
              <div className="mt-4 flex flex-col gap-3">
                {allowPlusOne && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={plusOne[e.event_id] ?? false}
                      onChange={(ev) =>
                        setPlusOne((p) => ({ ...p, [e.event_id]: ev.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    {t(locale, 'invite.plusOne')}
                  </label>
                )}
                {allowPlusOne && plusOne[e.event_id] && (
                  <input
                    value={fields[e.event_id]?.plusOneName ?? ''}
                    onChange={(ev) => setField(e.event_id, 'plusOneName', ev.target.value)}
                    placeholder={t(locale, 'invite.plusOneName')}
                    aria-label={t(locale, 'invite.plusOneName')}
                    className={inputClass}
                    style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={fields[e.event_id]?.dietary ?? ''}
                    onChange={(ev) => setField(e.event_id, 'dietary', ev.target.value)}
                    placeholder={t(locale, 'invite.dietaryPh')}
                    aria-label={t(locale, 'invite.dietary')}
                    className={inputClass}
                    style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                  />
                  <input
                    value={fields[e.event_id]?.allergies ?? ''}
                    onChange={(ev) => setField(e.event_id, 'allergies', ev.target.value)}
                    placeholder={t(locale, 'invite.allergiesPh')}
                    aria-label={t(locale, 'invite.allergies')}
                    className={inputClass}
                    style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                  />
                </div>
                {eventQuestions.map((q) => (
                  <div key={q.id} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                      {q.question}
                      {q.required && <span aria-hidden="true"> *</span>}
                    </label>
                    {q.kind === 'boolean' ? (
                      <select
                        value={fields[e.event_id]?.[q.id] ?? ''}
                        onChange={(ev) => setField(e.event_id, q.id, ev.target.value)}
                        className={inputClass}
                        style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                      >
                        <option value="">{t(locale, 'invite.select')}</option>
                        <option value="yes">{t(locale, 'invite.yes')}</option>
                        <option value="no">{t(locale, 'invite.no')}</option>
                      </select>
                    ) : q.kind === 'choice' ? (
                      <select
                        value={fields[e.event_id]?.[q.id] ?? ''}
                        onChange={(ev) => setField(e.event_id, q.id, ev.target.value)}
                        className={inputClass}
                        style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                      >
                        <option value="">{t(locale, 'invite.select')}</option>
                        {q.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={fields[e.event_id]?.[q.id] ?? ''}
                        onChange={(ev) => setField(e.event_id, q.id, ev.target.value)}
                        placeholder={t(locale, 'invite.notes')}
                        aria-label={q.question}
                        className={inputClass}
                        style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                      />
                    )}
                  </div>
                ))}
                <textarea
                  value={fields[e.event_id]?.notes ?? ''}
                  onChange={(ev) => setField(e.event_id, 'notes', ev.target.value)}
                  placeholder={t(locale, 'invite.notes')}
                  aria-label={t(locale, 'invite.notes')}
                  rows={2}
                  className={inputClass}
                  style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
                />
              </div>
            )}
          </div>
        );
      })}
      {errorKey && (
        <p className="rounded-xl bg-red-50 px-5 py-3 text-center text-sm text-red-800">
          {t(locale, errorKey)}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded-full px-8 py-3.5 text-sm font-medium disabled:opacity-50 print:hidden"
        style={{
          background: 'var(--wp-accent)',
          color: 'var(--wp-accent-ink)',
          borderRadius: 'var(--wp-radius)',
        }}
      >
        {pending ? '…' : confirmed ? t(locale, 'invite.update') : t(locale, 'invite.send')}
      </button>
    </div>
  );
}
