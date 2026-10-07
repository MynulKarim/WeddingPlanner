# Phase 0 — Architecture & Project Foundation

Stack: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres/Auth/Storage/Realtime).
Status: foundation only. No auth, guest, RSVP, or website logic yet.

## 1. Repository structure (actual)

```
/app
  /(auth)/login/page.tsx        → Phase 1 auth surface (placeholder)
  /dashboard/page.tsx           → couple dashboard shell (Phase 1+)
  /invite/[token]/page.tsx      → secure invitation entry (Phase 5)
  /w/[slug]/page.tsx            → public wedding website (Phase 4)
  /api/health/route.ts          → health check
/components/{ui,wedding,invitation,guests,rsvp,seating,planning,day-of}/  → reserved
/lib/{auth,db,security,i18n,themes,media,email,sms,payments,pdf,analytics}/ → interfaces + tokens
/services/{invitations,guests,rsvp,registry,seating,communications}/      → domain services
/types, /validations, /tests, /supabase/migrations, /public, /docs
```

Next.js 16 note: `params` is async (`await params`). All dynamic routes follow this.

## 2. Route structure

| Route | Access | Phase |
|---|---|---|
| `/` | public landing | 0 |
| `/(auth)/login`, `/(auth)/register`, `/(auth)/reset` | public, then authed redirect | 1 |
| `/dashboard`, `/dashboard/weddings/[id]/...` | owner/admin/planner | 1–2 |
| `/w/[slug]` | public (+ optional noindex) | 4 |
| `/invite/[token]` | token-scoped guest | 5 |
| `/day-of` | staff+ | 11 |
| `/api/health` | public | 0 |
| `/api/*` | session- or token-scoped, never expose private guest data publicly | 5+ |

Invitation URLs use opaque high-entropy tokens (`/invite/<token>`), never sequential IDs.

## 3. Component architecture

- `components/ui/` — presentational primitives (button/card/input), theme-token driven.
- `components/wedding|invitation|guests|rsvp|seating|planning|day-of/` — domain composites.
- Rule: no direct DB queries in presentational components. Server Components fetch via
  `lib/db/*` + `services/*`; client components receive props / call scoped API routes.

## 4. Service architecture

```
UI → services/<domain> → lib/<infra> → Supabase / provider adapter
```

- `services/communications/provider.ts` — `EmailProvider`/`SmsProvider` interfaces + NoOp dev providers.
- `services/registry/payment-provider.ts` — `PaymentProvider` adapter interface.
- Domain services (`invitations`, `guests`, `rsvp`, `seating`) are stubs until their phases.

## 5. Authorization model

Roles: `owner > admin > planner > staff > guest` (`lib/auth/roles.ts`).
Wedding = tenant. Every wedding-owned row carries `wedding_id` directly or via secure join.
Enforcement: Supabase RLS (Phase 1) + server-side checks. Never rely on UI hiding.
Guest tokens permit only: view own invitation + allowed events, submit allowed RSVP/engagement,
view public wedding info. Explicitly denied: other guests, notes, seating, budget, vendors, settings.

## 6. Design-token architecture

`lib/themes/tokens.ts` — 15 themes (editorial, classic, romantic, botanical, black-tie, royal,
modern, minimal, garden, luxury, south-asian, contemporary, coastal, traditional, dark-luxury).
Shape: `{ typography, colors, spacing(future), borders(future), radius, motion }`.
`themeToCssVars()` emits `--wp-*` custom properties. Weddings store `theme_id + overrides`
(Phase 3). Monogram designer reuses display typography (Phase 3).

## 7. i18n architecture

`lib/i18n/languages.ts` — 32 locales, `rtl` flags, `resolveLocale(guest → wedding → fallback)`.
Rule: no hard-coded strings in components (Phase 6 adds dictionaries, ICU dates/numbers, RTL shells).

## 8. Database design

See `docs/database-schema.md` + `supabase/migrations/0001_core_foundation.sql`
(documentary in Phase 0; applied + RLS-hardened in Phase 1).
Core tables: users (via auth), weddings, wedding_members, events, households, guests,
guest_events, invitations, rsvps + engagement/planning/seating/registry/media per ARCHITECTURE.md §4.

## 9. Roadmap

Phase 1: auth + multi-tenancy + RLS. Phase 2: events + guest hub. Phase 3: theme engine.
Phase 4: website builder. Phase 5: invitations + RSVP. Phase 6: i18n. Phase 7: comms.
Phase 8: venue/registry. Phase 9: seating/planning. Phase 10: engagement. Phase 11: day-of.
Phase 12: print PDFs. Phase 13: hardening. Phase 14: audit.

## 10. Phase 0 verification

- `tsc --noEmit` (typecheck)
- `eslint` (lint)
- `next build` (production build)
- `GET /api/health` → `{ ok: true }`
