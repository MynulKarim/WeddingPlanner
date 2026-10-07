/**
 * Vendor payment integration tests — Phase 15.
 * Requires a live Supabase project (migrations 0001–0017 applied).
 *
 * Covers: per-installment line items, atomic trigger rollup into
 * vendors.paid_cents (insert adds, delete reverses), positive-amount
 * checks, and cross-tenant denial.
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

async function paidOf(client: Awaited<ReturnType<typeof setupUser>>['client'], vendorId: string) {
  const { data } = await client.from('vendors').select('paid_cents').eq('id', vendorId).single();
  return (data as { paid_cents: number } | null)?.paid_cents;
}

describe.skipIf(!hasEnv)(
  'vendor payment line items',
  () => {
    it('rolls installments into paid_cents and stays tenant-scoped', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`pay-a-${stamp}@example.com`, password);
      const b = await setupUser(`pay-b-${stamp}@example.com`, password);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Pay A',
          slug: `pay-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { data: vendor, error: vErr } = await a.client
        .from('vendors')
        .insert({ wedding_id: wedding.id, name: 'Studio', cost_cents: 100000, paid_cents: 0 })
        .select('id')
        .single();
      expect(vErr).toBeNull();
      if (!vendor) throw new Error('setup failed');

      const { data: first, error: p1Err } = await a.client
        .from('vendor_payments')
        .insert({ wedding_id: wedding.id, vendor_id: vendor.id, amount_cents: 30000, note: 'Deposit' })
        .select('id')
        .single();
      expect(p1Err).toBeNull();
      if (!first) throw new Error('setup failed');
      expect(await paidOf(a.client, vendor.id)).toBe(30000);

      const { error: p2Err } = await a.client.from('vendor_payments').insert({
        wedding_id: wedding.id,
        vendor_id: vendor.id,
        amount_cents: 20000,
        paid_on: '2027-01-15',
        note: 'Progress',
      });
      expect(p2Err).toBeNull();
      expect(await paidOf(a.client, vendor.id)).toBe(50000);

      // Deleting a payment reverses its rollup.
      const { error: delErr } = await a.client.from('vendor_payments').delete().eq('id', first.id);
      expect(delErr).toBeNull();
      expect(await paidOf(a.client, vendor.id)).toBe(20000);

      // Non-positive amounts are rejected by the CHECK.
      const { error: zeroErr } = await a.client.from('vendor_payments').insert({
        wedding_id: wedding.id,
        vendor_id: vendor.id,
        amount_cents: 0,
      });
      expect(zeroErr).not.toBeNull();

      // Other tenant: sees none, writes none.
      const { data: bRows } = await b.client.from('vendor_payments').select('id').limit(50);
      expect(bRows ?? []).toHaveLength(0);
      const { error: evil } = await b.client.from('vendor_payments').insert({
        wedding_id: wedding.id,
        vendor_id: vendor.id,
        amount_cents: 100,
      });
      expect(evil).not.toBeNull();
      expect((evil as { code?: string }).code).toBe('42501');

      // Cleanup (service role).
      await admin().from('vendor_payments').delete().eq('wedding_id', wedding.id);
      await admin().from('vendors').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
