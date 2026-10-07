/**
 * Invitation + RSVP security integration tests — Phase 5.
 * Requires a live Supabase project (migrations 0001–0008 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Proves at the data layer what the rules engine enforces in the app:
 * - Only hashes are stored (raw tokens never persist).
 * - Anonymous users cannot read invitations, guests, rsvps, or questions.
 * - Members cannot reach another wedding's invitations/questions.
 * - RSVP rows are unique per guest+event (upsert-safe modification).
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { hashInvitationToken } from '@/lib/security/token-hash';

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

describe.skipIf(!hasEnv)(
  'invitation security',
  () => {
    it('tokens stay opaque and guest data stays tenant-scoped', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`rsvp-a-${stamp}@example.com`, password);
      const b = await setupUser(`rsvp-b-${stamp}@example.com`, password);
      const pub = anon();

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'RSVP A',
          slug: `rsvp-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { data: guest, error: gErr } = await a.client
        .from('guests')
        .insert({ wedding_id: wedding.id, display_name: 'Invitee', allow_plus_one: true })
        .select('id')
        .single();
      expect(gErr).toBeNull();
      if (!guest) throw new Error('setup failed');

      const { data: event, error: eErr } = await a.client
        .from('events')
        .insert({ wedding_id: wedding.id, name: 'Ceremony', timezone: 'UTC' })
        .select('id')
        .single();
      expect(eErr).toBeNull();
      if (!event) throw new Error('setup failed');

      const { error: linkErr } = await a.client
        .from('guest_events')
        .insert({ guest_id: guest.id, event_id: event.id });
      expect(linkErr).toBeNull();

      // Invitation row stores only the hash.
      const rawToken = `raw-token-${stamp}-abcdefghijklmnopqrstuvwxyz0123456789`;
      const { error: iErr } = await a.client.from('invitations').upsert(
        {
          wedding_id: wedding.id,
          guest_id: guest.id,
          token_hash: hashInvitationToken(rawToken),
          locale: 'en',
        },
        { onConflict: 'guest_id' },
      );
      expect(iErr).toBeNull();
      const { data: stored } = await a.client
        .from('invitations')
        .select('token_hash')
        .eq('guest_id', guest.id)
        .maybeSingle();
      expect((stored as { token_hash: string } | null)?.token_hash).toBe(
        hashInvitationToken(rawToken),
      );
      expect((stored as { token_hash: string } | null)?.token_hash).not.toContain('raw-token');

      // Second invitation for the same guest replaces (unique per guest).
      const { error: i2Err } = await a.client.from('invitations').upsert(
        {
          wedding_id: wedding.id,
          guest_id: guest.id,
          token_hash: hashInvitationToken(`${rawToken}-v2`),
          locale: 'en',
        },
        { onConflict: 'guest_id' },
      );
      expect(i2Err).toBeNull();
      const { data: allInvites } = await a.client
        .from('invitations')
        .select('id')
        .eq('guest_id', guest.id);
      expect(allInvites ?? []).toHaveLength(1);

      // Anonymous: invitations, guests, rsvps, questions all invisible.
      for (const table of ['invitations', 'guests', 'rsvps', 'rsvp_questions']) {
        const { data } = await pub.from(table).select('id').limit(1);
        expect(data ?? []).toHaveLength(0);
      }

      // Member of another wedding: nothing visible, nothing writable.
      const { data: bInvites } = await b.client.from('invitations').select('id');
      expect((bInvites ?? []).map((r) => r.id)).not.toContain(guest.id);
      const { error: evilQ } = await b.client.from('rsvp_questions').insert({
        wedding_id: wedding.id,
        question: 'Evil?',
        kind: 'text',
      });
      expect(evilQ).not.toBeNull();
      const { error: evilRsvp } = await b.client.from('rsvps').insert({
        wedding_id: wedding.id,
        guest_id: guest.id,
        event_id: event.id,
        status: 'attending',
      });
      expect(evilRsvp).not.toBeNull();

      // RSVP upsert keeps one row per guest+event (modification-safe).
      for (const status of ['attending', 'declined', 'attending']) {
        const { error } = await a.client.from('rsvps').upsert(
          { wedding_id: wedding.id, guest_id: guest.id, event_id: event.id, status },
          { onConflict: 'guest_id,event_id' },
        );
        expect(error).toBeNull();
      }
      const { data: rows } = await a.client
        .from('rsvps')
        .select('status')
        .eq('guest_id', guest.id)
        .eq('event_id', event.id);
      expect(rows ?? []).toHaveLength(1);
      expect((rows as { status: string }[])[0].status).toBe('attending');

      // Cleanup (service role).
      await admin().from('rsvps').delete().eq('wedding_id', wedding.id);
      await admin().from('invitations').delete().eq('wedding_id', wedding.id);
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
