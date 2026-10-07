/**
 * Day-of integration tests — Phase 11.
 * Requires a live Supabase project (migrations 0001–0014 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: check-in uniqueness + reversal, announcement scoping, and
 * cross-tenant denial (RLS 42501) on both tables.
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

describe.skipIf(!hasEnv)(
  'day-of authorization',
  () => {
    it('scopes check-ins and announcements to their wedding', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`dayof-a-${stamp}@example.com`, password);
      const b = await setupUser(`dayof-b-${stamp}@example.com`, password);
      const pub = createClient(url, anonKey);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'DayOf A',
          slug: `dayof-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { data: event, error: eErr } = await a.client
        .from('events')
        .insert({ wedding_id: wedding.id, name: 'Ceremony', timezone: 'UTC' })
        .select('id')
        .single();
      expect(eErr).toBeNull();
      if (!event) throw new Error('setup failed');

      const { data: guest, error: gErr } = await a.client
        .from('guests')
        .insert({ wedding_id: wedding.id, display_name: 'Arriving Guest' })
        .select('id')
        .single();
      expect(gErr).toBeNull();
      if (!guest) throw new Error('setup failed');

      // Check-in + idempotent re-check-in (upsert-safe), then reversal.
      const { error: cErr } = await a.client.from('checkins').upsert(
        { wedding_id: wedding.id, guest_id: guest.id, event_id: event.id },
        { onConflict: 'guest_id,event_id' },
      );
      expect(cErr).toBeNull();
      const { error: c2Err } = await a.client.from('checkins').upsert(
        { wedding_id: wedding.id, guest_id: guest.id, event_id: event.id },
        { onConflict: 'guest_id,event_id' },
      );
      expect(c2Err).toBeNull();
      const { data: rows } = await a.client
        .from('checkins')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('event_id', event.id);
      expect(rows ?? []).toHaveLength(1);
      const { error: revErr } = await a.client
        .from('checkins')
        .delete()
        .eq('wedding_id', wedding.id)
        .eq('guest_id', guest.id)
        .eq('event_id', event.id);
      expect(revErr).toBeNull();
      const { data: rowsAfter } = await a.client
        .from('checkins')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('event_id', event.id);
      expect(rowsAfter ?? []).toHaveLength(0);

      // Announcements round-trip.
      const { error: aErr } = await a.client.from('announcements').insert({
        wedding_id: wedding.id,
        title: 'Cake cutting in 10',
      });
      expect(aErr).toBeNull();

      // Anonymous: nothing visible, nothing writable.
      for (const tbl of ['checkins', 'announcements']) {
        const { data } = await pub.from(tbl).select('id').limit(1);
        expect(data ?? []).toHaveLength(0);
      }

      // Other tenant: RLS 42501 on writes to both tables.
      const { error: evilCheckin } = await b.client.from('checkins').insert({
        wedding_id: wedding.id,
        guest_id: guest.id,
        event_id: event.id,
      });
      expect(evilCheckin).not.toBeNull();
      expect((evilCheckin as { code?: string }).code).toBe('42501');
      const { error: evilAnn } = await b.client.from('announcements').insert({
        wedding_id: wedding.id,
        title: 'Evil',
      });
      expect(evilAnn).not.toBeNull();
      expect((evilAnn as { code?: string }).code).toBe('42501');

      // Cleanup (service role).
      await admin().from('checkins').delete().eq('wedding_id', wedding.id);
      await admin().from('announcements').delete().eq('wedding_id', wedding.id);
      await admin().from('guest_events').delete().eq('guest_id', guest.id);
      await admin().from('guests').delete().eq('id', guest.id);
      await admin().from('events').delete().eq('id', event.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
