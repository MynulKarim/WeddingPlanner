/**
 * Guest-hub integration tests — Phase 2.
 * Requires a live Supabase project (migrations 0001–0005 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: cross-tenant guest/event invisibility, event CRUD scoping,
 * guest-event assignment, and household isolation.
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

describe.skipIf(!hasEnv)('guest hub isolation', () => {
  it('guests, events, and assignments stay inside their wedding', async () => {
    const stamp = Date.now();
    const password = 'Test1234!';
    const a = await setupUser(`hub-a-${stamp}@example.com`, password);
    const b = await setupUser(`hub-b-${stamp}@example.com`, password);

    // User A: wedding + event + household + guest + assignment (app contract).
    const { data: weddingA, error: wErr } = await a.client
      .from('weddings')
      .insert({
        title: 'Hub A',
        slug: `hub-a-${stamp}`,
        timezone: 'UTC',
        created_by: a.userId,
      })
      .select('id')
      .single();
    expect(wErr).toBeNull();
    if (!weddingA) throw new Error('setup failed');

    const { data: eventA, error: eErr } = await a.client
      .from('events')
      .insert({ wedding_id: weddingA.id, name: 'Ceremony', timezone: 'UTC' })
      .select('id')
      .single();
    expect(eErr).toBeNull();
    if (!eventA) throw new Error('setup failed');

    const { data: householdA, error: hErr } = await a.client
      .from('households')
      .insert({ wedding_id: weddingA.id, label: 'Family A' })
      .select('id')
      .single();
    expect(hErr).toBeNull();
    if (!householdA) throw new Error('setup failed');

    const { data: guestA, error: gErr } = await a.client
      .from('guests')
      .insert({
        wedding_id: weddingA.id,
        household_id: householdA.id,
        display_name: 'Guest A',
        tags: ['vip'],
      })
      .select('id')
      .single();
    expect(gErr).toBeNull();
    if (!guestA) throw new Error('setup failed');

    const { error: asErr } = await a.client
      .from('guest_events')
      .insert({ guest_id: guestA.id, event_id: eventA.id });
    expect(asErr).toBeNull();

    // User B sees none of it.
    const { data: bEvents } = await b.client.from('events').select('id');
    expect((bEvents ?? []).map((e) => e.id)).not.toContain(eventA.id);

    const { data: bGuests } = await b.client.from('guests').select('id');
    expect((bGuests ?? []).map((g) => g.id)).not.toContain(guestA.id);

    const { data: bHouseholds } = await b.client.from('households').select('id');
    expect((bHouseholds ?? []).map((h) => h.id)).not.toContain(householdA.id);

    // User B cannot assign A's guest to anything, nor write into A's wedding.
    const { error: evilAssign } = await b.client
      .from('guest_events')
      .insert({ guest_id: guestA.id, event_id: eventA.id });
    expect(evilAssign).not.toBeNull();

    const { error: evilEvent } = await b.client.from('events').insert({
      wedding_id: weddingA.id,
      name: 'Intruder',
      timezone: 'UTC',
    });
    expect(evilEvent).not.toBeNull();
  }, 90000);
});
