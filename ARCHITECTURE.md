# Premium Wedding Platform --- Architecture

## 1. Recommended Stack

### Frontend

-   Next.js
-   TypeScript
-   React
-   Tailwind CSS
-   shadcn/ui where appropriate

### Backend

-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Supabase Storage
-   Supabase Realtime

### Deployment

-   Vercel-compatible deployment
-   Environment variables for secrets

### Recommended external services

Use service abstractions so providers can be replaced:

-   Email: Resend or equivalent
-   SMS: Twilio or regional provider
-   Payments: Stripe or regional provider
-   Analytics: PostHog or equivalent
-   Error monitoring: Sentry or equivalent
-   PDF: Playwright/server-side HTML rendering

Do not hard-code provider-specific business logic into core domain
logic.

------------------------------------------------------------------------

## 2. Architectural Principles

### Multi-tenancy

The wedding is the primary tenant.

Conceptually:

``` text
User
 └── Wedding Membership
      └── Wedding
           ├── Events
           ├── Guests
           ├── Invitations
           ├── Website
           ├── Design
           ├── RSVP
           ├── Seating
           ├── Registry
           ├── Vendors
           └── Planning
```

All wedding-owned data must contain a wedding identifier directly or
through a secure relationship.

### Domain separation

Separate:

-   UI
-   Domain/business logic
-   Database access
-   Authentication
-   Authorization
-   External integrations
-   File/media operations

Do not place database queries throughout presentational components.

------------------------------------------------------------------------

## 3. Suggested Repository Structure

Adapt to the existing project rather than blindly replacing it.

``` text
/
├── app/
│   ├── (auth)/
│   ├── dashboard/
│   ├── wedding/
│   ├── invite/
│   ├── w/
│   └── api/
├── components/
│   ├── ui/
│   ├── wedding/
│   ├── invitation/
│   ├── guests/
│   ├── rsvp/
│   ├── seating/
│   ├── planning/
│   └── day-of/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── security/
│   ├── i18n/
│   ├── themes/
│   ├── media/
│   ├── email/
│   ├── sms/
│   ├── payments/
│   ├── pdf/
│   └── analytics/
├── services/
│   ├── invitations/
│   ├── guests/
│   ├── rsvp/
│   ├── registry/
│   ├── seating/
│   └── communications/
├── types/
├── validations/
├── tests/
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── functions/
├── public/
└── docs/
```

Use the actual framework conventions if the project already has an
established structure.

------------------------------------------------------------------------

## 4. Core Database Model

Initial core tables:

``` text
users
weddings
wedding_members
events
households
guests
guest_events
invitations
rsvps
plus_ones
languages
themes
pages
page_sections
media
monograms
venues
travel_information
menus
dietary_requirements
faqs
registries
seating_tables
seating_assignments
vendors
vendor_payments
budget_items
tasks
messages
reminders
photo_uploads
guestbook_entries
song_requests
games
checkins
thank_you_notes
time_capsules
vows
```

Additional supporting tables may be introduced where normalization or
auditability requires them.

------------------------------------------------------------------------

## 5. Key Relationships

``` text
users
  │
  └──< wedding_members >── weddings
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
        events             guests              pages
          │                   │                    │
          │              households                │
          │                   │                    │
          └── guest_events ───┘                 themes
                              │
                         invitations
                              │
                           rsvps
```

------------------------------------------------------------------------

## 6. Invitation Security Model

Never expose sequential guest IDs in invitation URLs.

Use secure random invitation tokens.

Example concept:

``` text
/invite/<high-entropy-token>
```

The token should resolve to a specific invitation.

The invitation should contain or resolve to:

-   Wedding
-   Guest
-   Household
-   Allowed events
-   Language
-   RSVP state

Do not put sensitive guest data directly into a QR code or URL.

------------------------------------------------------------------------

## 7. Guest Authorization

A guest invitation token should permit only the minimum required
operations:

Allowed:

-   View personalized invitation
-   View allowed events
-   Submit/update RSVP according to rules
-   Submit approved guest engagement content
-   View public wedding information

Not allowed:

-   View other guests
-   View private guest notes
-   Modify seating
-   View budget
-   View vendor information
-   View private wedding settings

------------------------------------------------------------------------

## 8. Couple Authorization

Roles should support:

``` text
Owner
Admin
Planner
Staff
Guest
```

Example:

### Owner

Full wedding access.

### Admin

Almost full access.

### Planner

Planning, guests, vendors, budget, seating.

### Staff

Day-of operations only.

### Guest

Invitation-scoped access.

Use RLS plus application-level authorization checks.

Never rely solely on UI hiding.

