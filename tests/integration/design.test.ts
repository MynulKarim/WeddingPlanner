/**
 * Design + media integration tests — Phase 3.
 * Requires a live Supabase project (migrations 0001–0006 applied):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Covers: design/monogram/media table isolation, storage object
 * authorization (member upload+read OK, outsider upload+read denied).
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const hasEnv = url.length > 0 && anonKey.length > 0 && serviceKey.length > 0;

const BUCKET = 'wedding-media';

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

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe.skipIf(!hasEnv)('design isolation', () => {
  it(
    'designs, monograms, and media stay inside their wedding',
    async () => {
    const stamp = Date.now();
    const password = 'Test1234!';
    const a = await setupUser(`design-a-${stamp}@example.com`, password);
    const b = await setupUser(`design-b-${stamp}@example.com`, password);

    const { data: weddingA, error: wErr } = await a.client
      .from('weddings')
      .insert({
        title: 'Design A',
        slug: `design-a-${stamp}`,
        timezone: 'UTC',
        created_by: a.userId,
      })
      .select('id')
      .single();
    expect(wErr).toBeNull();
    if (!weddingA) throw new Error('setup failed');

    // Invitation layout + monogram writes (app contract: upsert).
    const { error: dErr } = await a.client.from('invitation_designs').upsert({
      wedding_id: weddingA.id,
      sections: [{ id: 'hero', enabled: true }],
    });
    expect(dErr).toBeNull();

    const { error: mErr } = await a.client.from('monograms').upsert({
      wedding_id: weddingA.id,
      initials: 'A&K',
      style: 'serif',
      shape: 'seal',
    });
    expect(mErr).toBeNull();

    // Media row + storage object as member.
    const path = `${weddingA.id}/${stamp}.png`;
    const file = new File([PNG_BYTES], 'cover.png', { type: 'image/png' });
    const { error: upErr } = await a.client.storage.from(BUCKET).upload(path, file);
    expect(upErr).toBeNull();
    const { error: rowErr } = await a.client.from('media').insert({
      wedding_id: weddingA.id,
      path,
      kind: 'image',
      mime: 'image/png',
      size_bytes: PNG_BYTES.length,
      visibility: 'guest-only',
      label: 'Cover',
    });
    expect(rowErr).toBeNull();

    // Outsider: tables invisible (scoped to this wedding — other weddings'
    // public gallery rows are intentionally world-readable).
    const { data: bDesigns } = await b.client.from('invitation_designs').select('wedding_id');
    expect((bDesigns ?? []).map((d) => d.wedding_id)).not.toContain(weddingA.id);
    const { data: bMonograms } = await b.client.from('monograms').select('wedding_id');
    expect((bMonograms ?? []).map((m) => m.wedding_id)).not.toContain(weddingA.id);
    const { data: bMedia } = await b.client.from('media').select('id, wedding_id');
    expect((bMedia ?? []).map((m) => (m as { wedding_id: string }).wedding_id)).not.toContain(
      weddingA.id,
    );

    // …writes rejected…
    const { error: evilDesign } = await b.client.from('invitation_designs').upsert({
      wedding_id: weddingA.id,
      sections: [],
    });
    expect(evilDesign).not.toBeNull();
    const { error: evilMono } = await b.client.from('monograms').upsert({
      wedding_id: weddingA.id,
      initials: 'X',
      style: 'serif',
      shape: 'seal',
    });
    expect(evilMono).not.toBeNull();

    // …storage upload + download denied.
    const evilFile = new File([PNG_BYTES], 'evil.png', { type: 'image/png' });
    const { error: evilUp } = await b.client.storage
      .from(BUCKET)
      .upload(`${weddingA.id}/evil-${stamp}.png`, evilFile);
    expect(evilUp).not.toBeNull();
    const { error: evilDown } = await b.client.storage.from(BUCKET).download(path);
    expect(evilDown).not.toBeNull();

    // Member can read back their own object.
    const { error: okDown } = await a.client.storage.from(BUCKET).download(path);
    expect(okDown).toBeNull();

    // Cleanup (service role).
    await admin().storage.from(BUCKET).remove([path]);
    await admin().from('media').delete().eq('wedding_id', weddingA.id);
    await admin().from('monograms').delete().eq('wedding_id', weddingA.id);
    await admin().from('invitation_designs').delete().eq('wedding_id', weddingA.id);
    await admin().from('wedding_members').delete().eq('wedding_id', weddingA.id);
    await admin().from('weddings').delete().eq('id', weddingA.id);
    await admin().auth.admin.deleteUser(a.userId);
    await admin().auth.admin.deleteUser(b.userId);
    },
    90000,
  );
});
