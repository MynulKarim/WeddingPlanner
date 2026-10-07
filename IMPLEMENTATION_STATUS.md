# Premium Wedding Platform --- Implementation Status

## Purpose

This file is the persistent development checklist for the project.

AI coding agents must read this file before making changes and update it
after completing a phase.

Do not mark a feature complete unless it has actually been implemented
and tested.

------------------------------------------------------------------------

# Overall Status

**Current phase:** Phase 16 --- Reliability Hardening (`COMPLETE` — verified live 2026-10-07: 134/134 tests on migrations 0001–0021; typecheck + lint + build green)

**Overall completion:** 100% (Phases 0–16)

**Production ready:** No

------------------------------------------------------------------------

# Phase 0 --- Architecture and Foundation

Status: `COMPLETE`

-   [x] Inspect existing repository
-   [x] Document architecture
-   [x] Document database schema
-   [x] Document route structure
-   [x] Document component architecture
-   [x] Document service architecture
-   [x] Document authorization model
-   [x] Document design-token system
-   [x] Establish development roadmap
-   [x] Confirm build works
-   [x] Confirm tests work

------------------------------------------------------------------------

# Phase 1 --- Authentication and Multi-Tenancy

Status: `COMPLETE` (verified live 2026-10-05: 12/12 tests incl. cross-tenant isolation on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Registration
-   [x] Login
-   [x] Logout
-   [x] Password reset
-   [x] Email verification
-   [x] Protected dashboard
-   [x] User profile
-   [x] Wedding creation
-   [x] Wedding slug
-   [x] Wedding membership
-   [x] Owner role
-   [x] Admin role
-   [x] Planner role architecture
-   [x] Staff role architecture
-   [x] Guest role architecture
-   [x] PostgreSQL RLS
-   [x] Tenant isolation tests
-   [x] Authentication tests

------------------------------------------------------------------------

# Phase 2 --- Events and Guest Hub

Status: `COMPLETE` (verified live 2026-10-06: 21/21 tests incl. guest-hub isolation on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Event CRUD
-   [x] Event scheduling
-   [x] Venue information
-   [x] Event visibility
-   [x] RSVP-required flag
-   [x] Guest CRUD
-   [x] Households
-   [x] Couples/families
-   [x] Children
-   [x] Plus-one eligibility
-   [x] Guest tags
-   [x] Guest notes
-   [x] Guest language
-   [x] Guest-event assignments
-   [x] Guest search
-   [x] Guest filters
-   [x] CSV import
-   [x] CSV export
-   [x] Guest statistics
-   [x] Tests

------------------------------------------------------------------------

# Phase 3 --- Theme Engine and Invitation Builder

Status: `COMPLETE` (verified live 2026-10-06: 34/34 tests incl. design/media isolation + storage round-trip on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Design-token system
-   [x] Typography system
-   [x] Color system
-   [x] Spacing system
-   [x] Border system
-   [x] Button system
-   [x] Card system
-   [x] Animation system
-   [x] 15+ initial themes
-   [x] Theme selection
-   [x] Theme customization
-   [x] Invitation preview
-   [x] Mobile preview
-   [x] Desktop preview
-   [x] Section ordering
-   [x] Section enable/disable
-   [x] Image upload
-   [x] Video support
-   [x] Monogram designer
-   [x] Monogram persistence
-   [x] Media authorization
-   [x] Tests

------------------------------------------------------------------------

# Phase 4 --- Wedding Website Builder

Status: `COMPLETE` (verified live 2026-10-06: 39/39 tests + 12/12 public render checks on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Public wedding URL
-   [x] Hero section
-   [x] Invitation section
-   [x] Couple section
-   [x] Love story
-   [x] Events
-   [x] Order of day
-   [x] Venue
-   [x] Travel
-   [x] Accommodation
-   [x] Menu
-   [x] Dietary information
-   [x] FAQ
-   [x] Registry
-   [x] Gallery
-   [x] Guestbook placeholder
-   [x] Photo wall placeholder
-   [x] Song request placeholder
-   [x] Games placeholder
-   [x] Section reorder
-   [x] Publish/unpublish
-   [x] SEO metadata
-   [x] Open Graph
-   [x] Canonical URL
-   [x] Sitemap
-   [x] Noindex option
-   [x] Mobile optimization
-   [x] Performance audit
-   [x] Tests

------------------------------------------------------------------------

# Phase 5 --- Personalized Invitations and RSVP

Status: `COMPLETE` (verified live 2026-10-06: 51/51 tests + 11/11 invitation journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Secure invitation tokens
-   [x] Personalized invitation
-   [x] Guest identity resolution
-   [x] Household resolution
-   [x] Allowed-event filtering
-   [x] Plus-one rules
-   [x] RSVP form
-   [x] Event-specific RSVP
-   [x] Dietary questions
-   [x] Allergy questions
-   [x] Custom RSVP questions
-   [x] RSVP deadline
-   [x] RSVP confirmation
-   [x] RSVP modification
-   [x] Couple RSVP dashboard
-   [x] RSVP statistics
-   [x] Invitation security tests
-   [x] RSVP authorization tests

------------------------------------------------------------------------

# Phase 6 --- Multilingual

Status: `COMPLETE` (verified live 2026-10-06: 61/61 tests + 14/14 locale journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] i18n architecture
-   [x] 32-language framework
-   [x] Translation keys
-   [x] Wedding default language
-   [x] Guest language
-   [x] Admin language
-   [x] Manual language override
-   [x] Localized dates
-   [x] Localized times
-   [x] Localized numbers
-   [x] RTL support
-   [x] Fallback language
-   [x] Translation completeness checks
-   [x] RTL tests

------------------------------------------------------------------------

# Phase 7 --- Communications

Status: `COMPLETE` (verified live 2026-10-06: 71/71 tests + 8/8 messages journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Email service abstraction
-   [x] Email templates
-   [x] Save-the-date
-   [x] Invitation email
-   [x] RSVP reminder
-   [x] Event reminder
-   [x] Custom announcement
-   [x] Thank-you message
-   [x] SMS service abstraction
-   [x] SMS templates
-   [x] Shareable links
-   [x] Communication history
-   [x] Delivery status
-   [x] Failure status
-   [x] Scheduling architecture
-   [x] User confirmation before sending
-   [x] Provider mocks
-   [x] Communication tests

------------------------------------------------------------------------

# Phase 8 --- Wedding Information and Registry

Status: `COMPLETE` (verified live 2026-10-07: 77/77 tests + 7/7 registry journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Venue
-   [x] Directions
-   [x] Map
-   [x] Airport information
-   [x] Transportation
-   [x] Parking
-   [x] Accommodation
-   [x] Menu
-   [x] Dietary information
-   [x] FAQ
-   [x] Registry items
-   [x] Product gifts
-   [x] Cash gifts
-   [x] Honeymoon fund
-   [x] Experience gifts
-   [x] Custom gifts
-   [x] Payment-provider abstraction
-   [x] Public website integration
-   [x] Permission tests

------------------------------------------------------------------------

# Phase 9 --- Seating and Planning

Status: `COMPLETE` (verified live 2026-10-07: 85/85 tests + 8/8 planning journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Tables
-   [x] Table capacity
-   [x] Table names/numbers
-   [x] Drag-and-drop seating
-   [x] Guest search
-   [x] Unassigned guest list
-   [x] Capacity warnings
-   [x] Duplicate assignment detection
-   [x] Seating lookup
-   [x] Seating chart
-   [x] Place-card data
-   [x] Checklist
-   [x] Wedding-date-based checklist
-   [x] Budget tracker
-   [x] Vendor tracker
-   [x] CSV export
-   [x] XLSX export
-   [x] Calculation tests

------------------------------------------------------------------------

# Phase 10 --- Guest Engagement

Status: `COMPLETE` (verified live 2026-10-07: 90/90 tests + 11/11 engagement journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Digital guestbook
-   [x] Guestbook moderation
-   [x] Guest photo upload
-   [x] Photo moderation
-   [x] Live photo wall
-   [x] Photo albums
-   [x] Song requests
-   [x] Song moderation
-   [x] Wedding games
-   [x] Kids games
-   [x] Welcome video
-   [x] Time capsule
-   [x] Vow keepsake
-   [x] Privacy tests
-   [x] Media permission tests

------------------------------------------------------------------------

# Phase 11 --- Day-of Wedding

Status: `COMPLETE` (verified live 2026-10-07: 94/94 tests + 11/11 day-of journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Staff mode
-   [x] Staff permissions
-   [x] Guest search
-   [x] QR check-in
-   [x] Manual check-in
-   [x] Check-in reversal
-   [x] Attendance dashboard
-   [x] Seating lookup
-   [x] Dietary display
-   [x] Event schedule
-   [x] Announcements
-   [x] Live photo wall
-   [x] Vendor contacts
-   [x] Connectivity resilience
-   [x] Check-in tests
-   [x] Authorization tests

------------------------------------------------------------------------

# Phase 12 --- Printable Stationery

Status: `COMPLETE` (verified live 2026-10-07: 102/102 tests + 10/10 stationery journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Printable invitation
-   [x] Save-the-date PDF
-   [x] Place cards
-   [x] Menus
-   [x] Thank-you cards
-   [x] Seating chart
-   [x] Print preview
-   [x] Page dimensions
-   [x] Print-safe margins
-   [x] Font embedding
-   [x] High-resolution images
-   [x] Long-name tests
-   [x] Theme tests

------------------------------------------------------------------------

# Phase 13 --- Production Hardening

Status: `COMPLETE` (verified live 2026-10-07: 112/112 tests + 5/5 hardening journey on project yyekjkmnhuyxmzykuqgn; typecheck + lint + build green)

-   [x] Analytics
-   [x] Feature entitlements
-   [x] Subscription architecture
-   [x] Payment abstraction
-   [x] Error monitoring
-   [x] Structured logging
-   [x] Audit logs
-   [x] Health checks
-   [x] Backup strategy
-   [x] Disaster recovery documentation
-   [x] Security audit
-   [x] RLS audit
-   [x] File-upload audit
-   [x] Performance audit
-   [x] Database query audit

------------------------------------------------------------------------

# Phase 16 --- Reliability Hardening

Status: `COMPLETE` (verified live 2026-10-07: 134/134 tests on migrations 0001–0021 incl. 5-way anon oversell race, claim overlap/stale-recovery, RSVP deadline re-check, tenant-guarded check-in; typecheck + lint + build green)

-   [x] Atomic dispatch claims (`sending` state + `FOR UPDATE SKIP LOCKED`)
-   [x] Secure cron endpoint (`Bearer CRON_SECRET`, Vercel Cron every 5 min)
-   [x] Atomic multi-event RSVP (fresh deadline check in-transaction)
-   [x] Hard registry inventory gate (row lock, no oversell)
-   [x] Atomic tenant-guarded check-in
-   [x] Legacy fallbacks when 0019/0020 pending (old behavior preserved)
-   [x] PDF preflight + fallback URL + studio print-via-preview + error taxonomy
-   [x] Unit tests (cron auth, claim/deliver/fallback, Chromium matcher)
-   [x] Live verification (migrations 0019–0021 applied 2026-10-07)

------------------------------------------------------------------------

# Phase 15 --- Deferred Product Gaps

Status: `COMPLETE` (verified live 2026-10-07: 124/124 tests on migrations 0001–0018 incl. vote uniqueness/unpublished-denial, payment trigger rollup reversal, invite claim flow; typecheck + lint + build green)

-   [x] Quiz/vote questions on games (2–8 options, scored or poll mode)
-   [x] Anonymous voting + live result tallies + correct-answer reveal
-   [x] Game visibility toggle (Show/Hide)
-   [x] Wedding-date-based budget template + seed action
-   [x] Vendor payment line items + atomic paid rollup + export dataset
-   [x] Team invites table + auto-link on sign-in/sign-up/callback + pending UI
-   [x] Section-label key pass (`site.section.*`, 20 keys × 32 locales)
-   [x] Game strings (`game.*`, 6 keys × 32 locales)
-   [x] Dashboard hub translation (`dash.*`, 40 keys × 32 locales, admin locale)
-   [x] Dashboard website preview renders live engagement
-   [x] Unit tests (quiz, budget template, export, section labels)
-   [x] Live verification (migrations 0016–0018 applied 2026-10-07)

------------------------------------------------------------------------

# Phase 14 --- Final Product Audit

Status: `COMPLETE` (2026-10-07: mega-journey 15/15 live, integrity clean, 112/112 tests + production build green, docs rewritten)

-   [x] Complete onboarding flow
-   [x] Complete invitation flow
-   [x] Complete RSVP flow
-   [x] Complete guest management flow
-   [x] Complete website publishing flow
-   [x] Complete multilingual flow
-   [x] Complete seating flow
-   [x] Complete day-of flow
-   [x] Complete export flow
-   [x] Complete stationery flow
-   [x] Mobile audit
-   [x] Accessibility audit
-   [x] Security audit
-   [x] Performance audit
-   [x] E2E tests
-   [x] Production build
-   [x] Deployment documentation
-   [x] README updated
-   [x] `.env.example` updated
-   [x] Known issues documented

------------------------------------------------------------------------

# Current Known Issues

Last reviewed: Phase 16 implementation (2026-10-07). No critical or
high-severity open problems. The following are accepted limitations and
follow-ups, worst first.

## Shipped with documented limits

- Real money never moves: registry claims are reservations and
  communications send through NoOp providers without keys. Live Stripe /
  Resend / Twilio / PostHog / Sentry integrations are Phase-13-tracked ops
  work, not code gaps (abstractions + factories are in place).
- Scheduled dispatch needs a scheduler + `CRON_SECRET`: Vercel Cron ships
  in `vercel.json` (5 min); without it use pg_cron/external cron or the
  manual button (see `docs/deployment.md`). Overlapping runners are
  claim-safe; crashed workers' rows recover after 10 minutes.
- PDF rendering needs a Chromium binary on the app host. Hosts without it
  now get a fast 503 with an HTML fallback URL, and the studio offers
  print-via-preview (Vercel serverless included). One-click PDFs on
  serverless still need an external render service (`PDF_RENDER_URL`,
  unwired).
- Simultaneous opposing ops (check-in vs undo) remain last-writer-wins —
  staff coordinate the door and the offline outbox dedupes per device.
  RSVP multi-event writes are now atomic and registry oversell is gated.
- Team invites record + auto-link only: no invite email is sent yet
  (comms sends to guests, not team onboarding). The pending-invites list
  shows who has access coming.

## Deferred product scope (remaining)

- Dashboard page-level translation beyond the hub: the wedding hub
  (nav, team, invites) renders in the admin's profile locale, and all
  guest surfaces + website section kickers are translated — but deeper
  dashboard pages (forms, dialogs, page copy) stay English. The `dash.*`
  namespace is ready to extend.
- Quiz/vote errors returned by server actions stay English (same as all
  existing public-action errors); labels, buttons, and results are fully
  translated.

## Environment notes (not product bugs)

- Node runs from a portable install (winget admin install was UAC-blocked);
  install Node LTS system-wide at convenience.
- `zxing` and `xlsx`/`puppeteer` carry upstream advisories: zxing runs in
  browsers only; xlsx generates but never parses uploads; puppeteer is
  server-only behind an authenticated route.
- Phase 9 notes: budget is create+delete only (append-only money trail);
  vendor payments are single cost/paid figures; xlsx package used for
  generation only (never parses untrusted files).
- Phase 8 notes: claims are reservations only — no money moves until payments
  (Phase 13); oversell under concurrency is possible until hard inventory
  gating lands with payments.
- Phase 7 notes: real sending needs RESEND_API_KEY / TWILIO_* env (absent =
  logged NoOp); cron wiring for scheduled dispatch is ops (Phase 13).
- Team invite-by-email still records intent only; auto-link on registration
  remains open (communications sends to guests, not team onboarding).
- Phase 6 scope notes: dashboard chrome stays English (guest surfaces fully
  translated); structural section labels stay English pending a section-title
  key pass.
- Phase 0: no E2E runner yet (playwright planned); verification is
  typecheck + lint + vitest (unit + live integration) + production build.
- Node.js runs from portable install at
  `C:\Users\mahim\AppData\Local\Temp\opencode\nodejs\node-v22.18.0-win-x64`
  (winget admin install blocked by UAC). Add it to PATH or install Node LTS system-wide.

------------------------------------------------------------------------

# Decisions Log

Record important technical/product decisions here.

  Date   Decision   Reason   Phase
  ------ ---------- -------- -------
  2026-10-05    Next.js 16 App Router + TS + Tailwind v4, no src/ dir    Matches ARCHITECTURE.md route plan; async params convention    0
  2026-10-05    Token-based themes (15) in lib/themes/tokens.ts    Future themes without rebuilding components    0
  2026-10-05    32-locale registry with guest→wedding→fallback resolution    PROJECT_SPEC multilingual requirement    0
  2026-10-05    Opaque invitation tokens (/invite/<token>), sha256 hash in DB    Never expose sequential guest IDs    0
  2026-10-05    Provider interfaces (email/SMS/payments) + NoOp dev adapters    No hard-coded vendor logic in domain    0
  2026-10-05    Supabase SSR session via Next 16 proxy.ts (middleware renamed)    Official convention; optimistic checks only, RLS enforces    1
  2026-10-05    Password + magic-link auth via server actions    User requested both methods    1
  2026-10-05    RLS with SECURITY DEFINER membership helpers    Avoid recursive policy lookups; wedding = tenant    1
  2026-10-05    Creator auto-becomes owner via trigger    Zero-friction first wedding    1
  2026-10-05    weddings_select_created_by + created_by=auth.uid() insert pin    INSERT...RETURNING can't see trigger-written membership (verified live); row-local policy fixes it    1
  2026-10-05    Owner trigger skips when auth.uid() null    Service-role/admin inserts must not crash    1
  2026-10-06    Couples/families via households; children via guests.is_child    Avoids parallel relationship tables; matches exports    2
  2026-10-06    Guest filters/stats as pure functions over hub fetch    Unit-testable without DB; small guest lists fit in memory    2
  2026-10-06    Single monogram per wedding (PK on wedding_id) + transparent SVG mark    One reusable asset for invitation/website/print    3
  2026-10-06    Private wedding-media bucket + member-scoped storage policies    Guest/public reads arrive with website/invitation phases    3
  2026-10-06    90s timeout on cloud integration tests    Sequential round-trips exceed vitest 5s default    3
  2026-10-06    Public reads via published-gated RLS (weddings/events/monograms/sites + visibility-gated media)    Guest data stays member-only; personalization in Phase 5    4
  2026-10-06    Public guest pages are server-only (zero client JS) + next/image remotePatterns    Mobile-network performance    4
  2026-10-06    Invitation tokens: hash-only storage, service-role resolution scoped in code, no anon RLS    Guests have no session; every guest op re-resolves token    5
  2026-10-06    One invitation per guest (UNIQUE guest_id); regenerate kills old links    Predictable link lifecycle    5
  2026-10-06    Locale chain ?lang > guest > wedding default > issuance hint > en; RSVP rules return keys    Issuance snapshot must not shadow live defaults; UI renders keys via t()    6
  2026-10-06    Comms: explicit-confirm sends only; previews side-effect free; NoOp default    Invitation sends mint fresh links (stated upfront); cron is ops    7
  2026-10-07    Registry claims are reservations (no money); raised_cents trigger keeps public totals    Claim rows stay member-only; hard inventory gating with payments    8
  2026-10-07    Seating: UNIQUE(guest_id) blocks double-seating; over-capacity warns; budget append-only    xlsx generates only (never parses uploads); droppable lives inside DndContext    9
  2026-10-07    Engagement: unapproved content invisible publicly; capsule sealed by date in RLS    Public writes forced into moderation via WITH CHECK; vows member-only    10
  2026-10-07    Day-of: staff = member role + ops UI; check-in upsert-safe + reversible; QR both ends    Scanner dynamically imported; offline outbox in localStorage with auto-flush    11
  2026-10-07    Stationery: themed HTML docs + Chromium PDF (A-series, safe margins, embedded fonts)    No migration (reads existing data); serverless needs external render later    12
  2026-10-07    Hardening: plans enforced at creation; append-only audit; static RLS audit in suite    Monitoring/analytics abstracted (console now, vendors later); indexes audited    13
  2026-10-07    Audit: locale chain demoted issuance hint; form inputs labelled; integrity clean    Mega-journey 15/15; README + deployment docs rewritten    14
  2026-10-07    Phase 15: game questions/votes (0016), vendor payments + trigger rollup (0017), team invites + auto-link (0018), budget template, section/dash key pass (66 keys × 32 locales), live preview engagement    15
  2026-10-07    Phase 16: dispatch claims + cron endpoint (0019), atomic RSVP/registry/check-in RPCs (0020), PDF preflight + fallback    16

------------------------------------------------------------------------

# Change Log

Record meaningful implementation changes.

  Date   Change                Phase
  ------ --------------------- -------
  2026-10-05    Phase 0 foundation: scaffold + docs + tokens + routes + verified build   0
  2026-10-05    Phase 1 code: auth (password+magic link), proxy, weddings, members, profile, migrations, vitest   1
  2026-10-05    Phase 1 verified live: migrations 0001-0004 applied, 12/12 tests pass incl. tenancy isolation   1
  2026-10-06    Phase 2 verified live: migration 0005 applied, 21/21 tests pass incl. guest-hub isolation   2
  2026-10-06    Phase 3 verified live: migration 0006 applied, 34/34 tests pass incl. design/media isolation   3
  2026-10-06    Phase 4 verified live: migration 0007 applied, 39/39 tests + 12/12 render checks pass   4
  2026-10-06    Phase 5 verified live: migration 0008 applied, 51/51 tests + 11/11 invitation journey pass   5
  2026-10-06    Phase 6 verified live: migration 0009 applied, 61/61 tests + 14/14 locale journey pass   6
  2026-10-06    Phase 7 verified live: migration 0010 applied, 71/71 tests + 8/8 messages journey pass   7
  2026-10-07    Phase 8 verified live: migration 0011 applied, 77/77 tests + 7/7 registry journey pass   8
  2026-10-07    Phase 9 verified live: migration 0012 applied, 85/85 tests + 8/8 planning journey pass   9
  2026-10-07    Phase 10 verified live: migration 0013 applied, 90/90 tests + 11/11 engagement journey pass   10
  2026-10-07    Phase 11 verified live: migration 0014 applied, 94/94 tests + 11/11 day-of journey pass   11
  2026-10-07    Phase 12 verified live: no migration, 102/102 tests + 10/10 stationery journey pass   12
  2026-10-07    Phase 13 verified live: migration 0015 applied, 112/112 tests + 5/5 hardening journey pass   13
  2026-10-07    Phase 14 audit: mega-journey 15/15, integrity clean, docs rewritten (no migration)   14
  2026-10-06    Global light/dark toggle (next-themes, class strategy, persisted) + dark variants across all pages   2
  2026-10-07    Live re-verification: 112/112 tests pass live (no migration); added 90s timeout to tenancy + guest-hub integration suites to match other live suites; typecheck + lint + build green   14
  2026-10-07    Phase 15 code complete: 109 unit tests pass, typecheck + lint + build green; migrations 0016–0018 written, awaiting apply for live verification   15
  2026-10-07    Phase 15 hardening: schema-guard degrades new-table reads to empty + names pending migration on writes (PGRST205); vendors/engage/hub pages no longer 500 pre-migration   15
  2026-10-07    Phase 15 verified live: migrations 0016–0018 applied, 124/124 tests pass (fixed 2 test-only issues: public-read assertion, wedding-scoped reads)   15
  2026-10-07    Phase 16 code complete: unit tests pass, typecheck + lint + build green; migrations 0019–0021 written, awaiting apply for live verification   16
  2026-10-07    Phase 16 verified live: migrations 0019–0021 applied, 134/134 tests pass (incl. anon oversell race after 0021 definer fix)   16

------------------------------------------------------------------------

# AI Agent Rules

Every coding agent must:

1.  Read `PROJECT_SPEC.md`.
2.  Read `ARCHITECTURE.md`.
3.  Read this file before modifying code.
4.  Determine the current phase.
5.  Implement only the current phase unless explicitly instructed
    otherwise.
6.  Preserve working functionality.
7.  Run tests after changes.
8.  Run type checking.
9.  Run linting.
10. Run a production build.
11. Check authorization and RLS for relevant features.
12. Update this file after completing work.
13. Never mark a task complete without testing it.
14. Record important architectural decisions.
15. Document unresolved issues rather than hiding them.

Do not rewrite the application from scratch unless explicitly
instructed.

------------------------------------------------------------------------

# Phase Transition Rule

A phase can only be marked `COMPLETE` when:

-   All required checklist items are implemented.
-   Tests pass.
-   Production build passes.
-   No known critical security issue remains.
-   Existing functionality has been regression-tested.
-   The implementation status has been updated.
-   Known limitations have been documented.
