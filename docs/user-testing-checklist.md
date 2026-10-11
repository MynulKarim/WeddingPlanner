# Ever After — User Testing Checklist

**Purpose:** end-to-end testing of the wedding platform on the free hosted
environment before commercial launch. Work through each section in order —
later sections build on earlier ones.

**Test site:** `<paste Vercel URL here>`
**Test window:** `<start date>` → `<end date>`
**How to report:** for every issue, send (1) what you clicked, (2) what you
expected, (3) what happened instead, (4) a screenshot, (5) your device +
browser (e.g. "Android + Chrome", "iPhone + Safari", "Windows + Edge").

> **Testers, please read first:** invitation/RSVP-reminder *emails and SMS
> are disabled* in this environment — nothing is actually sent. Wherever a
> step says "send", copy the **shareable link** from the dashboard instead
> and open it in a private/incognito window to act as the guest. PDF
> downloads are replaced by **Print via preview** on this host (by design).
> Scheduled messages go out **once daily**, so use the **"Deliver due now"**
> button when testing reminders.

---

## Part A — The couple (dashboard, desktop or tablet)

### A1. Account & wedding setup

- [ ] Register a new account (email + password, 8+ characters).
- [ ] Verify the email, then sign in.
- [ ] Create a wedding: title, URL slug (lowercase + hyphens), timezone.
- [ ] Open the wedding hub — all 16 section cards load (Events … Settings).
- [ ] Invite a second tester as **planner** via Team (email + role).
- [ ] Second tester registers/signs in with that email → gets access
      automatically (pending invite disappears from the hub).
- [ ] Try opening another wedding's URL while signed in → access denied.

### A2. Events

- [ ] Add 3+ events (e.g. Ceremony, Reception, After Party) with date, time,
      venue, address, dress code, description.
- [ ] Mark one event RSVP-required and one invite-only/hidden as needed.
- [ ] Edit an event (change time/venue) and confirm the public site updates.

### A3. Guests & households

- [ ] Create a household (e.g. "The Rahman Family").
- [ ] Add guests: an individual, a couple, a family with a child (child
      flag), and one guest with plus-one allowed.
- [ ] Tag a guest (e.g. VIP), add a private note, set a non-English
      language for one guest.
- [ ] Assign different guests to different events.
- [ ] Search and filter the guest list; check the guest statistics.
- [ ] Import 2–3 guests via CSV; export guests to CSV/XLSX and open the file.

### A4. Design & invitation builder

- [ ] Pick a theme (try 2–3), customize a color/font, persist across reload.
- [ ] Toggle light/dark mode — every page should remain readable.
- [ ] Design the monogram (initials + style + shape) and confirm it appears
      on the invitation preview and the website hero.
- [ ] Reorder website sections and disable one; preview updates.
- [ ] Upload a cover photo (and a short video if available).

### A5. Website & publishing

- [ ] Fill in story, venue/travel/accommodation, menu, FAQ, registry note.
- [ ] Open the dashboard **Preview** — it shows live content (guestbook
      entries, songs, games, welcome video), not empty placeholders.
- [ ] **Publish** the site → open `/w/<slug>` in an incognito window.
- [ ] Confirm the disabled section is hidden and everything is mobile-sized.
- [ ] Unpublish → public URL shows nothing; re-publish.

### A6. Invitations & RSVP (couple side)

- [ ] Generate invitation links for 2 guests (different events/language).
- [ ] Open guest A's link in incognito → only A's events show, in A's
      language. Editing the URL must **never** reveal guest B.
- [ ] RSVP dashboard shows responses and statistics after guests reply.

### A7. Messages

- [ ] Compose a save-the-date and an invitation (preview first, confirm
      checkbox, then schedule/send).
- [ ] Schedule an RSVP reminder for 5 minutes out → **Deliver due now**.
- [ ] Check delivery history (status, sent time, errors), cancel a
      scheduled message, retry a failed one.

### A8. Registry

- [ ] Add a physical gift (quantity 2), a cash fund, and an experience.
- [ ] Publish → claim one unit as a guest (incognito) → totals update.
- [ ] Have two testers claim the last unit **at the same time** → exactly
      one succeeds; the other sees "fully claimed"; total never exceeds 2.

### A9. Seating, budget, vendors, checklist

- [ ] Create tables with capacities; drag guests onto seats.
- [ ] Confirm over-capacity warning, unassigned list, and seating lookup.
- [ ] Seed the **starter budget** from the wedding date; add one expense.
- [ ] Add a vendor with cost; record 2 installment payments → paid total
      and status update; export vendors + payments.
- [ ] Generate the starter checklist from the wedding date; move a task to
      done.

### A10. Guest engagement (moderation)

- [ ] As a guest (incognito): sign the guestbook, request a song, upload a
      photo, answer a quiz question, seal a time-capsule note.
- [ ] As the couple: approve/reject each from **Engage**; approved items
      appear publicly, rejected ones never do.
- [ ] Add a quiz game with 2 questions (one with a correct answer) →
      guests can vote and see live results.
- [ ] Hide a game (Show/Hide toggle) → it disappears from the public site.

### A11. Stationery & exports

- [ ] Preview invitation, save-the-date, place cards, menu, thank-you card,
      seating chart (HTML preview + browser print).
- [ ] Export RSVP, seating, dietary, budget, tasks (CSV and full XLSX).

---

## Part B — The guest (phone, incognito/private window)

- [ ] Open your personal invitation link → names, events, and language are
      yours (try `?lang=bn` / `?lang=ar` on the website URL too).
- [ ] RSVP **attending** to one event and **declined** to another; add a
      plus-one name where allowed; record dietary needs + an allergy.
- [ ] Change your RSVP afterwards (before the deadline).
- [ ] Try RSVP **after** the couple sets a past deadline → blocked politely.
- [ ] Registry: reserve a gift and contribute to a fund.
- [ ] Guestbook, song request, photo upload, quiz vote, capsule note.
- [ ] Everything readable with one thumb, no horizontal scrolling, buttons
      big enough to tap.

---

## Part C — Day-of staff (tablet or phone)

- [ ] Staff member signs in and opens **Day-of**.
- [ ] Search a guest by name → check them in → attendance counter moves.
- [ ] Check in the same guest twice → no duplicate, no error.
- [ ] Undo a check-in → counter moves back.
- [ ] Scan a guest's QR code from their invitation to check in.
- [ ] Look up seating + dietary flags for a guest at the door.
- [ ] Post an announcement; confirm it shows on the staff board.
- [ ] Open the vendor contacts list and the event schedule.

---

## Part D — Cross-cutting (everyone)

- [ ] Switch the website language (footer switcher): dates, numbers, and
      labels localize; try an RTL language (Arabic/Hebrew) — layout mirrors.
- [ ] Keyboard-only pass on RSVP form: Tab reaches every field, Enter votes.
- [ ] Reload mid-flow (RSVP half-filled, dashboard forms) — no data loss
      worse than retyping the current field.
- [ ] Note any page that takes longer than ~3 seconds on mobile data.

---

## Appendix — please do NOT report these (known test-env limits)

- No real emails/SMS arrive (providers unwired) — use shareable links.
- "Download PDF" is replaced by "Print via preview" on this host.
- Scheduled messages dispatch once daily, not instantly.
- Two testers clicking the exact same millisecond may see last-write-win on
  RSVP edits (by design at this scale).
- Dashboard pages beyond the hub are English-only; guest surfaces are fully
  translated.
