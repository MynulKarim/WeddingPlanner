# Premium Wedding Platform --- AI Development Prompt Pack

Use these prompts sequentially with Codex, Claude Code, OpenCode, or
another capable coding agent.

## Universal Rule

Before every phase:

-   Read `PROJECT_SPEC.md`
-   Read `ARCHITECTURE.md`
-   Read `IMPLEMENTATION_STATUS.md`
-   Inspect the existing repository
-   Preserve working code
-   Implement only the requested phase
-   Test before declaring completion

------------------------------------------------------------------------

# Phase 0

Read the project specification, architecture and implementation status.

Establish the project foundation and architecture.

Do not implement the complete product.

Produce:

-   Architecture
-   Database design
-   Route structure
-   Component structure
-   Service architecture
-   Authorization model
-   Design-token architecture
-   Development roadmap

Ensure the existing project builds successfully.

------------------------------------------------------------------------

# Phase 1

Implement authentication and multi-tenancy.

Build:

-   Registration
-   Login
-   Logout
-   Password reset
-   Protected dashboard
-   User profile
-   Wedding creation
-   Wedding slug
-   Wedding membership
-   Owner/admin architecture
-   PostgreSQL RLS
-   Tenant isolation

Test cross-tenant access attempts.

Do not implement guest management yet.

------------------------------------------------------------------------

# Phase 2

Implement:

-   Unlimited events
-   Event details
-   Guests
-   Households
-   Families/couples
-   Children
-   Plus-one eligibility
-   Guest tags
-   Guest notes
-   Guest language
-   Guest-event assignment
-   Guest search/filtering
-   CSV import/export
-   Guest statistics

Do not implement RSVP yet.

------------------------------------------------------------------------

# Phase 3

Implement the premium design engine.

Build:

-   Design tokens
-   Typography
-   Color system
-   Borders
-   Buttons
-   Cards
-   Animation
-   15+ premium themes
-   Theme customization
-   Invitation builder
-   Live preview
-   Mobile preview
-   Image management
-   Monogram designer

Do not build the complete website yet.

------------------------------------------------------------------------

# Phase 4

Implement the public wedding website builder.

Sections:

-   Hero
-   Invitation
-   Couple
-   Love story
-   Events
-   Schedule
-   Venue
-   Travel
-   Accommodation
-   Menu
-   Dietary
-   FAQ
-   Registry
-   Gallery
-   Guestbook
-   Photo wall
-   Song requests
-   Games
-   Footer

Implement publishing, SEO, social previews and mobile optimization.

------------------------------------------------------------------------

# Phase 5

Implement personalized invitations and RSVP.

Each guest must have a secure invitation token.

Support:

-   Guest-specific events
-   Plus-one permissions
-   Personalized invitation
-   RSVP
-   Event-specific RSVP
-   Dietary requirements
-   Allergies
-   Custom questions
-   RSVP deadline
-   RSVP modification
-   Couple RSVP dashboard

Test token security and event authorization.

------------------------------------------------------------------------

# Phase 6

Implement multilingual support.

Support 32 languages.

Implement:

-   Translation keys
-   Wedding default language
-   Guest language
-   Manual override
-   Localized dates/times/numbers
-   RTL
-   Fallbacks

Ensure the guest's invitation uses the correct language automatically.

------------------------------------------------------------------------

# Phase 7

Implement communications.

Support architecture for:

-   Email
-   SMS
-   Shareable links
-   Print

Templates:

-   Save-the-date
-   Invitation
-   RSVP reminder
-   Event reminder
-   Announcement
-   Thank-you

Do not send real messages in development.

------------------------------------------------------------------------

# Phase 8

Implement:

-   Venue
-   Directions
-   Maps
-   Travel
-   Accommodation
-   Transportation
-   Parking
-   Menu
-   Dietary information
-   FAQ
-   Gift registry

Registry must support:

-   Products
-   Cash
-   Honeymoon funds
-   Experiences
-   Custom gifts

Keep payment providers abstract.

------------------------------------------------------------------------

# Phase 9

Implement:

-   Visual seating planner
-   Tables
-   Capacities
-   Drag-and-drop seating
-   Seating conflicts
-   Seating lookup
-   Place-card data
-   Checklist
-   Budget
-   Vendor tracker
-   CSV/XLSX exports

------------------------------------------------------------------------

# Phase 10

Implement:

-   Digital guestbook
-   Photo uploads
-   Photo moderation
-   Live photo wall
-   Albums
-   Song requests
-   Games
-   Kids zone
-   Welcome video
-   Time capsule
-   Vow keepsake

Protect private media.

------------------------------------------------------------------------

# Phase 11

Implement day-of operations:

-   Staff mode
-   Guest search
-   QR check-in
-   Manual check-in
-   Check-in reversal
-   Seating lookup
-   Dietary information
-   Attendance dashboard
-   Schedule
-   Announcements
-   Live photo wall
-   Vendor contacts

Optimize heavily for phones/tablets.

------------------------------------------------------------------------

# Phase 12

Implement printable:

-   Invitations
-   Save-the-dates
-   Place cards
-   Menus
-   Thank-you cards
-   Seating charts

Use the same wedding data and theme system.

Generate high-quality print-ready PDFs.

------------------------------------------------------------------------

# Phase 13

Prepare for production.

Implement:

-   Analytics
-   Feature entitlements
-   Subscription architecture
-   Payment abstraction
-   Error monitoring
-   Logging
-   Audit logs
-   Health checks
-   Backup strategy
-   Security audit
-   Performance audit

------------------------------------------------------------------------

# Phase 14

Perform a complete final audit.

Test all major user journeys.

Audit:

-   UX
-   Mobile
-   Accessibility
-   Performance
-   Security
-   RLS
-   Data integrity
-   Invitations
-   RSVP
-   Guest management
-   Website publishing
-   Multilingual behavior
-   Seating
-   Day-of
-   Exports
-   PDFs

Fix all critical and high-severity problems.

Do not add unnecessary new features.

------------------------------------------------------------------------

# Reusable Completion Prompt

Before declaring any phase complete:

1.  Inspect changed files.
2.  Check for duplicated logic.
3.  Run type checking.
4.  Run linting.
5.  Run unit tests.
6.  Run integration tests.
7.  Run E2E tests where applicable.
8.  Run production build.
9.  Test the primary user journey.
10. Check mobile responsiveness.
11. Check authorization.
12. Check RLS.
13. Check loading states.
14. Check empty states.
15. Check error states.
16. Check accessibility.
17. Fix discovered problems.
18. Update `IMPLEMENTATION_STATUS.md`.
19. Record important decisions.
20. Report exactly what was tested.

Never claim that something works unless it was actually tested.
