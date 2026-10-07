/**
 * Atomic write RPC tests — Phase 16.
 * Requires a live Supabase project (migrations 0001–0020 applied).
 *
 * Covers: multi-event RSVP in one transaction, fresh deadline enforcement
 * inside the RPC, tenant-guarded check-in, and cross-tenant denial.
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
  'atomic write RPCs',
  () => {
    it('batches RSVP rows, enforces deadlines fresh, and guards check-ins', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`atomic-a-${stamp}@example.com`, password);
      const b = await setupUser(`atomic-b-${stamp}@example.com`, password);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Atomic A',
          slug: `atomic-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { data: events } = await a.client
        .from('events')
        .insert([
          { wedding_id: wedding.id, name: 'Ceremony', timezone: 'UTC' },
          { wedding_id: wedding.id, name: 'Reception', timezone: 'UTC' },
        ])
        .select('id');
      if (!events || events.length !== 2) throw new Error('setup failed');
      const { data: guest } = await a.client
        .from('guests')
        .insert({ wedding_id: wedding.id, display_name: 'Guest' })
        .select('id')
        .single();
      if (!guest) throw new Error('setup failed');

      // Two events land in one call…
      const { data: count, error: rpcErr } = await a.client.rpc('submit_rsvp_batch', {
        p_wedding_id: wedding.id,
        p_guest_id: guest.id,
        p_rows: events.map((e) => ({
          event_id: e.id,
          status: 'attending',
          plus_one: false,
          plus_one_name: null,
          dietary: null,
          allergies: null,
          notes: null,
          answers: {},
        })),
      });
      expect(rpcErr).toBeNull();
      expect(count).toBe(2);
      const { data: rows } = await a.client
        .from('rsvps')
        .select('id')
        .eq('guest_id', guest.id);
      expect(rows ?? []).toHaveLength(2);

      // …a fresh past deadline blocks even though the caller never checked…
      await admin()
        .from('weddings')
        .update({ rsvp_deadline: new Date(Date.now() - 60_000).toISOString() })
        .eq('id', wedding.id);
      const { error: lateErr } = await a.client.rpc('submit_rsvp_batch', {
        p_wedding_id: wedding.id,
        p_guest_id: guest.id,
        p_rows: [
          {
            event_id: events[0].id,
            status: 'declined',
            plus_one: false,
            plus_one_name: null,
            dietary: null,
            allergies: null,
            notes: null,
            answers: {},
          },
        ],
      });
      expect(lateErr).not.toBeNull();
      expect(lateErr?.message ?? '').toMatch(/RSVP_DEADLINE/);

      // Tenant-guarded check-in records in one call…
      const { error: checkErr } = await a.client.rpc('checkin_guest', {
        p_wedding_id: wedding.id,
        p_guest_id: guest.id,
        p_event_id: events[0].id,
        p_by: a.userId,
      });
      expect(checkErr).toBeNull();
      const { data: checkins } = await a.client
        .from('checkins')
        .select('guest_id')
        .eq('wedding_id', wedding.id);
      expect((checkins ?? []).map((c) => c.guest_id)).toContain(guest.id);

      // …and rejects foreign guests, while strangers cannot write at all.
      const { error: foreignErr } = await b.client.rpc('checkin_guest', {
        p_wedding_id: wedding.id,
        p_guest_id: guest.id,
        p_event_id: events[0].id,
        p_by: b.userId,
      });
      expect(foreignErr).not.toBeNull();
      const { error: strangerBatch } = await b.client.rpc('submit_rsvp_batch', {
        p_wedding_id: wedding.id,
        p_guest_id: guest.id,
        p_rows: [
          {
            event_id: events[0].id,
            status: 'attending',
            plus_one: false,
            plus_one_name: null,
            dietary: null,
            allergies: null,
            notes: null,
            answers: {},
          },
        ],
      });
      expect(strangerBatch).not.toBeNull();

      // Cleanup (service role).
      await admin().from('rsvps').delete().eq('wedding_id', wedding.id);
      await admin().from('checkins').delete().eq('wedding_id', wedding.id);
      await admin().from('guest_events').delete().eq('guest_id', guest.id);
      await admin().from('guests').delete().eq('id', guest.id);
      await admin().from('events').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
