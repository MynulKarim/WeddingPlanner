'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/** Refresh attendance counts live as other devices check guests in. */
export function AttendanceLive({ weddingId }: { weddingId: string }) {
  const router = useRouter();
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!url || !anonKey) return;
    const supabase = createBrowserClient(url, anonKey);
    const channel = supabase
      .channel(`attendance:${weddingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins', filter: `wedding_id=eq.${weddingId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [weddingId, router]);
  return null;
}
