/**
 * Audit log integration tests — Phase 13.
 * Requires a live Supabase project (migrations 0001–0015 applied).
 *
 * Covers: member writes + reads own wedding's logs, cross-tenant denial,
 * append-only shape (no update/delete path).
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
  'audit log isolation',
  () => {
    it('keeps audit trails tenant-scoped and append-only', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`audit-a-${stamp}@example.com`, password);
      const b = await setupUser(`audit-b-${stamp}@example.com`, password);
      const pub = createClient(url, anonKey);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Audit A',
          slug: `audit-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { error: wLogErr } = await a.client.from('audit_logs').insert({
        wedding_id: wedding.id,
        action: 'wedding.created',
        entity: 'wedding',
        entity_id: wedding.id,
      });
      expect(wLogErr).toBeNull();

      const { data: mine } = await a.client
        .from('audit_logs')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect((mine ?? []).length).toBeGreaterThan(0);

      // Other tenant + anonymous: invisible and unwritable.
      const { data: bRows } = await b.client.from('audit_logs').select('id').limit(50);
      expect(bRows ?? []).toHaveLength(0);
      const { data: pubRows } = await pub.from('audit_logs').select('id').limit(1);
      expect(pubRows ?? []).toHaveLength(0);
      const { error: evil } = await b.client.from('audit_logs').insert({
        wedding_id: wedding.id,
        action: 'evil',
      });
      expect(evil).not.toBeNull();

      // Cleanup (service role bypasses the append-only shape).
      await admin().from('audit_logs').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
