'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { claimItem, type ClaimState } from '@/lib/db/registry';
import { formatMoney, fundProgress, registryKindLabel, unitsLeft } from '@/lib/registry/registry';
import { t } from '@/lib/i18n/dict';
import type { RegistryDisplayItem } from '@/components/website/website-view';

export function RegistryCard({
  item,
  locale,
  weddingId,
}: {
  item: RegistryDisplayItem;
  locale: string;
  weddingId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ClaimState>({});
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState('');
  const left = unitsLeft(item.quantity_total, item.quantity_claimed);
  const soldOut = left !== null && left <= 0;
  const isFund = item.kind === 'cash' || item.kind === 'custom';
  const progress = isFund ? fundProgress([item.raised_cents], item.amount_cents) : null;

  async function submit(formData: FormData) {
    setPending(true);
    const withCents = new FormData();
    for (const [k, v] of formData.entries()) withCents.set(k, v);
    if (amount.trim()) {
      const cents = Math.round(Number(amount) * 100);
      withCents.set('amountCents', Number.isFinite(cents) && cents > 0 ? String(cents) : '');
    }
    const result = await claimItem(weddingId, item.id, {}, withCents);
    setState(result);
    setPending(false);
  }

  const display: CSSProperties = { fontFamily: 'var(--wp-font-display)' };
  const muted: CSSProperties = { color: 'var(--wp-muted)' };

  return (
    <li
      className="px-6 py-6"
      style={{
        background: 'var(--wp-surface)',
        borderRadius: 'var(--wp-radius)',
        border: '1px solid color-mix(in srgb, var(--wp-muted) 25%, transparent)',
      }}
    >
      <p className="text-xs uppercase tracking-widest" style={muted}>
        {registryKindLabel(item.kind)}
      </p>
      <p className="mt-1 text-2xl" style={display}>
        {item.title}
      </p>
      {item.description && (
        <p className="mt-2 text-sm leading-6" style={muted}>
          {item.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {item.amount_cents ? (
          <span className="font-medium">{formatMoney(item.amount_cents, item.currency, locale)}</span>
        ) : null}
        {progress && progress.fraction !== null && (
          <span className="flex min-w-40 flex-1 items-center gap-2">
            <span
              className="h-2 flex-1 overflow-hidden rounded-full"
              style={{ background: 'color-mix(in srgb, var(--wp-muted) 25%, transparent)' }}
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round(progress.fraction * 100)}%`, background: 'var(--wp-accent)' }}
              />
            </span>
            <span style={muted}>
              {formatMoney(progress.raised, item.currency, locale)}
              {progress.goal ? ` / ${formatMoney(progress.goal, item.currency, locale)}` : ''}
            </span>
          </span>
        )}
        {left !== null && <span style={muted}>{left} left</span>}
        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            View
          </a>
        )}
      </div>
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt={item.title} loading="lazy" className="mt-3 max-h-56 w-full object-cover" style={{ borderRadius: 'var(--wp-radius)' }} />
      )}

      <div className="mt-4">
        {state.ok ? (
          <p className="text-sm font-medium">{t(locale, 'claim.done')}</p>
        ) : soldOut ? (
          <p className="text-sm font-medium" style={muted}>
            {t(locale, 'claim.soldOut')}
          </p>
        ) : open ? (
          <form
            action={(fd) => {
              void submit(fd);
            }}
            className="flex flex-col gap-2"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="guestName"
                required
                maxLength={120}
                placeholder={t(locale, 'claim.name')}
                aria-label={t(locale, 'claim.name')}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
              />
              <input
                name="guestEmail"
                type="email"
                placeholder={t(locale, 'claim.email')}
                aria-label={t(locale, 'claim.email')}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
              />
            </div>
            {isFund && (
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                required
                placeholder={`${t(locale, 'claim.amount')} (${item.currency})`}
                aria-label={t(locale, 'claim.amount')}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
              />
            )}
            <input
              name="message"
              maxLength={1000}
              placeholder={t(locale, 'claim.message')}
              aria-label={t(locale, 'claim.message')}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--wp-background)', color: 'var(--wp-ink)' }}
            />
            {state.error && <p className="text-sm text-red-700">{state.error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{
                  background: 'var(--wp-accent)',
                  color: 'var(--wp-accent-ink)',
                  borderRadius: 'var(--wp-radius)',
                }}
              >
                {pending ? '…' : t(locale, isFund ? 'claim.contribute' : 'claim.reserve')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setState({});
                }}
                className="rounded-full border px-6 py-2.5 text-sm"
              >
                ×
              </button>
            </div>
            <p className="text-xs" style={muted}>
              Demonstration checkout — no money moves.
            </p>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full px-6 py-2.5 text-sm font-medium"
            style={{
              background: 'var(--wp-accent)',
              color: 'var(--wp-accent-ink)',
              borderRadius: 'var(--wp-radius)',
            }}
          >
            {t(locale, isFund ? 'claim.contribute' : 'claim.reserve')}
          </button>
        )}
      </div>
    </li>
  );
}
