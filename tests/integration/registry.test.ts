/**
 * Registry permission integration tests — Phase 8.
 * Requires a live Supabase project (migrations 0001–0011 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: public item visibility (published+active only), anonymous claims on
 * active items, rejection on inactive items, cross-tenant isolation, and the
 * reservation counter trigger.
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

describe.skipIf(!hasEnv)(
  'registry permissions',
  () => {
    it('publishes active gifts and accepts anonymous claims', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`reg-a-${stamp}@example.com`, password);
      const b = await setupUser(`reg-b-${stamp}@example.com`, password);
      const pub = anon();

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Reg A',
          slug: `reg-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      // Draft wedding: items invisible even when active.
      const { data: activeItem, error: iErr } = await a.client
        .from('registry_items')
        .insert({
          wedding_id: wedding.id,
          kind: 'cash',
          title: 'Honeymoon fund',
          amount_cents: 100000,
          currency: 'USD',
          is_active: true,
        })
        .select('id')
        .single();
      expect(iErr).toBeNull();
      if (!activeItem) throw new Error('setup failed');
      const { data: hidden } = await pub
        .from('registry_items')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect(hidden ?? []).toHaveLength(0);
      const { data: hiddenFromB } = await b.client
        .from('registry_items')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect(hiddenFromB ?? []).toHaveLength(0);

      const { data: deadItem } = await a.client
        .from('registry_items')
        .insert({
          wedding_id: wedding.id,
          kind: 'product',
          title: 'Old toaster',
          is_active: false,
        })
        .select('id')
        .single();
      if (!deadItem) throw new Error('setup failed');

      // Publish: active item visible, inactive hidden.
      const { error: pErr } = await a.client.from('wedding_websites').upsert({
        wedding_id: wedding.id,
        is_published: true,
        sections: [],
        content: {},
      });
      expect(pErr).toBeNull();
      const { data: seen } = await pub
        .from('registry_items')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect((seen ?? []).map((r) => r.id)).toEqual([activeItem.id]);

      // Anonymous claim on the active item works and counts.
      const { error: cErr } = await pub.from('registry_claims').insert({
        item_id: activeItem.id,
        wedding_id: wedding.id,
        guest_name: 'Generous Guest',
        amount_cents: 25000,
        message: 'Have fun!',
      });
      expect(cErr).toBeNull();
      const { data: after } = await a.client
        .from('registry_items')
        .select('quantity_claimed, raised_cents')
        .eq('id', activeItem.id)
        .single();
      expect((after as { quantity_claimed: number }).quantity_claimed).toBe(1);
      expect((after as { raised_cents: number }).raised_cents).toBe(25000);

      // Claim on the inactive item is rejected by RLS.
      const { error: deadErr } = await pub.from('registry_claims').insert({
        item_id: deadItem.id,
        wedding_id: wedding.id,
        guest_name: 'Sneaky',
      });
      expect(deadErr).not.toBeNull();

      // Claim rows themselves are invisible anonymously…
      const { data: pubClaims } = await pub.from('registry_claims').select('id').limit(1);
      expect(pubClaims ?? []).toHaveLength(0);

      // …and invisible to other tenants (except intentionally public rows),
      // who also cannot write items. Public items are world-readable by
      // design — members of other weddings see them like anyone else.
      const { data: bItems } = await b.client.from('registry_items').select('id');
      const bIds = (bItems ?? []).map((r) => r.id);
      expect(bIds).toContain(activeItem.id);
      expect(bIds).not.toContain(deadItem.id);
      const { error: evil } = await b.client.from('registry_items').insert({
        wedding_id: wedding.id,
        kind: 'custom',
        title: 'Evil',
      });
      expect(evil).not.toBeNull();

      // Cleanup (service role).
      await admin().from('registry_claims').delete().eq('wedding_id', wedding.id);
      await admin().from('registry_items').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_websites').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
