---
target: interface de gestion des interventions
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-07-11T16-43-38Z
slug: src-app-features-interventions
---

# Critique — Interventions management interface (`/organizations/:id/interventions`)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                            |
| --------- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Good skeletons/capped notice/optimistic DnD; no offline/sync indicator despite offline-first promise |
| 2         | Match System / Real World       | 3         | Board cards show `7/28/26` while list rows show `Jul 28, 2026`                                       |
| 3         | User Control and Freedom        | 2         | Create drawer ignores Escape; no undo after board transition; no clear-search in false-empty state   |
| 4         | Consistency and Standards       | 2         | Violet accent vs documented orange; two date formats; inconsistent focus rings (rows vs board cards) |
| 5         | Error Prevention                | 3         | canDrop gating, minDate, dirty-dismiss guard — genuinely good                                        |
| 6         | Recognition Rather Than Recall  | 2         | Icon-only view toggle without tooltips; unlabeled progress ring + priority glyph                     |
| 7         | Flexibility and Efficiency      | 1         | Zero keyboard shortcuts, no bulk actions, no quick status change from list                           |
| 8         | Aesthetic and Minimalist Design | 3         | Clean Linear density, but boxed status groups + watermark pictograms dilute the register             |
| 9         | Error Recovery                  | 2         | List error state renders text only — no Retry button                                                 |
| 10        | Help and Documentation          | 1         | Good inline form hints; nothing explains a silently-rejected board drop                              |
| **Total** |                                 | **22/40** | **Acceptable — significant improvements needed**                                                     |

## Anti-Patterns Verdict

**LLM assessment**: not AI slop — a disciplined Linear-class product UI with real workflow substance (RBAC-gated board drops, optimistic transition + rollback, URL-synced view/search state). The trust-eroders are token/edge-state drift, not invented affordances: the live accent is **violet (`purple.500`) while PRODUCT.md mandates orange as the single brand accent**; every status group is an identical bordered box against the app's own "hierarchy through rhythm, not boxes" principle; two unlabeled indicator glyphs lead every row.

**Deterministic scan**: CLI detector on the interventions `ui/` tree = **0 findings** (clean). In-page detector: 4–8 hits per view, all but one in the app shell (sidebar width transition ×2, body padding transition, org-name truncation — will fire on every page) or expected patterns (kanban nested-cards, single-font informational). The only surface-specific hit: **skipped heading h1→h3 on the calendar view**.

**Visual overlays**: injected successfully on list, board and calendar views (live server, since stopped).

## Overall Impression

Excellent bones — the IA, workflow gating and state discipline are genuinely strong — undermined by a brand-token contradiction (violet vs orange), AA contrast failures on 10.5px meta text, one misleading empty state, and boxed-group monotony. Biggest opportunity: reconcile the accent with the brand and let the list breathe as divider rows.

## What's Working

- **Linear-class list IA**: status-grouped sections in lifecycle order, terminal groups collapsed by default, "+N" label overflow, capped-at-500 notice with refine guidance.
- **Workflow integrity on the board**: `canDropCard` checks legal transitions + RBAC + responsible-agent before allowing a drop; optimistic apply with rollback.
- **Skeletons mirror real row anatomy** instead of generic bars.

## Priority Issues

1. **[P1] False-empty state on filtered search** — searching with no matches shows "No interventions yet / Create your first intervention", a "my data is gone" scare. Fix: branch on the active query — "No results for '…'" + Clear search. _Suggested: $impeccable polish_
2. **[P1] Accent is violet, docs mandate orange** — `fireguard.preset.ts` declares `purple.*` as primary; PRODUCT.md (normative) reserves orange as the single accent (fire-safety association). One-token-ramp fix; verify button-label contrast in light mode. _Suggested: $impeccable colorize_
3. **[P1] Contrast + type-size floor** — at the 14px root, `text-xs` renders 10.5px; light `text-surface-400` meta on white = 2.56:1 (hard AA fail); dark `text-surface-500` = 4.12:1; white New-button label on `#a855f7` = 3.96:1. Fix: bump meta color one step and raise minimum size to ~12px. _Suggested: $impeccable polish_
4. **[P2] Board composition** — columns collapse to content height (no persistent lanes), native scrollbar strands mid-page, rejected drops give zero feedback, dates use `7/28/26` vs list's `Jul 28, 2026`, label dots are color-only. _Suggested: $impeccable layout_
5. **[P2] Mobile ergonomics** — New CTA + view toggle top-strip only (worst thumb zone), rows ~37px (<44px targets), month calendar truncates titles to single letters on 375px. _Suggested: $impeccable adapt_
6. **[P2] Recovery affordances** — error state has no Retry; drawer ignores Escape even pristine; disabled submit at 60% opacity reads enabled. _Suggested: $impeccable harden_

## Persona Red Flags

**Alex (power user)**: no `/`, `c`, or view-switch shortcuts; 22 Tab presses to reach the first row; no bulk actions; status change requires detail page or board drag; icon-only view toggle with no tooltips.

**Sam (accessibility)**: UA-default focus outline on rows vs custom ring on board cards; board label dots color-only; 10.5px meta at 2.56:1; group header is a clickable div whose keyboard path is only the inner chevron.

**Casey (mobile field agent)**: nothing thumb-reachable; ~37px rows; five-column horizontal-scroll board as the only list-adjacent status-change mechanism; **no offline/sync indicator on this page** despite the offline-first product promise.

## Minor Observations

- DESIGN.md's typography table is wrong: claims text-sm≈14px/text-xs≈12px but the 14px root renders 12.25/10.5px.
- Progress ring on each row is redundant encoding — the row already sits under a status header.
- Board "Review" column merges submitted + changes_requested with no per-card distinction.
- `showAbandoned` toggle is not persisted (view + q are).
- Objective radio-cards carry decorative watermark pictograms — borderline vs the "no decorative illustration" anti-reference.
- Seed data ("azdazdzadzad") makes register evaluation harder; realistic fixtures would help.

## Questions to Consider

1. Which is the source of truth — DESIGN.md's orange or the shipped violet preset?
2. What does the per-row progress ring earn that the status grouping doesn't already say?
3. Should the board exist under `sm` at all, or should mobile get list + agenda only?
