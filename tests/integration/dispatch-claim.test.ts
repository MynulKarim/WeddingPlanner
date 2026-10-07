/**
 * Dispatch claim integration tests — Phase 16.
 * Requires a live Supabase project (migrations 0001–0019 applied).
 *
 * Covers: atomic claim of due rows (scheduled→sending), second claim finds
 * nothing (overlap-safe), wedding-scoped claims, stale-claim recovery after
 * the 10-minute window, and finalize to sent.
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
  'dispatch claims',
  () => {
    it('claims each due row exactly once and recovers stale claims', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`claim-a-${stamp}@example.com`, password);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Claim A',
          slug: `claim-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const past = new Date(Date.now() - 60_000).toISOString();
      const { data: message, error: mErr } = await a.client
        .from('messages')
        .insert({
          wedding_id: wedding.id,
          template_kind: 'announcement',
          channel: 'email',
          to_address: 'guest@example.com',
          subject: 'Hi',
          body_snapshot: 'Hello',
          status: 'scheduled',
          scheduled_for: past,
        })
        .select('id')
        .single();
      expect(mErr).toBeNull();
      if (!message) throw new Error('setup failed');

      // First claim owns the row…
      const { data: claimed, error: cErr } = await a.client.rpc('claim_due_messages', {
        p_now: new Date().toISOString(),
        p_limit: 100,
        p_wedding_id: wedding.id,
      });
      expect(cErr).toBeNull();
      expect((claimed ?? []).map((r: { id: string }) => r.id)).toContain(message.id);

      // …second claim finds nothing (overlap-safe)…
      const { data: reclaimed } = await a.client.rpc('claim_due_messages', {
        p_now: new Date().toISOString(),
        p_limit: 100,
        p_wedding_id: wedding.id,
      });
      expect(reclaimed ?? []).toHaveLength(0);

      // …other weddings claim nothing here…
      const { data: foreign } = await a.client.rpc('claim_due_messages', {
        p_now: new Date().toISOString(),
        p_limit: 100,
        p_wedding_id: '00000000-0000-0000-0000-000000000000',
      });
      expect(foreign ?? []).toHaveLength(0);

      // …and a stale claim (crashed worker) becomes reclaimable.
      await admin()
        .from('messages')
        .update({ claimed_at: new Date(Date.now() - 3_600_000).toISOString() })
        .eq('id', message.id);
      const { data: recovered } = await a.client.rpc('claim_due_messages', {
        p_now: new Date().toISOString(),
        p_limit: 100,
        p_wedding_id: wedding.id,
      });
      expect((recovered ?? []).map((r: { id: string }) => r.id)).toContain(message.id);

      // Finalize to sent.
      const { error: finErr } = await a.client
        .from('messages')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', message.id);
      expect(finErr).toBeNull();

      // Cleanup (service role).
      await admin().from('messages').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
    });
  },
  90000,
);
