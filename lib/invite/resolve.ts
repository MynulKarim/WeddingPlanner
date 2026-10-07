/**
 * Invitation token resolution — Phase 5 (SERVER ONLY).
 * Resolves an opaque token to the guest's full scope using the service-role
 * client, because guests have no Supabase session. Every guest read/mutation
 * re-resolves the token and is scoped in application code; there is
 * deliberately no anon RLS policy on invitations/guests/rsvps.
 * Never import from client components.
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { hashInvitationToken } from '@/lib/security/token-hash';
import { isPlausibleInvitationToken } from '@/lib/security/invitation-token';
import { resolveLocale } from '@/lib/i18n/languages';

export interface ResolvedGuestEvent {
  event_id: string;
  name: string;
  starts_at: string | null;
  timezone: string;
  venue: string | null;
  address: string | null;
  description: string | null;
  dress_code: string | null;
}

export interface ResolvedInvitation {
  weddingId: string;
  weddingTitle: string;
  weddingSlug: string;
  themeId: string;
  themeOverrides: Record<string, string>;
  defaultLocale: string;
  deadline: string | null;
  guestId: string;
  guestName: string;
  householdId: string | null;
  householdLabel: string | null;
  householdMemberNames: string[];
  allowPlusOne: boolean;
  locale: string;
  events: ResolvedGuestEvent[];
  monogram: { initials: string; style: string; shape: string } | null;
}

/** Returns null for unknown/malformed tokens (indistinguishable outcomes). */
export async function resolveInvitation(token: string): Promise<ResolvedInvitation | null> {
  if (!isPlausibleInvitationToken(token)) return null;
  const supabase = createServiceRoleClient();
  const tokenHash = hashInvitationToken(token);

  const { data: invitation } = await supabase
    .from('invitations')
    .select('wedding_id, guest_id, locale')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (!invitation) return null;
  const inv = invitation as { wedding_id: string; guest_id: string; locale: string };

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, title, slug, theme_id, theme_overrides, default_locale, rsvp_deadline')
    .eq('id', inv.wedding_id)
    .maybeSingle();
  if (!wedding) return null;
  const w = wedding as {
    id: string;
    title: string;
    slug: string;
    theme_id: string;
    theme_overrides: Record<string, string>;
    default_locale: string;
    rsvp_deadline: string | null;
  };

  const { data: guest } = await supabase
    .from('guests')
    .select('id, display_name, household_id, allow_plus_one, locale')
    .eq('id', inv.guest_id)
    .eq('wedding_id', w.id)
    .maybeSingle();
  if (!guest) return null;
  const g = guest as {
    id: string;
    display_name: string;
    household_id: string | null;
    allow_plus_one: boolean;
    locale: string | null;
  };

  // Allowed events for this guest.
  const { data: assignments } = await supabase
    .from('guest_events')
    .select('event_id, events(id, name, starts_at, timezone, venue, address, description, dress_code)')
    .eq('guest_id', g.id);
  const events: ResolvedGuestEvent[] = ((assignments ?? []) as unknown as {
    event_id: string;
    events: ResolvedGuestEvent | ResolvedGuestEvent[] | null;
  }[])
    .map((a) => (Array.isArray(a.events) ? a.events[0] : a.events))
    .filter((e): e is ResolvedGuestEvent => Boolean(e))
    .map((e) => ({
      event_id: e.event_id ?? (e as { id?: string }).id ?? '',
      name: e.name,
      starts_at: e.starts_at,
      timezone: e.timezone,
      venue: e.venue,
      address: e.address,
      description: e.description,
      dress_code: e.dress_code,
    }));

  // Household context (names only — no private notes, no other data).
  let householdLabel: string | null = null;
  let householdMemberNames: string[] = [];
  if (g.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('label')
      .eq('id', g.household_id)
      .maybeSingle();
    householdLabel = (household as { label?: string } | null)?.label ?? null;
    const { data: members } = await supabase
      .from('guests')
      .select('display_name')
      .eq('household_id', g.household_id)
      .eq('wedding_id', w.id);
    householdMemberNames = ((members ?? []) as { display_name: string }[])
      .map((m) => m.display_name)
      .filter((n) => n !== g.display_name);
  }

  const { data: monogram } = await supabase
    .from('monograms')
    .select('initials, style, shape')
    .eq('wedding_id', w.id)
    .maybeSingle();

  // Locale chain: explicit guest language beats the wedding default; the
  // locale snapshotted at issuance is only a last resort before English,
  // so changing the wedding default (or guest language) updates live links.
  const locale = resolveLocale({
    guestLocale: g.locale,
    weddingLocale: w.default_locale,
    hintLocale: inv.locale,
  });

  return {
    weddingId: w.id,
    weddingTitle: w.title,
    weddingSlug: w.slug,
    themeId: w.theme_id ?? 'editorial',
    themeOverrides: w.theme_overrides ?? {},
    defaultLocale: w.default_locale ?? 'en',
    deadline: w.rsvp_deadline,
    guestId: g.id,
    guestName: g.display_name,
    householdId: g.household_id,
    householdLabel,
    householdMemberNames,
    allowPlusOne: g.allow_plus_one,
    locale,
    events,
    monogram: (monogram ?? null) as ResolvedInvitation['monogram'],
  };
}

export interface ResolvedRsvp {
  event_id: string;
  status: 'pending' | 'attending' | 'declined';
  plus_one: boolean;
  plus_one_name: string | null;
  dietary: string | null;
  allergies: string | null;
  notes: string | null;
  answers: Record<string, string>;
}

/** Existing RSVP rows for the resolved guest (for prefill + modification). */
export async function getGuestRsvps(inv: ResolvedInvitation): Promise<ResolvedRsvp[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('rsvps')
    .select('event_id, status, plus_one, plus_one_name, dietary, allergies, notes, answers')
    .eq('wedding_id', inv.weddingId)
    .eq('guest_id', inv.guestId);
  return ((data ?? []) as ResolvedRsvp[]).filter((r) =>
    inv.events.some((e) => e.event_id === r.event_id),
  );
}

export interface PublicQuestion {
  id: string;
  event_id: string | null;
  question: string;
  kind: 'text' | 'choice' | 'boolean';
  options: string[];
  required: boolean;
}

/** Custom questions visible to the guest (scoped to wedding + their events). */
export async function getGuestQuestions(inv: ResolvedInvitation): Promise<PublicQuestion[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('rsvp_questions')
    .select('id, event_id, question, kind, options, required')
    .eq('wedding_id', inv.weddingId)
    .order('position')
    .order('created_at');
  return ((data ?? []) as {
    id: string;
    event_id: string | null;
    question: string;
    kind: 'text' | 'choice' | 'boolean';
    options: unknown;
    required: boolean;
  }[])
    .filter((q) => q.event_id === null || inv.events.some((e) => e.event_id === q.event_id))
    .map((q) => ({
      id: q.id,
      event_id: q.event_id,
      question: q.question,
      kind: q.kind,
      options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string') : [],
      required: q.required,
    }));
}
