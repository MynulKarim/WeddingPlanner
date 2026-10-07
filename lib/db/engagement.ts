/**
 * Engagement data access — Phase 10 (tenant-scoped, RLS-enforced).
 * Member actions (moderation, albums, games, vows) require planner+.
 * Public actions (sign, request, seal, upload) work session-less; RLS
 * constrains them to published weddings + moderation-safe values.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import {
  validateCapsule,
  validateGuestbook,
  validateSong,
  type GameKind,
} from '@/lib/engagement/validation';
import { GAME_KINDS } from '@/lib/engagement/validation';
import {
  correctIndexOrNull,
  parseOptions,
  tallyVotes,
  validateQuestion,
  validateVote,
  type PublicGame,
} from '@/lib/engagement/quiz';
import { isSchemaCacheMiss, pendingMigrationMessage } from '@/lib/db/schema-guard';

// ---------------------------------------------------------------------------
// Reads (member)
// ---------------------------------------------------------------------------

export interface ModerationEntry {
  id: string;
  guest_name: string;
  message: string;
  title?: string;
  created_at: string;
}

export interface EngagementBoard {
  guestbookPending: ModerationEntry[];
  guestbookApproved: number;
  songsPending: { id: string; guest_name: string; title: string; created_at: string }[];
  songsApproved: number;
  photosPending: { id: string; label: string | null; url: string | null }[];
  albums: { id: string; title: string; count: number }[];
  games: { id: string; kind: string; title: string; description: string; is_active: boolean }[];
  capsulePending: ModerationEntry[];
  capsuleCount: number;
  vows: { text_a: string; text_b: string; shared: string } | null;
}

export async function getEngagementBoard(weddingId: string): Promise<EngagementBoard> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();

  const [{ data: guestbook }, { data: songs }, { data: media }, { data: albums },
    { data: games }, { data: capsule }, { data: vows }] = await Promise.all([
    supabase.from('guestbook_entries').select('id, guest_name, message, is_approved, created_at').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(200),
    supabase.from('song_requests').select('id, guest_name, title, is_approved, created_at').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(200),
    supabase.from('media').select('id, label, path, is_approved').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(100),
    supabase.from('albums').select('id, title, album_items(media_id)').eq('wedding_id', weddingId).order('created_at'),
    supabase.from('games').select('id, kind, title, description, is_active').eq('wedding_id', weddingId).order('position').order('created_at'),
    supabase.from('time_capsules').select('id, guest_name, message, is_approved, created_at').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(200),
    supabase.from('vows').select('text_a, text_b, shared').eq('wedding_id', weddingId).maybeSingle(),
  ]);

  const gb = ((guestbook ?? []) as { id: string; guest_name: string; message: string; is_approved: boolean; created_at: string }[]);
  const sg = ((songs ?? []) as { id: string; guest_name: string; title: string; is_approved: boolean; created_at: string }[]);
  const md = ((media ?? []) as { id: string; label: string | null; path: string; is_approved: boolean }[]);

  const signed = await Promise.all(
    md.filter((m) => !m.is_approved).map(async (m) => {
      const { data } = await supabase.storage.from('wedding-media').createSignedUrl(m.path, 3600);
      return { id: m.id, label: m.label, url: data?.signedUrl ?? null };
    }),
  );

  return {
    guestbookPending: gb.filter((g) => !g.is_approved),
    guestbookApproved: gb.filter((g) => g.is_approved).length,
    songsPending: sg.filter((s) => !s.is_approved),
    songsApproved: sg.filter((s) => s.is_approved).length,
    photosPending: signed,
    albums: ((albums ?? []) as { id: string; title: string; album_items: { media_id: string }[] }[]).map((a) => ({
      id: a.id,
      title: a.title,
      count: a.album_items.length,
    })),
    games: (games ?? []) as EngagementBoard['games'],
    capsulePending: ((capsule ?? []) as { id: string; guest_name: string; message: string; is_approved: boolean; created_at: string }[]).filter((c) => !c.is_approved),
    capsuleCount: ((capsule ?? []) as unknown[]).length,
    vows: (vows ?? null) as EngagementBoard['vows'],
  };
}

// ---------------------------------------------------------------------------
// Moderation (planner+)
// ---------------------------------------------------------------------------

async function setApproved(
  weddingId: string,
  table: 'guestbook_entries' | 'song_requests' | 'time_capsules' | 'media',
  id: string,
  approved: boolean,
  makePublic = false,
): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const patch: Record<string, unknown> = { is_approved: approved };
  if (table === 'media' && approved && makePublic) patch.visibility = 'approved-public';
  const { error } = await supabase.from(table).update(patch).eq('id', id).eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

export async function approveGuestbook(weddingId: string, id: string): Promise<void> {
  await setApproved(weddingId, 'guestbook_entries', id, true);
}
export async function approveSong(weddingId: string, id: string): Promise<void> {
  await setApproved(weddingId, 'song_requests', id, true);
}
export async function approveCapsule(weddingId: string, id: string): Promise<void> {
  await setApproved(weddingId, 'time_capsules', id, true);
}
export async function approvePhoto(weddingId: string, id: string): Promise<void> {
  await setApproved(weddingId, 'media', id, true, true);
}

async function removeRow(
  weddingId: string,
  table: 'guestbook_entries' | 'song_requests' | 'time_capsules' | 'media' | 'games' | 'albums',
  id: string,
): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  // All six tables carry wedding_id (album items cascade). RLS enforces
  // tenancy on top of the explicit wedding filter.
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

export async function deleteGuestbook(weddingId: string, id: string): Promise<void> {
  await removeRow(weddingId, 'guestbook_entries', id);
}
export async function deleteSong(weddingId: string, id: string): Promise<void> {
  await removeRow(weddingId, 'song_requests', id);
}
export async function deleteCapsule(weddingId: string, id: string): Promise<void> {
  await removeRow(weddingId, 'time_capsules', id);
}
export async function deleteGame(weddingId: string, id: string): Promise<void> {
  await removeRow(weddingId, 'games', id);
}

/** Flip a game's visibility on the public website (planner+). */
export async function setGameActive(
  weddingId: string,
  id: string,
  active: boolean,
): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('games')
    .update({ is_active: active })
    .eq('id', id)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

