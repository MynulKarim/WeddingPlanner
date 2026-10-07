# Security audit — living checklist (Phase 13)

Enforced automatically by `tests/security/rls-audit.test.ts`, which parses
every migration and fails the suite on regressions. Manual review items are
marked [manual].

## Tenancy (automated)

- Every wedding-owned table carries `wedding_id` and has RLS enabled.
- Every RLS-enabled table has at least one policy (no silent deny-all
  surprises, no fail-open gaps).
- No `USING (true)` / `WITH CHECK (true)` blanket policies anywhere.
- Storage `wedding-media` bucket is private; object policies scope
  `<wedding_id>/` prefixes to members, plus narrow public/anon grants that
  each re-validate published status or moderation state.

## Authentication & sessions (automated + manual)

- Session refresh via `proxy.ts`; protected prefixes redirect anonymously.
- [manual] Supabase Auth settings: confirm-email ON, Site URL + `/auth/callback`
  redirect allow-listed (see `docs/supabase-setup.md`).

## Secrets (automated)

- No committed secrets: `.env*` gitignored; no `eyJ` JWT-shaped strings in
  tracked source (the audit test scans for them, excluding docs that
  reference key *names*).
- Service-role key used server-side only (never imported by client
  components — `lib/supabase/server.ts` and invite resolution are
  server-only modules).

## File uploads (automated)

- Type allow-lists + size caps enforced in app code (`lib/media/validation.ts`)
  AND re-checked on every upload path.
- Storage RLS mirrors table RLS; guest uploads forced into moderation
  (`is_approved=false`, guest-scoped visibility) by WITH CHECK.

## Guest surface (automated)

- No anon SELECT policies on guests, guest_events, invitations, rsvps,
  wedding_members, profiles, vows, audit_logs, messages, message_templates.
- Invitation tokens: hash-only storage, constant-time verify, single active
  token per guest, regeneration kills predecessors.

## Operational

- Security headers: review hosting defaults (HSTS, CSP) before launch
  [manual].
- Dependency audit: `npm audit` clean of criticals before release [manual].
- Error monitoring: console provider now; Sentry DSN wiring documented in
  `lib/observability/errors.ts`.
