---
target: Members page design
total_score: 27
p0_count: 0
p1_count: 1
timestamp: 2026-06-28T15-27-05Z
slug: eatures-organization-ui-pages-organization-members
---

## Design Health Score — Organization Members page

| #         | Heuristic                      | Score     | Key Issue                                                                                            |
| --------- | ------------------------------ | --------- | ---------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status    | 3         | Skeletons + inline errors solid; most mutations give no success confirmation (only copy-link toasts) |
| 2         | Match System / Real World      | 3         | Plain domain language, but "Add existing member" exposes a raw user UUID                             |
| 3         | User Control and Freedom       | 3         | Drawers + confirms dismissable; role-chip removal is the one action with no escape/undo              |
| 4         | Consistency and Standards      | 3         | Two tables share one vocabulary; only destructive-confirm behaviour is inconsistent                  |
| 5         | Error Prevention               | 3         | Confirms + quota pre-check; role-chip × removes instantly, UUID field invites wrong-user errors      |
| 6         | Recognition Rather Than Recall | 2         | "Add existing member" requires recalling/pasting a teammate UUID — no picker                         |
| 7         | Flexibility and Efficiency     | 2         | No bulk select, no keyboard shortcuts; one-at-a-time member ops                                      |
| 8         | Aesthetic and Minimalist       | 3         | Clean, restrained, detector-clean; mild orange avatar-tint decoration                                |
| 9         | Error Recovery                 | 3         | Load retry + actionable quota dialog; form errors surface as generic banners, not field-level        |
| 10        | Help and Documentation         | 2         | Empty states teach; no hint for the UUID field, no explanation that Resend re-emails                 |
| **Total** |                                | **27/40** | **Acceptable (upper) — solid product foundation, a few real warts**                                  |

## Anti-Patterns Verdict

**Does it look AI-generated? No.** It reads like a real admin tool. Neutral status pills where only the icon carries colour, one consistent table vocabulary across both tables (card → bordered toolbar → striped p-table → skeleton loadingbody → empty state), restrained orange accent on the primary action only, proper skeleton loading (not spinners). It passes the product slop test: a user fluent in Linear/Stripe/Notion would trust it.

**Deterministic scan:** `detect.mjs` over the members page, both tables, the invitation form, the accept page, and the shared `tag` + `empty-state` components returned `[]` (0 findings, exit 0). No gradient text, side-stripe borders, over-rounded cards, glassmorphism, eyebrows, or ghost-card shadow pairings.

**Mild LLM-only tell:** photo-less member avatars render as `bg-primary-100 / text-primary-700` (orange-tinted) circles, spreading the brand accent as decoration — against PRODUCT.md ("orange … reserved for primary actions and active state, never decoration").

## Overall Impression

A clean, disciplined admin surface that does the boring things right: consistent component vocabulary, real loading/empty/error states, neutral badges, confirmation on the dangerous actions. The biggest single opportunity is the **"Add existing member" flow**, which asks a human to type another human's UUID — the one place the interface breaks its own "tool disappears into the task" principle. After that: bulk actions and clearer success feedback.

## What's Working

1. **One vocabulary, two tables.** Members and Pending invitations are visually identical in structure (toolbar, striped rows, skeleton, `<app-tag>`, empty state). Nothing feels stitched together — the Consistency win is real and rare.
2. **Restrained, semantic status badges.** The neutral pill where only the icon carries severity colour (and always paired with a label) is exactly right for a calm operational tool and satisfies "status never by colour alone".
3. **Honest states everywhere.** Skeleton rows (not spinners), teaching empty states, inline load error with Retry, and an _actionable_ quota-exceeded upgrade dialog instead of a dead-end error.

## Priority Issues

- **[P1] "Add existing member" demands a raw user UUID.** The form field is "Existing user ID" — a free-text UUID. No admin knows a teammate's UUID; this is recognition-rather-than-recall and jargon in one. **Fix:** replace with a searchable user picker (autocomplete over eligible org users), or drop the action since invite-by-email already covers onboarding. **Command:** `$impeccable shape` (the picker is a build) → `$impeccable clarify` (field label/help interim).
- **[P2] Role-chip removal is the one destructive action with no confirmation.** Member removal and invitation revoke both open a confirm dialog; clicking the × on a role chip fires the removal immediately with no confirm and no undo. Inconsistent and easy to trigger by accident. **Fix:** confirm role removal too (or offer undo). **Command:** `$impeccable harden`.
- **[P2] Most mutations confirm nothing.** Invite, add, assign-role, resend, and revoke close the drawer or mutate a row but emit no success toast; only "copy link" does. After "Resend" the admin gets no signal the email actually went out. **Fix:** a success toast per mutation via the existing store-driven toast system. **Command:** `$impeccable harden`.
- **[P2] No bulk actions.** Offboarding several people or assigning one role to many is strictly one-at-a-time; the tables have no multi-select. **Fix:** row selection + bulk remove / bulk assign-role in the toolbar. **Command:** `$impeccable shape`.
- **[P3] Orange avatar fallbacks spread the accent as decoration.** Photo-less members get `bg-primary-100 / text-primary-700` circles. **Fix:** neutral surface tint for avatar fallbacks; keep orange for the Invite action and active nav only. **Command:** `$impeccable colorize`.

## Persona Red Flags

**Alex (power user):** No multi-select to bulk-remove or bulk-assign. No keyboard shortcuts. Member search matches name only — searching by email returns nothing. "Add member" makes even a power user go hunt for a UUID.

**Sam (accessibility):** Good — status is icon+label (not colour-alone), ellipsis buttons carry `ariaLabel`, the actions column header is `sr-only`. Watch: role-chip remove (×) keyboard operability, `p-avatar` image alt text, and `text-surface-500` date/description text sitting near the 4.5:1 floor.

**Morgan (FireGuard org admin — project persona):** Lives in invite-by-email, which is smooth. Hits a wall on "Add existing member" (UUID). After resending an invitation, sees no confirmation and wonders if it worked. Can't tell from the pending table who originally sent an invite.

## Minor Observations

- "Expires" shows an absolute date; a relative "in 3 days" scans better when deciding whether to resend.
- No page-level header/subtitle — the surface relies on the shell nav for "Members" identity. Acceptable (Linear does this), but a one-line header would anchor it.
- `text-surface-500` on date and empty-state description text is near the AA floor; verify ≥4.5:1 and nudge toward surface-600 if close.
- Member search filters name only, not email.
- Two stacked identical cards is fine, but per PRODUCT principle #3 ("hierarchy through rhythm, not boxes") pending invitations could be a quieter sub-section rather than a second equal card.

## Questions to Consider

- Does "Add existing member" need to exist at all if invite-by-email covers onboarding — or should it become a user search?
- Should pending invitations read as a secondary, lighter section under the members table rather than a co-equal card?
- For an org with 50+ members, where does the absence of bulk actions and email search start to hurt?
