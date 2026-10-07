'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Live photo wall island — Phase 10.
 * Renders approved-public images and prepends newly approved ones in real
 * time via a Supabase Realtime subscription (RLS-filtered server-side, so
 * guests only ever receive public rows).
 */
export function PhotoWallLive({
  initial,
}: {
  initial: { id: string; url: string; label: string | null }[];
}) {
  const [photos, setPhotos] = useState(initial);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!url || !anonKey) return;
    const supabase = createBrowserClient(url, anonKey);
    const channel = supabase
      .channel('photo-wall')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'media' },
        (payload) => {
          const row = payload.new as {
            id: string;
            path: string;
            label: string | null;
            kind: string;
            visibility: string;
            is_approved: boolean;
          };
          if (row.kind !== 'image' || !row.is_approved) return;
          if (row.visibility !== 'approved-public' && row.visibility !== 'public') return;
          setPhotos((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [
              {
                id: row.id,
                url: `${url}/storage/v1/object/public/wedding-media/${row.path}`,
                label: row.label,
              },
              ...prev,
            ].slice(0, 48);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (photos.length === 0) return null;
  return (
    <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((g) => (
        <figure key={g.id} className="overflow-hidden" style={{ borderRadius: 'var(--wp-radius)' }}>
          <Image
            src={g.url}
            alt={g.label ?? 'Wedding photo'}
            width={600}
            height={600}
            className="aspect-square w-full object-cover"
            loading="lazy"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        </figure>
      ))}
    </div>
  );
}