------------------------------------------------------------------------

## 9. Website Architecture

The wedding website should be composed from reusable sections.

``` text
Wedding Website
 ├── Hero
 ├── Invitation
 ├── Story
 ├── Events
 ├── Schedule
 ├── Venue
 ├── Travel
 ├── Accommodation
 ├── Menu
 ├── FAQ
 ├── Registry
 ├── Gallery
 ├── Guestbook
 ├── Photo Wall
 ├── Song Requests
 └── Footer
```

Store section configuration as structured data rather than arbitrary
HTML.

------------------------------------------------------------------------

## 10. Theme Architecture

Themes should use design tokens.

Concept:

``` text
Theme
 ├── typography
 ├── colors
 ├── spacing
 ├── borders
 ├── buttons
 ├── cards
 ├── backgrounds
 ├── decoration
 └── animation
```

A wedding stores its selected theme plus customization overrides.

Do not copy entire component trees for each theme.

------------------------------------------------------------------------

## 11. Internationalization

Never hard-code translated strings inside components.

Use:

``` text
translation key
      ↓
locale
      ↓
translated string
```

Support:

-   32 languages
-   Locale-specific dates
-   Locale-specific numbers
-   RTL
-   Wedding default language
-   Guest language
-   Admin language
-   Fallback language

------------------------------------------------------------------------

## 12. Media Architecture

Media must be associated with:

-   Wedding
-   Owner/context
-   Visibility
-   Media type

Possible visibility:

``` text
private
guest-only
approved-public
public
```

Validate:

-   MIME type
-   Extension
-   File size
-   Image dimensions where appropriate

Never trust client-provided MIME type alone.

------------------------------------------------------------------------

## 13. Communication Architecture

Use provider interfaces.

Conceptually:

``` text
CommunicationService
 ├── EmailProvider
 ├── SmsProvider
 └── FutureProvider
```

Business logic should request:

``` text
sendInvitation(...)
```

rather than directly calling Twilio/Resend.

------------------------------------------------------------------------

## 14. Registry Architecture

Separate registry domain logic from payment logic.

``` text
RegistryItem
 ├── product
 ├── cash
 ├── experience
 └── custom
```

Payment provider integration should be an adapter.

------------------------------------------------------------------------

## 15. Printable Documents

Generate documents from structured wedding data.

Do not maintain separate manually edited templates containing duplicate
wedding information.

Pipeline:

``` text
Wedding Data
     ↓
Template
     ↓
Theme Tokens
     ↓
Rendered HTML
     ↓
PDF
```

------------------------------------------------------------------------

## 16. Realtime

Use realtime selectively for:

-   Live photo wall
-   Day-of check-in
-   Guestbook moderation updates
-   Day-of attendance
-   Announcements

Do not make every dashboard element realtime unnecessarily.

------------------------------------------------------------------------

## 17. Performance Strategy

Public wedding websites are high priority.

Prefer:

-   Server rendering
-   Static generation where appropriate
-   CDN caching
-   Optimized images
-   Lazy loading
-   Minimal client components

Dashboard interactions can use client-side data fetching where
appropriate.

------------------------------------------------------------------------

## 18. Testing Strategy

### Unit

Business rules:

-   RSVP eligibility
-   Plus-one rules
-   Event assignment
-   Seating capacity
-   Budget calculations
-   Language fallback

### Integration

-   Authentication
-   RLS
-   Guest/invitation relationships
-   RSVP
-   Media permissions
-   Exports

### E2E

Critical journeys:

1.  Create wedding
2.  Add event
3.  Add guest
4.  Assign guest to event
5.  Create invitation
6.  Guest opens invitation
7.  Guest RSVPs
8.  Couple sees RSVP
9.  Assign seat
10. Check in guest

------------------------------------------------------------------------

## 19. Environment Configuration

Never commit secrets.

Use environment variables for:

-   Supabase
-   Email
-   SMS
-   Payments
-   Analytics
-   Error monitoring
-   Storage
-   PDF services

Maintain a documented `.env.example`.

------------------------------------------------------------------------

## 20. Migration Rules

Every database change must be represented by a migration.

Never manually modify production schema without a migration.

Migrations should be:

-   Versioned
-   Reviewable
-   Re-runnable safely where appropriate
-   Tested

------------------------------------------------------------------------

## 21. Definition of Done

A module is complete only if:

-   Feature implemented
-   Validation implemented
-   Authorization implemented
-   RLS checked
-   Mobile UI checked
-   Loading state exists
-   Empty state exists
-   Error state exists
-   Tests pass
-   Production build succeeds
-   Existing functionality remains intact
