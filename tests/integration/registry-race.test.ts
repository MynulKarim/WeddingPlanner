/**
 * Registry oversell race tests — Phase 16.
 * Requires a live Supabase project (migrations 0001–0020 applied).
 *
 * Five guests concurrently claim an item with 2 units through the atomic
 * claim RPC on the anonymous (guest) path: exactly 2 reserve, 3 hear
 * "sold out", and the public total never exceeds stock (the pre-0020
 * select-then-insert oversold here).
 *
 * Note: the RPC (not the claimItem server action) is exercised because
 * server actions need Next request scope (cookies), unavailable in vitest.
 * claimItem itself routes to this RPC after validation.
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
  'registry oversell gate',
  () => {
    it('never reserves past quantity_total under concurrency', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`race-a-${stamp}@example.com`, password);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Race A',
          slug: `race-a-${stamp}`,
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

      const { data: item, error: iErr } = await a.client
        .from('registry_items')
        .insert({
          wedding_id: wedding.id,
          kind: 'product',
          title: 'Toaster',
          quantity_total: 2,
          is_active: true,
        })
        .select('id')
        .single();
      expect(iErr).toBeNull();
      if (!item) throw new Error('setup failed');

      const pub = createClient(url, anonKey);
      const outcomes = await Promise.all(
        ['Amy', 'Ben', 'Cat', 'Dan', 'Eve'].map((name) =>
          pub.rpc('claim_registry_item', {
            p_item_id: item.id,
            p_wedding_id: wedding.id,
            p_guest_name: `${name}-${stamp}`,
            p_guest_email: '',
            p_amount_cents: null,
            p_message: '',
          }),
        ),
      );
      for (const o of outcomes) expect(o.error).toBeNull();
      const verdicts = outcomes.map((o) => o.data);
      expect(verdicts.filter((v) => v === 'ok')).toHaveLength(2);
      expect(verdicts.filter((v) => v === 'sold_out')).toHaveLength(3);

      const { data: final } = await a.client
        .from('registry_items')
        .select('quantity_claimed')
        .eq('id', item.id)
        .single();
      expect((final as { quantity_claimed: number } | null)?.quantity_claimed).toBe(2);
      const { data: claims } = await a.client
        .from('registry_claims')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect(claims ?? []).toHaveLength(2);

      // Cleanup (service role).
      await admin().from('registry_claims').delete().eq('wedding_id', wedding.id);
      await admin().from('registry_items').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_websites').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
    });
  },
  90000,
);
