/**
 * Tenant isolation tests — Phase 1.
 * Requires a live Supabase project (migrations 0001–0004 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Without them the suite skips gracefully (unit tests still run).
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const hasEnv = url.length > 0 && serviceKey.length > 0;

async function createUser(email: string, password: string) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function signIn(email: string, password: string) {
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '');
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe.skipIf(!hasEnv)('cross-tenant isolation', () => {
  it('a user cannot read another wedding’s data', async () => {
    const stamp = Date.now();
    const password = 'Test1234!';
    const emailA = `tenant-a-${stamp}@example.com`;
    const emailB = `tenant-b-${stamp}@example.com`;

    const userA = await createUser(emailA, password);
    await createUser(emailB, password);

    const clientA = await signIn(emailA, password);
    const clientB = await signIn(emailB, password);

    // created_by is mandatory (RLS pins it to auth.uid(); the app's
    // createWedding action always sets it — see lib/db/weddings.ts).
    const { data: weddingA, error: errA } = await clientA
      .from('weddings')
      .insert({
        title: 'Wedding A',
        slug: `wedding-a-${stamp}`,
        timezone: 'UTC',
        created_by: userA.id,
      })
      .select('id')
      .single();
    expect(errA).toBeNull();
    if (!weddingA) throw new Error('test setup failed: wedding insert returned no row');

    // User B must not see wedding A…
    const { data: seenByB } = await clientB
      .from('weddings')
      .select('id')
      .eq('id', weddingA.id);
    expect(seenByB ?? []).toHaveLength(0);

    // …must not see its members…
    const { data: membersSeenByB } = await clientB
      .from('wedding_members')
      .select('user_id')
      .eq('wedding_id', weddingA.id);
    expect(membersSeenByB ?? []).toHaveLength(0);

    // …and must not insert events into it.
    const { error: insertErr } = await clientB.from('events').insert({
      wedding_id: weddingA.id,
      name: 'Intruder event',
      timezone: 'UTC',
    });
    expect(insertErr).not.toBeNull();
  }, 90000);
});
