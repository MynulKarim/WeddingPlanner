'use client';

import { useActionState } from 'react';
import {
  createRegistryItem,
  updateRegistryItem,
  type ItemFormState,
  type RegistryItemRow,
} from '@/lib/db/registry';
import { REGISTRY_KINDS, registryKindLabel } from '@/lib/registry/registry';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

export function ItemForm({
  weddingId,
  item,
}: {
  weddingId: string;
  item?: RegistryItemRow;
}) {
  const bound = item
    ? updateRegistryItem.bind(null, weddingId, item.id)
    : createRegistryItem.bind(null, weddingId);
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(bound, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Gift type
          <select name="kind" defaultValue={item?.kind ?? 'product'} className={inputClass}>
            {REGISTRY_KINDS.map((k) => (
              <option key={k} value={k}>
                {registryKindLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Title
          <input name="title" required defaultValue={item?.title ?? ''} placeholder="Honeymoon dinner in Paris" maxLength={160} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Description
        <textarea name="description" rows={2} defaultValue={item?.description ?? ''} className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Amount (cents, optional)
          <input name="amountCents" inputMode="numeric" defaultValue={item?.amount_cents ?? ''} placeholder="5000 = $50" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Currency
          <input name="currency" defaultValue={item?.currency ?? 'USD'} maxLength={3} className={`${inputClass} uppercase`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Quantity (optional)
          <input name="quantityTotal" inputMode="numeric" defaultValue={item?.quantity_total ?? ''} placeholder="Unlimited" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Product link (https://, optional)
          <input name="externalUrl" defaultValue={item?.external_url ?? ''} placeholder="https://…" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Image link (https://, optional)
          <input name="imageUrl" defaultValue={item?.image_url ?? ''} placeholder="https://…" className={inputClass} />
        </label>
      </div>
      {item && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={item.is_active} className="h-4 w-4 accent-[#1a1a1a] dark:accent-zinc-100" />
          Visible on the website
        </label>
      )}
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Saving…' : item ? 'Save changes' : 'Add gift'}
      </button>
    </form>
  );
}
