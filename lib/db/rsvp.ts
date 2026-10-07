/**
 * RSVP data access — Phase 5.
 * Guest submissions resolve the invitation token server-side (service role,
 * strictly scoped in code) and validate through the rules engine. Couple
 * actions use the member-scoped client + planner+ roles.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import {
  getGuestQuestions,
  getGuestRsvps,
  resolveInvitation,
} from '@/lib/invite/resolve';
import {
  normalizeSubmission,
  validateSubmission,
  type CustomQuestionRule,
  type EventSubmission,
  type RsvpStatus,
} from '@/lib/rsvp/rules';

// ---------------------------------------------------------------------------
// Guest submission (token-scoped, no session)
// ---------------------------------------------------------------------------

export interface SubmitState {
  errorKey?: string;
  ok?: boolean;
}

export async function submitRsvp(
  token: string,
  submissions: EventSubmission[],
): Promise<SubmitState> {
  const inv = await resolveInvitation(token);
  if (!inv) return { errorKey: 'invite.invalidTitle' };

  const questions = await getGuestQuestions(inv);
  const rules: CustomQuestionRule[] = questions.map((q) => ({
    id: q.id,
    eventId: q.event_id,
    kind: q.kind,
    options: q.options,
    required: q.required,
  }));
  const scope = {
    guestId: inv.guestId,
    weddingId: inv.weddingId,
    allowPlusOne: inv.allowPlusOne,
    eventIds: inv.events.map((e) => e.event_id),
    deadline: inv.deadline,
    now: new Date().toISOString(),
  };
  const errors = validateSubmission(scope, rules, submissions);
  if (errors.length > 0) return { errorKey: errors[0] };

  const supabase = createServiceRoleClient();
  for (const sub of submissions) {
    const clean = normalizeSubmission(scope, sub);
    const answers: Record<string, string> = {};
    for (const q of rules) {
      if (q.eventId === null || q.eventId === sub.eventId) {
        const a = (sub.answers[q.id] ?? '').trim();
        if (a) answers[q.id] = a.slice(0, 2000);
      }
    }
    const { error } = await supabase.from('rsvps').upsert(
      {
        wedding_id: inv.weddingId,
        guest_id: inv.guestId,
        event_id: sub.eventId,
        status: clean.status,
        plus_one: clean.plusOne,
        plus_one_name: clean.plusOneName || null,
        dietary: clean.dietary || null,
        allergies: clean.allergies || null,
        notes: clean.notes || null,
        answers,
      },
      { onConflict: 'guest_id,event_id' },
    );
    if (error) return { errorKey: 'err.failed' };
  }
  // Refresh guest-visible state.
  await getGuestRsvps(inv);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Couple board
// ---------------------------------------------------------------------------

export interface BoardGuest {
  guest_id: string;
  display_name: string;
  is_child: boolean;
  allow_plus_one: boolean;
  household_label: string | null;
  responses: Record<
    string,
    {
      status: RsvpStatus;
      plus_one: boolean;
      plus_one_name: string | null;
      dietary: string | null;
      allergies: string | null;
      notes: string | null;
    }
  >;
}

export interface BoardEvent {
  event_id: string;
  name: string;
  attending: number;
  declined: number;
  pending: number;
  plusOnes: number;
}

export interface RsvpBoard {
  deadline: string | null;
  events: BoardEvent[];
  guests: BoardGuest[];
  dietary: { guest: string; event: string; dietary: string; allergies: string }[];
  questions: {
    id: string;
    event_id: string | null;
    event_name: string | null;
    question: string;
    kind: string;
    required: boolean;
  }[];
}

export async function getRsvpBoard(weddingId: string): Promise<RsvpBoard> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();

  const { data: wedding } = await supabase
    .from('weddings')
    .select('rsvp_deadline')
    .eq('id', weddingId)
    .maybeSingle();

  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('wedding_id', weddingId)
    .order('starts_at', { ascending: true, nullsFirst: false });
  const eventList = ((events ?? []) as { id: string; name: string }[]).map((e) => ({
    event_id: e.id,
    name: e.name,
    attending: 0,
    declined: 0,
    pending: 0,
    plusOnes: 0,
  }));
  const eventById = new Map(eventList.map((e) => [e.event_id, e]));

  const { data: guests } = await supabase
    .from('guests')
    .select('id, display_name, is_child, allow_plus_one, households(label)')
    .eq('wedding_id', weddingId)
    .order('display_name');
  const { data: assignments } = await supabase
    .from('guest_events')
    .select('guest_id, event_id')
    .in(
      'guest_id',
      ((guests ?? []) as { id: string }[]).map((g) => g.id),
    );
  const assigned = new Map<string, Set<string>>();
  for (const a of (assignments ?? []) as { guest_id: string; event_id: string }[]) {
    if (!assigned.has(a.guest_id)) assigned.set(a.guest_id, new Set());
    assigned.get(a.guest_id)?.add(a.event_id);
  }

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('guest_id, event_id, status, plus_one, plus_one_name, dietary, allergies, notes')
    .eq('wedding_id', weddingId);
  const rsvpByKey = new Map(
    ((rsvps ?? []) as {
      guest_id: string;
      event_id: string;
      status: RsvpStatus;
      plus_one: boolean;
      plus_one_name: string | null;
      dietary: string | null;
      allergies: string | null;
      notes: string | null;
    }[]).map((r) => [`${r.guest_id}:${r.event_id}`, r]),
  );

  const boardGuests: BoardGuest[] = (
    (guests ?? []) as {
      id: string;
      display_name: string;
      is_child: boolean;
      allow_plus_one: boolean;
      households: { label: string } | { label: string }[] | null;
    }[]
  ).map((g) => {
    const household = Array.isArray(g.households) ? g.households[0] : g.households;
    const responses: BoardGuest['responses'] = {};
    for (const eventId of assigned.get(g.id) ?? []) {
      const r = rsvpByKey.get(`${g.id}:${eventId}`);
      responses[eventId] = {
        status: r?.status ?? 'pending',
        plus_one: r?.plus_one ?? false,
        plus_one_name: r?.plus_one_name ?? null,
        dietary: r?.dietary ?? null,
        allergies: r?.allergies ?? null,
        notes: r?.notes ?? null,
      };
      const stat = eventById.get(eventId);
      if (stat) {
        if (responses[eventId].status === 'attending') {
          stat.attending += 1;
          if (responses[eventId].plus_one) stat.plusOnes += 1;
        } else if (responses[eventId].status === 'declined') {
          stat.declined += 1;
        } else {
          stat.pending += 1;
        }
      }
    }
    return {
      guest_id: g.id,
      display_name: g.display_name,
      is_child: g.is_child,
      allow_plus_one: g.allow_plus_one,
      household_label: household?.label ?? null,
      responses,
    };
  });

  const eventNames = new Map(eventList.map((e) => [e.event_id, e.name]));
  const dietary: RsvpBoard['dietary'] = [];
  for (const bg of boardGuests) {
    for (const [eventId, r] of Object.entries(bg.responses)) {
      if (r.dietary || r.allergies) {
        dietary.push({
          guest: bg.display_name,
          event: eventNames.get(eventId) ?? 'Event',
          dietary: r.dietary ?? '—',
          allergies: r.allergies ?? '—',
        });
      }
    }
  }

  const { data: questions } = await supabase
    .from('rsvp_questions')
    .select('id, event_id, question, kind, required')
    .eq('wedding_id', weddingId)
    .order('position')
    .order('created_at');

  return {
    deadline: (wedding as { rsvp_deadline?: string | null } | null)?.rsvp_deadline ?? null,
    events: eventList,
    guests: boardGuests,
    dietary,
    questions: ((questions ?? []) as {
      id: string;
      event_id: string | null;
      question: string;
      kind: string;
      required: boolean;
    }[]).map((q) => ({
      ...q,
      event_name: q.event_id ? (eventNames.get(q.event_id) ?? 'Removed event') : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Couple overrides + deadline + questions (planner+)
// ---------------------------------------------------------------------------

export async function setRsvpAdmin(
  weddingId: string,
  guestId: string,
  eventId: string,
  status: RsvpStatus,
): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  // Tenant guards: guest and event must belong to this wedding.
  const [{ data: guest }, { data: event }] = await Promise.all([
    supabase.from('guests').select('id').eq('id', guestId).eq('wedding_id', weddingId).maybeSingle(),
    supabase.from('events').select('id').eq('id', eventId).eq('wedding_id', weddingId).maybeSingle(),
  ]);
  if (!guest || !event) throw new Error('Guest or event not found in this wedding.');
  const { error } = await supabase.from('rsvps').upsert(
    { wedding_id: weddingId, guest_id: guestId, event_id: eventId, status },
    { onConflict: 'guest_id,event_id' },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/rsvp`);
  const { logAudit } = await import('@/lib/db/audit');
  await logAudit({
    weddingId,
    action: 'rsvp.overridden',
    entity: 'rsvp',
    entityId: `${guestId}:${eventId}`,
    meta: { status },
  });
}

export interface DeadlineState {
  error?: string;
  ok?: boolean;
}

export async function setDeadline(
  weddingId: string,
  _prev: DeadlineState,
  formData: FormData,
): Promise<DeadlineState> {
  await requireRole(weddingId, 'planner');
  const raw = String(formData.get('deadline') ?? '').trim();
  if (raw && Number.isNaN(Date.parse(raw))) return { error: 'Deadline is not a valid date.' };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('weddings')
    .update({ rsvp_deadline: raw ? new Date(raw).toISOString() : null })
    .eq('id', weddingId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/rsvp`);
  return { ok: true };
}

export interface QuestionState {
  error?: string;
}

export async function createQuestion(
  weddingId: string,
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  await requireRole(weddingId, 'planner');
  const question = String(formData.get('question') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'text');
  const eventId = String(formData.get('eventId') ?? '').trim() || null;
  const required = formData.get('required') !== null;
  const options = String(formData.get('options') ?? '')
    .split(';')
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (!question) return { error: 'Question text is required.' };
  if (!['text', 'choice', 'boolean'].includes(kind)) return { error: 'Invalid question type.' };
  if (kind === 'choice' && options.length < 2) {
    return { error: 'Choice questions need at least two options (separate with ;).' };
  }

  const supabase = await createServerSupabaseClient();
  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('wedding_id', weddingId)
      .maybeSingle();
    if (!event) return { error: 'Event not found in this wedding.' };
  }
  const { error } = await supabase.from('rsvp_questions').insert({
    wedding_id: weddingId,
    event_id: eventId,
    question: question.slice(0, 300),
    kind,
    options: kind === 'choice' ? options : [],
    required,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/rsvp`);
  return {};
}

export async function deleteQuestion(weddingId: string, questionId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('rsvp_questions')
    .delete()
    .eq('id', questionId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/rsvp`);
}
