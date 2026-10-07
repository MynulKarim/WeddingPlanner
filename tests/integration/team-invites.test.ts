/**
 * Team invite integration tests — Phase 15.
 * Requires a live Supabase project (migrations 0001–0018 applied).
 *
 * Covers: admin-only invite writes, member-only invite reads, stranger
 * denial, and auto-link (claimTeamInvites turns a pending invite into a
 * membership and consumes it; repeat claims are empty).
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { claimTeamInvites } from '@/lib/db/team-invites';

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
  return { userId: data.user.id, email, client };
}

describe.skipIf(!hasEnv)(
  'team invite auto-link',
  () => {
    it('links invitees on registration and hides invites from strangers', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`team-a-${stamp}@example.com`, password);
      const b = await setupUser(`team-b-${stamp}@example.com`, password);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Team A',
          slug: `team-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      // Admin records the invite…
      const { error: inviteErr } = await a.client.from('team_invites').insert({
        wedding_id: wedding.id,
        email: b.email.toLowerCase(),
        role: 'planner',
      });
      expect(inviteErr).toBeNull();

      // …strangers can neither read nor write invites…
      const { data: bRows } = await b.client.from('team_invites').select('id').limit(50);
      expect(bRows ?? []).toHaveLength(0);
      const { error: evil } = await b.client.from('team_invites').insert({
        wedding_id: wedding.id,
        email: 'evil@example.com',
        role: 'admin',
      });
      expect(evil).not.toBeNull();

      // …and the owner role is not invitable.
      const { error: ownerErr } = await a.client.from('team_invites').insert({
        wedding_id: wedding.id,
        email: 'owner@example.com',
        role: 'owner',
      });
      expect(ownerErr).not.toBeNull();

      // Auto-link: the invite becomes a membership and is consumed.
      const claimed = await claimTeamInvites(b.userId, b.email);
      expect(claimed).toContain(wedding.id);
      const { data: membership } = await admin()
        .from('wedding_members')
        .select('role')
        .eq('wedding_id', wedding.id)
        .eq('user_id', b.userId)
        .maybeSingle();
      expect((membership as { role?: string } | null)?.role).toBe('planner');
      const { data: leftover } = await admin()
        .from('team_invites')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect(leftover ?? []).toHaveLength(0);

      // Repeat claims are empty and harmless.
      expect(await claimTeamInvites(b.userId, b.email)).toEqual([]);

      // Cleanup (service role).
      await admin().from('team_invites').delete().eq('wedding_id', wedding.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
