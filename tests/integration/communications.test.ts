/**
 * Communications integration tests — Phase 7.
 * Requires a live Supabase project (migrations 0001–0010 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: message/template table isolation, and the due-dispatch loop
 * end-to-end with the NoOp provider (no real messages leave the test).
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { processDueMessages } from '@/lib/communications/dispatch';
import {
  NoOpEmailProvider,
  NoOpSmsProvider,
} from '@/services/communications/provider';

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
  'communications isolation + dispatch',
  () => {
    it('keeps history private and delivers due messages', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      const a = await setupUser(`msg-a-${stamp}@example.com`, password);
      const b = await setupUser(`msg-b-${stamp}@example.com`, password);
      const pub = createClient(url, anonKey);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Msg A',
          slug: `msg-a-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(wErr).toBeNull();
      if (!wedding) throw new Error('setup failed');

      const { data: guest, error: gErr } = await a.client
        .from('guests')
        .insert({ wedding_id: wedding.id, display_name: 'Reader', email: 'reader@example.com' })
        .select('id')
        .single();
      expect(gErr).toBeNull();
      if (!guest) throw new Error('setup failed');

      // Template override scoped to the wedding.
      const { error: tErr } = await a.client.from('message_templates').upsert(
        {
          wedding_id: wedding.id,
          kind: 'announcement',
          channel: 'email',
          subject: 'Custom subject',
          body: 'Hi {{guestName}}!',
        },
        { onConflict: 'wedding_id,kind,channel' },
      );
      expect(tErr).toBeNull();

      // One due + one future scheduled message.
      const past = new Date(Date.now() - 60_000).toISOString();
      const future = new Date(Date.now() + 3_600_000).toISOString();
      const { error: mErr } = await a.client.from('messages').insert([
        {
          wedding_id: wedding.id,
          guest_id: guest.id,
          template_kind: 'announcement',
          channel: 'email',
          to_address: 'reader@example.com',
          subject: 'Custom subject',
          body_snapshot: 'Hi Reader!',
          status: 'scheduled',
          scheduled_for: past,
        },
        {
          wedding_id: wedding.id,
          guest_id: guest.id,
          template_kind: 'announcement',
          channel: 'email',
          to_address: 'reader@example.com',
          subject: 'Later',
          body_snapshot: 'Later!',
          status: 'scheduled',
          scheduled_for: future,
        },
      ]);
      expect(mErr).toBeNull();

      // Anonymous + other tenant see nothing, write nothing.
      const { data: bRows } = await b.client.from('messages').select('id').limit(100);
      expect(bRows ?? []).toHaveLength(0);
      const { data: pubRows } = await pub.from('messages').select('id').limit(1);
      expect(pubRows ?? []).toHaveLength(0);
      const { data: pubTemplates } = await pub.from('message_templates').select('id').limit(1);
      expect(pubTemplates ?? []).toHaveLength(0);
      const { error: evil } = await b.client.from('messages').insert({
        wedding_id: wedding.id,
        template_kind: 'announcement',
        channel: 'email',
        to_address: 'evil@example.com',
        body_snapshot: 'x',
        status: 'scheduled',
      });
      expect(evil).not.toBeNull();

      // Dispatch loop: only the due row flips to sent (NoOp provider).
      const res = await processDueMessages(
        admin(),
        new NoOpEmailProvider(),
        new NoOpSmsProvider(),
        new Date().toISOString(),
        wedding.id,
      );
      expect(res.sent).toBe(1);
      const { data: rows } = await admin()
        .from('messages')
        .select('status, scheduled_for')
        .eq('wedding_id', wedding.id)
        .order('scheduled_for');
      const statuses = ((rows ?? []) as { status: string }[]).map((r) => r.status);
      expect(statuses).toEqual(['sent', 'scheduled']);

      // Cleanup (service role).
      await admin().from('messages').delete().eq('wedding_id', wedding.id);
      await admin().from('message_templates').delete().eq('wedding_id', wedding.id);
      await admin().from('guests').delete().eq('id', guest.id);
      await admin().from('wedding_members').delete().eq('wedding_id', wedding.id);
      await admin().from('weddings').delete().eq('id', wedding.id);
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
