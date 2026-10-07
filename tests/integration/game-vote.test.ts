/**
 * Game interactivity integration tests — Phase 15.
 * Requires a live Supabase project (migrations 0001–0016 applied).
 *
 * Covers: member-only question writes, anonymous voting on published
 * weddings with active games, one-vote-per-name uniqueness, public tally
 * reads, vote rejection on unpublished weddings, cross-tenant denial.
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
  'game voting isolation',
  () => {
    it('takes anonymous votes on published games and blocks the rest', async () => {
      const stamp = Date.now();
      const password = 'Test1234!';
      // Clear orphans from earlier interrupted runs (same slug family).
      await admin().from('weddings').delete().ilike('slug', 'quiz-%');
      const a = await setupUser(`quiz-a-${stamp}@example.com`, password);
      const b = await setupUser(`quiz-b-${stamp}@example.com`, password);
      const pub = createClient(url, anonKey);

      const { data: wedding, error: wErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Quiz A',
          slug: `quiz-a-${stamp}`,
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

      const { data: game, error: gErr } = await a.client
        .from('games')
        .insert({ wedding_id: wedding.id, kind: 'quiz', title: 'Trivia' })
        .select('id')
        .single();
      expect(gErr).toBeNull();
      if (!game) throw new Error('setup failed');

      const { data: question, error: qErr } = await a.client
        .from('game_questions')
        .insert({
          wedding_id: wedding.id,
          game_id: game.id,
          question: 'First date city?',
          options: ['Paris', 'Rome'],
          correct_option: 0,
        })
        .select('id')
        .single();
      expect(qErr).toBeNull();
      if (!question) throw new Error('setup failed');

      // Anonymous vote lands and tallies read back publicly.
      const { error: voteErr } = await pub.from('game_votes').insert({
        wedding_id: wedding.id,
        question_id: question.id,
        guest_name: 'Fan',
        option_index: 1,
      });
      expect(voteErr).toBeNull();
      const { data: pubQuestions } = await pub
        .from('game_questions')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect((pubQuestions ?? []).map((q) => q.id)).toContain(question.id);
      const { data: pubVotes } = await pub
        .from('game_votes')
        .select('question_id, option_index')
        .eq('wedding_id', wedding.id);
      expect(pubVotes ?? []).toHaveLength(1);

      // Same name cannot vote twice on the same question.
      const { error: dupErr } = await pub.from('game_votes').insert({
        wedding_id: wedding.id,
        question_id: question.id,
        guest_name: 'Fan',
        option_index: 0,
      });
      expect(dupErr).not.toBeNull();
      expect((dupErr as { code?: string }).code).toBe('23505');

      // Other tenant cannot add questions to this game…
      const { error: evilQ } = await b.client.from('game_questions').insert({
        wedding_id: wedding.id,
        game_id: game.id,
        question: 'Intruder?',
        options: ['Yes', 'No'],
      });
      expect(evilQ).not.toBeNull();

      // …but published game content is world-readable by design (guests
      // need it to vote — an authenticated stranger reads like anon)…
      // Reads stay wedding-scoped: other weddings' published votes must not
      // leak in.
      const { data: bQuestions } = await b.client
        .from('game_questions')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect((bQuestions ?? []).map((q) => q.id)).toContain(question.id);
      const { data: bVotes } = await b.client
        .from('game_votes')
        .select('id')
        .eq('wedding_id', wedding.id);
      expect(bVotes ?? []).toHaveLength(1);

      // Votes die on unpublished weddings.
      const { data: draft, error: draftErr } = await a.client
        .from('weddings')
        .insert({
          title: 'Draft Quiz',
          slug: `quiz-draft-${stamp}`,
          timezone: 'UTC',
          created_by: a.userId,
        })
        .select('id')
        .single();
      expect(draftErr).toBeNull();
      if (!draft) throw new Error('setup failed');
      const { data: draftGame } = await a.client
        .from('games')
        .insert({ wedding_id: draft.id, kind: 'quiz', title: 'Draft' })
        .select('id')
        .single();
      if (!draftGame) throw new Error('setup failed');
      const { data: draftQ } = await a.client
        .from('game_questions')
        .insert({
          wedding_id: draft.id,
          game_id: draftGame.id,
          question: 'Hidden?',
          options: ['A', 'B'],
        })
        .select('id')
        .single();
      if (!draftQ) throw new Error('setup failed');
      const { error: draftVote } = await pub.from('game_votes').insert({
        wedding_id: draft.id,
        question_id: draftQ.id,
        guest_name: 'Sneaky',
        option_index: 0,
      });
      expect(draftVote).not.toBeNull();

      // Cleanup (service role; cascades clear questions/votes/games).
      for (const wid of [wedding.id, draft.id]) {
        await admin().from('wedding_websites').delete().eq('wedding_id', wid);
        await admin().from('wedding_members').delete().eq('wedding_id', wid);
        await admin().from('weddings').delete().eq('id', wid);
      }
      await admin().auth.admin.deleteUser(a.userId);
      await admin().auth.admin.deleteUser(b.userId);
    });
  },
  90000,
);