export interface QuestionState {
  error?: string;
}

/** Add a quiz/vote question to a game (planner+). */
export async function createQuestion(
  weddingId: string,
  gameId: string,
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  await requireRole(weddingId, 'planner');
  const question = String(formData.get('question') ?? '');
  const options = parseOptions(String(formData.get('options') ?? ''));
  const correctRaw = String(formData.get('correctOption') ?? '');
  const errors = validateQuestion({ question, options, correctOption: correctRaw });
  if (errors.length > 0) return { error: errors[0] };
  const supabase = await createServerSupabaseClient();
  // Game must belong to this wedding (defense in depth; RLS enforces too).
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (!game) return { error: 'Game not found.' };
  const { error } = await supabase.from('game_questions').insert({
    wedding_id: weddingId,
    game_id: gameId,
    question: question.trim().slice(0, 300),
    options,
    correct_option: correctIndexOrNull(correctRaw),
  });
  if (error) {
    if (isSchemaCacheMiss(error)) return { error: pendingMigrationMessage('0016_game_interactivity.sql') };
    return { error: error.message };
  }
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
  return {};
}

export async function deleteQuestion(weddingId: string, questionId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('game_questions')
    .delete()
    .eq('id', questionId)
    .eq('wedding_id', weddingId);
  if (error) {
    if (isSchemaCacheMiss(error)) throw new Error(pendingMigrationMessage('0016_game_interactivity.sql'));
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

/**
 * Games with questions + live tallies (staff+). Shared by the engage board
 * and the dashboard website preview so both show exactly what guests see.
 */
export async function getGamesWithResults(weddingId: string): Promise<PublicGame[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const [{ data: games }, questionsRes, votesRes] = await Promise.all([
    supabase
      .from('games')
      .select('id, kind, title, description, is_active')
      .eq('wedding_id', weddingId)
      .order('position')
      .order('created_at'),
    supabase
      .from('game_questions')
      .select('id, game_id, question, options, correct_option')
      .eq('wedding_id', weddingId)
      .order('position')
      .order('created_at'),
    supabase
      .from('game_votes')
      .select('question_id, option_index')
      .eq('wedding_id', weddingId),
  ]);
  // Migration 0016 pending: games without questions, not a failure.
  const questions = isSchemaCacheMiss(questionsRes.error) ? [] : (questionsRes.data ?? []);
  const votes = isSchemaCacheMiss(votesRes.error) ? [] : (votesRes.data ?? []);
  const byGame = new Map<string, PublicGame['questions']>();
  for (const q of ((questions ?? []) as {
    id: string;
    game_id: string;
    question: string;
    options: unknown;
    correct_option: number | null;
  }[])) {
    const options = Array.isArray(q.options) ? (q.options as string[]) : [];
    const tally = tallyVotes(
      options.length,
      ((votes ?? []) as { question_id: string; option_index: number }[]).filter(
        (v) => v.question_id === q.id,
      ),
    );
    const list = byGame.get(q.game_id) ?? [];
    list.push({
      id: q.id,
      question: q.question,
      options,
      correct_option: q.correct_option,
      tally,
    });
    byGame.set(q.game_id, list);
  }
  return (((games ?? []) as {
    id: string;
    kind: string;
    title: string;
    description: string;
    is_active: boolean;
  }[])).map((g) => ({
    id: g.id,
    kind: g.kind,
    title: g.title,
    description: g.description,
    is_active: g.is_active,
    questions: byGame.get(g.id) ?? [],
  }));
}
export async function deleteAlbum(weddingId: string, id: string): Promise<void> {
  await removeRow(weddingId, 'albums', id);
}

export async function deletePhoto(weddingId: string, id: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('media')
    .select('path, wedding_id')
    .eq('id', id)
    .maybeSingle();
  const row = (data ?? null) as { path: string; wedding_id: string } | null;
  if (!row || row.wedding_id !== weddingId) throw new Error('Photo not found.');
  await supabase.storage.from('wedding-media').remove([row.path]);
  const { error } = await supabase.from('media').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

// ---------------------------------------------------------------------------
// Albums + games + vows (planner+)
// ---------------------------------------------------------------------------

export interface AlbumState {
  error?: string;
}

export async function createAlbum(
  weddingId: string,
  _prev: AlbumState,
  formData: FormData,
): Promise<AlbumState> {
  await requireRole(weddingId, 'planner');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'Album title is required.' };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('albums')
    .insert({ wedding_id: weddingId, title: title.slice(0, 120) });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
  return {};
}

export interface GameState {
  error?: string;
}

export async function createGame(
  weddingId: string,
  _prev: GameState,
  formData: FormData,
): Promise<GameState> {
  await requireRole(weddingId, 'planner');
  const input = {
    kind: String(formData.get('kind') ?? 'custom'),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
  };
  const { validateGame } = await import('@/lib/engagement/validation');
  const errors = validateGame(input);
  if (errors.length > 0) return { error: errors[0] };
  if (!(GAME_KINDS as readonly string[]).includes(input.kind)) {
    return { error: 'Choose a valid game type.' };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('games').insert({
    wedding_id: weddingId,
    kind: input.kind as GameKind,
    title: input.title.trim().slice(0, 160),
    description: input.description.trim().slice(0, 2000),
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
  return {};
}

export interface VowState {
  error?: string;
  message?: string;
}

export async function saveVows(
  weddingId: string,
  _prev: VowState,
  formData: FormData,
): Promise<VowState> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('vows').upsert({
    wedding_id: weddingId,
    text_a: String(formData.get('textA') ?? '').slice(0, 5000),
    text_b: String(formData.get('textB') ?? '').slice(0, 5000),
    shared: String(formData.get('shared') ?? '').slice(0, 5000),
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
  return { message: 'Vows saved — private to your team.' };
}

export async function setWelcomeVideo(weddingId: string, mediaId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { data: media } = await supabase
    .from('media')
    .select('id')
    .eq('id', mediaId)
    .eq('wedding_id', weddingId)
    .eq('kind', 'video')
    .maybeSingle();
  if (!media) throw new Error('Video not found.');
  const { data: site } = await supabase
    .from('wedding_websites')
    .select('content')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const content = ((site as { content?: Record<string, unknown> } | null)?.content ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from('wedding_websites')
    .upsert({ wedding_id: weddingId, content: { ...content, welcomeVideo: mediaId } });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

export async function clearWelcomeVideo(weddingId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { data: site } = await supabase
    .from('wedding_websites')
    .select('content')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const content = ((site as { content?: Record<string, unknown> } | null)?.content ?? {}) as Record<string, unknown>;
  delete content.welcomeVideo;
  const { error } = await supabase
    .from('wedding_websites')
    .upsert({ wedding_id: weddingId, content });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/engage`);
}

// ---------------------------------------------------------------------------
// Public actions (session-less; RLS gates to published weddings)
// ---------------------------------------------------------------------------

export interface PublicState {
  error?: string;
  ok?: boolean;
}

function publicClient() {
  return createServerSupabaseClient();
}

export async function signGuestbook(
  weddingId: string,
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const input = {
    guestName: String(formData.get('guestName') ?? ''),
    message: String(formData.get('message') ?? ''),
  };
  const errors = validateGuestbook(input);
  if (errors.length > 0) return { error: errors[0] };
  const supabase = await publicClient();
  const { error } = await supabase.from('guestbook_entries').insert({
    wedding_id: weddingId,
    guest_name: input.guestName.trim().slice(0, 80),
    message: input.message.trim().slice(0, 2000),
    is_approved: false,
  });
  if (error) return { error: 'Could not sign the guestbook. Please try again.' };
  return { ok: true };
}

export async function requestSong(
  weddingId: string,
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const input = {
    guestName: String(formData.get('guestName') ?? ''),
    title: String(formData.get('title') ?? ''),
    artist: String(formData.get('artist') ?? ''),
    message: String(formData.get('message') ?? ''),
  };
  const errors = validateSong(input);
  if (errors.length > 0) return { error: errors[0] };
  const supabase = await publicClient();
  const { error } = await supabase.from('song_requests').insert({
    wedding_id: weddingId,
    guest_name: input.guestName.trim().slice(0, 80),
    title: input.title.trim().slice(0, 200),
    artist: input.artist.trim().slice(0, 200),
    message: input.message.trim().slice(0, 1000),
    is_approved: false,
  });
  if (error) return { error: 'Could not send your request. Please try again.' };
  return { ok: true };
}

export async function sealCapsule(
  weddingId: string,
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const input = {
    guestName: String(formData.get('guestName') ?? ''),
    message: String(formData.get('message') ?? ''),
    openAfter: String(formData.get('openAfter') ?? ''),
  };
  const errors = validateCapsule(input);
  if (errors.length > 0) return { error: errors[0] };
  const supabase = await publicClient();
  const { error } = await supabase.from('time_capsules').insert({
    wedding_id: weddingId,
    guest_name: input.guestName.trim().slice(0, 80),
    message: input.message.trim().slice(0, 2000),
    open_after: input.openAfter.trim() || null,
    is_approved: false,
  });
  if (error) return { error: 'Could not seal your note. Please try again.' };
  return { ok: true };
}

export async function uploadGuestPhoto(
  weddingId: string,
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const file = formData.get('file');
  const guestName = String(formData.get('guestName') ?? '').trim().slice(0, 80);
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a photo first.' };
  if (!guestName) return { error: 'Your name is required.' };
  const { validateMediaFile, extensionForMime } = await import('@/lib/media/validation');
  const problem = validateMediaFile({ mime: file.type, sizeBytes: file.size });
  if (problem) return { error: problem };
  if (!file.type.startsWith('image/')) return { error: 'Only photos can be uploaded here.' };

  const supabase = await publicClient();
  const path = `${weddingId}/guest-${crypto.randomUUID()}.${extensionForMime(file.type)}`;
  const { error: upError } = await supabase.storage
    .from('wedding-media')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upError) return { error: 'Upload failed. Please try again.' };
  const { error: rowError } = await supabase.from('media').insert({
    wedding_id: weddingId,
    path,
    kind: 'image',
    mime: file.type,
    size_bytes: file.size,
    visibility: 'guest-only',
    label: `Guest photo by ${guestName}`,
    guest_name: guestName,
    is_approved: false,
  });
  if (rowError) {
    await supabase.storage.from('wedding-media').remove([path]);
    return { error: 'Upload failed. Please try again.' };
  }
  return { ok: true };
}

/**
 * Cast a quiz/vote ballot (session-less; RLS gates to published weddings
 * with active games). One vote per name per question; re-votes get a
 * friendly message instead of a database error.
 */
export async function submitGameVote(
  weddingId: string,
  questionId: string,
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const supabase = await publicClient();
  const { data: question } = await supabase
    .from('game_questions')
    .select('id, options')
    .eq('id', questionId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const options = (question as { options?: unknown } | null)?.options;
  const optionCount = Array.isArray(options) ? options.length : 0;
  // Unreadable question = unpublished wedding, inactive game, or wrong id.
  // Same generic error for all three so nothing leaks.
  if (!question || optionCount === 0) return { error: 'Voting is closed for this game.' };
  const input = {
    guestName: String(formData.get('guestName') ?? ''),
    optionIndex: Number(String(formData.get('optionIndex') ?? '')),
    optionCount,
  };
  const errors = validateVote(input);
  if (errors.length > 0) return { error: errors[0] };
  const { error } = await supabase.from('game_votes').insert({
    wedding_id: weddingId,
    question_id: questionId,
    guest_name: input.guestName.trim().slice(0, 80),
    option_index: input.optionIndex,
  });
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: 'That name already voted on this question.' };
    }
    return { error: 'Could not count your vote. Please try again.' };
  }
  return { ok: true };
}
