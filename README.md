# Ever After — luxury wedding platform

Invitations, wedding websites, RSVP, guest management, seating, registry,
communications, day-of operations, and print-ready stationery — one
tenant-isolated codebase (a wedding is the tenant) on Next.js + Supabase.

## Status

Phases 0–13 complete and verified live (112/112 tests + scripted journeys);
Phase 14 (final audit) in progress. See `IMPLEMENTATION_STATUS.md` for the
phase-by-phase record, `PROJECT_SPEC.md` for the product spec, and
`ARCHITECTURE.md` for the technical design.

## Quick start

Requirements: Node.js 22+, a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev                  # http://localhost:3000
```

Apply the database migrations in order before first use:

```bash
# Supabase Dashboard → SQL Editor → run each file in order:
supabase/migrations/0001_core_foundation.sql
# … through …
supabase/migrations/0015_hardening.sql
```

Full setup (auth URLs, redirect allow-list, what each file does):
[`docs/supabase-setup.md`](docs/supabase-setup.md). Production deployment:
[`docs/deployment.md`](docs/deployment.md).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs typecheck) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: unit + live integration (needs `.env.local`) |

## Project map

- `app/` — routes: `(auth)`, `dashboard/weddings/[id]/*` (events, guests,
  households, design, website, rsvp, messages, registry, seating, checklist,
  budget, vendors, engage, stationery, settings, activity), `day-of`,
  `invite/[token]`, `w/[slug]`, `api/`
- `lib/` — domain logic by area (`auth`, `db`, `guests`, `rsvp`, `invite`,
  `themes`, `i18n` + 32 locales, `communications`, `registry`, `planning`,
  `engagement`, `dayof`, `media`, `pdf`, `export`, `entitlements`,
  `observability`, `security`, `supabase`)
- `components/` — `ui/`, `auth/`, `monogram/`, `invitation/`, `website/`, `invite/`, `i18n/`
- `services/` — provider abstractions (email/SMS/payments)
- `supabase/migrations/` — versioned schema, 0001–0015 (never edit applied
  migrations; add new ones)
- `tests/` — `unit/`, `integration/` (live Supabase), `security/` (static
  RLS/secret audits)
- `docs/` — setup, security/performance audits, backup & recovery, deployment
- `types/`, `validations/` — shared domain types and pure validators

## Conventions that matter

- **Tenant isolation**: every wedding-owned row carries `wedding_id`;
  Supabase RLS enforces it and `tests/security/rls-audit.test.ts` fails the
  suite on regressions.
- **Guests have no sessions**: invitation tokens resolve server-side
  (hash-only storage); every guest operation re-validates scope.
- **No silent sends**: messages are created only by explicit confirmation.
- **Migrations are append-only** and applied in numeric order.
- **Never commit secrets**: `.env*` is gitignored; the audit test scans
  tracked files for JWT-shaped strings.

## Docs

- `PROJECT_SPEC.md` — product specification
- `ARCHITECTURE.md` — stack, schema, authorization model
- `AI_DEVELOPMENT_PROMPTS.md` — phased build plan
- `IMPLEMENTATION_STATUS.md` — live checklist, decisions, changelog
- `docs/` — setup, deployment, audits, backup & recovery
