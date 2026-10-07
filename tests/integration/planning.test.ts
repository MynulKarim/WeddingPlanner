/**
 * Seating + planning integration tests — Phase 9.
 * Requires a live Supabase project (migrations 0001–0012 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: table isolation, single-seat uniqueness (duplicate assignment
 * rejected), task/budget/vendor isolation + cross-tenant write rejection.
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
  'seating + planning isolation',
  () => {
    it('keeps plans tenant-scoped and seats unique', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`plan-a-${stamp}@example.com`, password);
      const b = await setupUser(`plan-b-${stamp}@example.com`, password);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Plan A',
          slug: `plan-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { data: table, error: tErr } = await a.client
        .from('seating_tables')
        .insert({ wedding_id: wedding.id, name: 'Table 1', capacity: 8 })
        .select('id')
        .single();
      expect(tErr).toBeNull();
      if (!table) throw new Error('setup failed');

      const { data: guest, error: gErr } = await a.client
        .from('guests')
        .insert({ wedding_id: wedding.id, display_name: 'Seated Guest' })
        .select('id')
        .single();
      expect(gErr).toBeNull();
      if (!guest) throw new Error('setup failed');

      // Second guest stays unassigned so the cross-tenant assignment probe
      // cannot collide with the uniqueness constraint (any error is RLS).
      const { data: guest2 } = await a.client
        .from('guests')
        .insert({ wedding_id: wedding.id, display_name: 'Unseated Guest' })
        .select('id')
        .single();
      if (!guest2) throw new Error('setup failed');

      const { error: asErr } = await a.client.from('seating_assignments').insert({
        wedding_id: wedding.id,
        table_id: table.id,
        guest_id: guest.id,
      });
      expect(asErr).toBeNull();

      // Second seat for the same guest is rejected (UNIQUE guest_id).
      const { error: dupErr } = await a.client.from('seating_assignments').insert({
        wedding_id: wedding.id,
        table_id: table.id,
        guest_id: guest.id,
      });
      expect(dupErr).not.toBeNull();

      // Planning rows.
      for (const [tbl, row] of [
        ['checklist_tasks', { wedding_id: wedding.id, title: 'Book venue' }],
        ['budget_items', { wedding_id: wedding.id, title: 'Photo', budgeted_cents: 100 }],
        ['vendors', { wedding_id: wedding.id, name: 'Studio' }],
      ] as const) {
        const { error } = await a.client.from(tbl).insert(row);
        expect(error).toBeNull();
      }

      // Other tenant: sees none, writes none (RLS 42501, not just constraints).
      const evilRows: Record<string, object> = {
        seating_tables: { wedding_id: wedding.id, name: 'Evil' },
        seating_assignments: { wedding_id: wedding.id, table_id: table.id, guest_id: guest2.id },
        checklist_tasks: { wedding_id: wedding.id, title: 'Evil' },
        budget_items: { wedding_id: wedding.id, title: 'Evil' },
        vendors: { wedding_id: wedding.id, name: 'Evil' },
      };
      for (const tbl of Object.keys(evilRows)) {
        const { data } = await b.client.from(tbl).select('id').limit(50);
        expect(data ?? []).toHaveLength(0);
        const { error } = await b.client.from(tbl).insert(evilRows[tbl]);
        expect(error).not.toBeNull();
        expect((error as { code?: string }).code).toBe('42501');
      }

      // Cleanup (service role).
      await admin().from('seating_assignments').delete().eq('wedding_id', wedding.id);
      await admin().from('seating_tables').delete().eq('wedding_id', wedding.id);
      await admin().from('checklist_tasks').delete().eq('wedding_id', wedding.id);
      await admin().from('budget_items').delete().eq('wedding_id', wedding.id);
      await admin().from('vendors').delete().eq('wedding_id', wedding.id);
      await admin().from('guests').delete().eq('id', guest.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
