'use client';

import { useState, type ReactNode } from 'react';
import {
  InvitationPreview,
  type PreviewData,
  type PreviewViewport,
} from '@/components/invitation/invitation-preview';

export function PreviewShell({ data, children }: { data?: PreviewData; children?: ReactNode }) {
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  return (
    <div>
      <div className="mb-3 flex gap-2" role="group" aria-label="Preview viewport">
        {(['desktop', 'mobile'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setViewport(v)}
            aria-pressed={viewport === v}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              viewport === v
                ? 'bg-[#1a1a1a] text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10'
            }`}
          >
            {v === 'desktop' ? 'Desktop' : 'Mobile'}
          </button>
        ))}
      </div>
      <div
        className={`mx-auto transition-all ${viewport === 'mobile' ? 'max-w-[380px]' : 'max-w-2xl'}`}
      >
        <div
          className={
            viewport === 'mobile'
              ? 'rounded-[2rem] border border-black/15 p-2 dark:border-white/15'
              : ''
          }
        >
          {children ?? (data ? <InvitationPreview data={data} /> : null)}
        </div>
      </div>
    </div>
  );
}
