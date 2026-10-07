'use client';

import { useActionState } from 'react';
import { createVendorPayment, type VendorPaymentFormState } from '@/lib/db/planning';

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 focus:border-[#8a6d3b]';

/** Record one installment against a vendor (rolls into paid automatically). */
export function PaymentForm({ weddingId, vendorId }: { weddingId: string; vendorId: string }) {
  const [state, formAction, pending] = useActionState<VendorPaymentFormState, FormData>(
    createVendorPayment.bind(null, weddingId, vendorId),
    {},
  );
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Amount (cents)
          <input name="amount" required inputMode="numeric" placeholder="50000" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Paid on
          <input type="date" name="paidOn" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Note
          <input name="note" maxLength={500} placeholder="Deposit" className={inputClass} />
        </label>
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full border border-black/10 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        {pending ? 'Recording…' : '+ Record payment'}
      </button>
    </form>
  );
}
