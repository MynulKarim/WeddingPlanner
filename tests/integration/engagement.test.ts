/**
 * Engagement privacy integration tests — Phase 10.
 * Requires a live Supabase project (migrations 0001–0013 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: moderation gates (unapproved invisible publicly), capsule sealing
 * by open date, guest media pending flow, vow privacy, cross-tenant writes.
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const hasEnv = url.length > 0 && anonKey.length > 0 && serviceKey.length > 0;

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
  'engagement privacy',
  () => {
    it('moderates guest content and seals the capsule', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`engage-a-${stamp}@example.com`, password);
      const b = await setupUser(`engage-b-${stamp}@example.com`, password);
      const pub = anon();

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Engage A',
          slug: `engage-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { error: pubErr } = await a.client.from('wedding_websites').upsert({
        wedding_id: wedding.id,
        is_published: true,
        sections: [],
        content: {},
      });
      expect(pubErr).toBeNull();

      // Guestbook: anonymous sign lands unapproved and invisible…
      const { error: signErr } = await pub.from('guestbook_entries').insert({
        wedding_id: wedding.id,
        guest_name: 'Well Wisher',
        message: 'Congrats!',
        is_approved: false,
      });
      expect(signErr).toBeNull();
      const { data: pubGb } = await pub.from('guestbook_entries').select('id').eq('wedding_id', wedding.id);
      expect(pubGb ?? []).toHaveLength(0);

      // …until approved.
      const { data: pending } = await a.client
        .from('guestbook_entries')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect(pending ?? []).toHaveLength(1);
      const pendingId = (pending as { id: string }[])[0].id;
      const { error: apErr } = await a.client
        .from('guestbook_entries')
        .update({ is_approved: true })
        .eq('id', pendingId);
      expect(apErr).toBeNull();
      const { data: pubGb2 } = await pub.from('guestbook_entries').select('id').eq('wedding_id', wedding.id);
      expect(pubGb2 ?? []).toHaveLength(1);

      // Anonymous cannot self-approve (forced unapproved).
      const { error: evilApprove } = await pub.from('guestbook_entries').insert({
        wedding_id: wedding.id,
        guest_name: 'Sneaky',
        message: 'Hi',
        is_approved: true,
      });
      expect(evilApprove).not.toBeNull();

      // Songs: same moderation shape.
      const { error: songErr } = await pub.from('song_requests').insert({
        wedding_id: wedding.id,
        guest_name: 'DJ Fan',
        title: 'At Last',
        is_approved: false,
      });
      expect(songErr).toBeNull();
      const { data: pubSongs } = await pub.from('song_requests').select('id').eq('wedding_id', wedding.id);
      expect(pubSongs ?? []).toHaveLength(0);

      // Time capsule: future-dated stays sealed even when approved…
      const future = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
      const { data: sealed, error: sealErr } = await a.client
        .from('time_capsules')
        .insert({
          wedding_id: wedding.id,
          guest_name: 'Future Self',
          message: 'Open me later',
          open_after: future,
          is_approved: true,
        })
        .select('id')
        .single();
      expect(sealErr).toBeNull();
      if (!sealed) throw new Error('setup failed');
      const { data: pubSealed } = await pub.from('time_capsules').select('id').eq('wedding_id', wedding.id);
      expect(pubSealed ?? []).toHaveLength(0);

      // …past-dated opens.
      const past = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
      const { error: openErr } = await a.client.from('time_capsules').insert({
        wedding_id: wedding.id,
        guest_name: 'Past Self',
        message: 'Opened!',
        open_after: past,
        is_approved: true,
      });
      expect(openErr).toBeNull();
      const { data: pubOpen } = await pub.from('time_capsules').select('id').eq('wedding_id', wedding.id);
      expect(pubOpen ?? []).toHaveLength(1);

      // Guest photo: anonymous upload lands pending + invisible…
      const path = `${wedding.id}/guest-${stamp}.png`;
      const file = new File([PNG], 'g.png', { type: 'image/png' });
      const { error: upErr } = await pub.storage.from('wedding-media').upload(path, file);
      expect(upErr).toBeNull();
      const { error: rowErr } = await pub.from('media').insert({
        wedding_id: wedding.id,
        path,
        kind: 'image',
        mime: 'image/png',
        size_bytes: PNG.length,
        visibility: 'guest-only',
        guest_name: 'Shutterbug',
        is_approved: false,
      });
      expect(rowErr).toBeNull();
      const { data: pubMedia } = await pub.from('media').select('id').eq('wedding_id', wedding.id);
      expect(pubMedia ?? []).toHaveLength(0);
      const { error: pubDown } = await pub.storage.from('wedding-media').download(path);
      expect(pubDown).not.toBeNull();

      // …member approves → publicly downloadable.
      const { data: pendingPhoto } = await a.client
        .from('media')
        .select('id')
        .eq('wedding_id', wedding.id)
        .eq('path', path)
        .single();
      if (!pendingPhoto) throw new Error('setup failed');
      const { error: photoAp } = await a.client
        .from('media')
        .update({ is_approved: true, visibility: 'approved-public' })
        .eq('id', (pendingPhoto as { id: string }).id);
      expect(photoAp).toBeNull();
      const { error: pubDown2 } = await pub.storage.from('wedding-media').download(path);
      expect(pubDown2).toBeNull();

      // Vows: invisible to anonymous and other tenants, always.
      const { error: vowErr } = await a.client
        .from('vows')
        .upsert({ wedding_id: wedding.id, shared: 'Forever' });
      expect(vowErr).toBeNull();
      const { data: pubVows } = await pub.from('vows').select('wedding_id').limit(1);
      expect(pubVows ?? []).toHaveLength(0);
      const { data: bVows } = await b.client.from('vows').select('wedding_id');
      expect((bVows ?? []).map((v) => v.wedding_id)).not.toContain(wedding.id);

      // Cross-tenant writes rejected on member-only tables. (Guestbook,
      // songs, and capsule intentionally accept PUBLIC writes on published
      // weddings — covered below against a draft wedding instead.)
      for (const [tbl, row] of [
        ['games', { wedding_id: wedding.id, kind: 'quiz', title: 'X' }],
        ['albums', { wedding_id: wedding.id, title: 'X' }],
        ['vows', { wedding_id: wedding.id, shared: 'X' }],
      ] as const) {
        const { error } = await b.client.from(tbl).insert(row);
        expect(error, tbl).not.toBeNull();
      }

      // Public writes die on unpublished weddings.
      const { data: draft, error: draftErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Draft Engage',
          slug: `engage-draft-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(draftErr).toBeNull();
      if (!draft) throw new Error('setup failed');
      for (const [tbl, row] of [
        ['guestbook_entries', { wedding_id: draft.id, guest_name: 'X', message: 'X' }],
        ['song_requests', { wedding_id: draft.id, guest_name: 'X', title: 'X' }],
        ['time_capsules', { wedding_id: draft.id, guest_name: 'X', message: 'X' }],
      ] as const) {
        const { error } = await b.client.from(tbl).insert(row);
        expect(error, tbl).not.toBeNull();
      }
      await admin().from('wedding_members').delete().eq('wedding_id', draft.id);
      await admin().from('weddings').delete().eq('id', draft.id);

      // Cleanup (service role).
      await admin().storage.from('wedding-media').remove([path]);
      await admin().from('media').delete().eq('wedding_id', wedding.id);
      await admin().from('guestbook_entries').delete().eq('wedding_id', wedding.id);
      await admin().from('song_requests').delete().eq('wedding_id', wedding.id);
      await admin().from('time_capsules').delete().eq('wedding_id', wedding.id);
      await admin().from('vows').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_websites').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
