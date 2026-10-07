/**
 * Website publishing integration tests — Phase 4.
 * Requires a live Supabase project (migrations 0001–0007 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: unpublished sites invisible to anonymous users, published sites
 * readable (wedding/events/monogram/website rows), guest data still hidden,
 * and media visibility gating at table + storage level.
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const hasEnv = url.length > 0 && anonKey.length > 0 && serviceKey.length > 0;

const BUCKET = 'wedding-media';

function admin() {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function anon() {
  return createClient(url, anonKey);
}

async function setupUser(email: string, password: string) {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient(url, anonKey);
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { userId: data.user.id, client };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe.skipIf(!hasEnv)(
  'website publishing',
  () => {
    it('publishes worlds-readable pages while guest data stays hidden', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`site-a-${stamp}@example.com`, password);
      const pub = anon();

      const slug = `site-${stamp}`;
      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({ title: 'Site A', slug, timezone: 'UTC', created_by: a.userId })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { error: eErr } = await a.client.from('events').insert({
        wedding_id: wedding.id,
        name: 'Ceremony',
        timezone: 'UTC',
      });
      expect(eErr).toBeNull();

      // Draft: anonymous users see nothing.
      const { data: draftWedding } = await pub.from('weddings').select('id').eq('id', wedding.id);
      expect(draftWedding ?? []).toHaveLength(0);
      const { data: draftSite } = await pub
        .from('wedding_websites')
        .select('wedding_id')
        .eq('wedding_id', wedding.id);
      expect(draftSite ?? []).toHaveLength(0);

      // Publish with a public + a private image.
      const { error: pubErr } = await a.client.from('wedding_websites').upsert({
        wedding_id: wedding.id,
        is_published: true,
        sections: [{ id: 'hero', enabled: true }],
        content: { partnerA: 'A', partnerB: 'B' },
      });
      expect(pubErr).toBeNull();

      const pubPath = `${wedding.id}/public-${stamp}.png`;
      const privPath = `${wedding.id}/private-${stamp}.png`;
      const file = new File([PNG], 'p.png', { type: 'image/png' });
      expect((await a.client.storage.from(BUCKET).upload(pubPath, file)).error).toBeNull();
      expect(
        (
          await a.client.storage
            .from(BUCKET)
            .upload(privPath, new File([PNG], 'q.png', { type: 'image/png' }))
        ).error,
      ).toBeNull();
      expect(
        (
          await a.client.from('media').insert([
            {
              wedding_id: wedding.id,
              path: pubPath,
              kind: 'image',
              mime: 'image/png',
              size_bytes: PNG.length,
              visibility: 'public',
            },
            {
              wedding_id: wedding.id,
              path: privPath,
              kind: 'image',
              mime: 'image/png',
              size_bytes: PNG.length,
              visibility: 'guest-only',
            },
          ])
        ).error,
      ).toBeNull();

      // Published: wedding/events/monogram/site rows readable…
      const { data: seenWedding } = await pub.from('weddings').select('id').eq('id', wedding.id);
      expect(seenWedding ?? []).toHaveLength(1);
      const { data: seenEvents } = await pub.from('events').select('id').eq('wedding_id', wedding.id);
      expect((seenEvents ?? []).length).toBeGreaterThan(0);
      const { data: seenSite } = await pub
        .from('wedding_websites')
        .select('wedding_id')
        .eq('wedding_id', wedding.id);
      expect(seenSite ?? []).toHaveLength(1);

      // …guest data still hidden…
      const { data: seenGuests } = await pub.from('guests').select('id').eq('wedding_id', wedding.id);
      expect(seenGuests ?? []).toHaveLength(0);
      const { data: seenMembers } = await pub
        .from('wedding_members')
        .select('user_id')
        .eq('wedding_id', wedding.id);
      expect(seenMembers ?? []).toHaveLength(0);

      // …public image downloadable, private image denied (table + storage).
      const { data: seenMedia } = await pub.from('media').select('path').eq('wedding_id', wedding.id);
      expect((seenMedia ?? []).map((m) => m.path)).toEqual([pubPath]);
      const { error: pubDown } = await pub.storage.from(BUCKET).download(pubPath);
      expect(pubDown).toBeNull();
      const { error: privDown } = await pub.storage.from(BUCKET).download(privPath);
      expect(privDown).not.toBeNull();

      // Cleanup (service role).
      await admin().storage.from(BUCKET).remove([pubPath, privPath]);
      await admin().from('media').delete().eq('wedding_id', wedding.id);
      await admin().from('events').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_websites').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
    });
  },
  90000,
);
