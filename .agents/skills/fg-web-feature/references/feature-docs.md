# FEATURE.md

`ARCHITECTURE.md` **§14.2** defines the contract; **§14.3** makes it enforceable: _"A deviation that is not recorded (in this document or the owning `FEATURE.md`) is a defect, not an exception."_

## Who needs one

- **every** top-level feature under `src/app/features/`,
- a **nested** subfeature when it owns routes, state, services, or workflow decisions.

`core/README.md` plays the same role for the core boundary, and a layout with a published slot system documents it in its own `README.md`. `shared/` has no such document yet — if you add one, it inventories the shared concepts and follows the same rules as this file.

## The four update triggers — mandatory, same change

A `FEATURE.md` **must** be updated in the change that:

1. adds or moves a **route entry point**,
2. **publishes or retires** a port or public API,
3. adds an **approved cross-feature dependency**,
4. changes an **invariant** reviewers must preserve.

"I'll update the doc after" is how §14.3 gets violated. The reviewer checklist (§17) checks for it.

## Canonical headings

```markdown
# <Name> Feature

## Purpose

What this feature owns, as a short list. Then one sentence on what it explicitly
does NOT own — the boundary is as load-bearing as the ownership.

## Entry Points

- Routes: `<feature>.routes.ts`
- Public API: `index.ts` — <what, and why it is narrow> / or "none" with the reason
- Root provider: `provide<Feature>Feature()` (when it exists)

## Routes

The URL list, plus any resolver/guard behaviour a reader needs.

## State and Data Access

Primary stores: · Primary services: · Access helpers:

## Published Contracts

Only when the feature publishes ports.

## Cross-Feature Dependencies

What it depends on, what may depend on it, and what must NOT be absorbed.

## Invariants

The rules a reviewer must preserve. This is the section that earns the file.
```

Optional domain sections are fine where they carry weight (`## Routing and SSR Notes`, `## Deletion`, `## Offline`, `## Permissions`). Add them when there is a real caveat, not for symmetry.

## Keep it normative, not a catalog

§14.2: _"must stay short — a few screens, not a file catalog"_ and _"must not duplicate the implementation line-by-line."_

The test: if a line would still be true after someone renames a file, it belongs. If it merely restates what the folder tree already shows, delete it.

## Write "none" explicitly

When a feature has no public API, say so and say why:

```markdown
- Public API: none. The feature root barrel was removed — it `export *`-ed
  `state`, `models` and `data-access` and had no external consumer.
```

A missing line reads as an oversight; an explicit "none" with the reason is a decision the next reader can trust. Four features in this codebase carry exactly that line.

## Record the reason, not just the fact

The sections that age well explain _why_. Two real examples worth imitating:

- `equipments/FEATURE.md` records that `index.ts` was narrowed to `EQUIPMENT_TYPE_OPTIONS` because it is the only symbol any external consumer imports — so the next person widening it knows they are reversing a decision, not filling a gap.
- `equipments/FEATURE.md` also documents why the canonical `remove()` path is deliberately **not** wired to a second detail-page action: the backend outcome is identical to the existing Decommission button, and shipping two buttons with one outcome would be worse. Without that paragraph, the missing button reads as a bug.

## Approved exceptions live here

§1.3: approved exceptions to `ARCHITECTURE.md` are recorded in the owning `FEATURE.md`. If your change deviates from the architecture for a real reason, the exception and its justification go in `## Invariants` — not in a code comment, where no reviewer will find it.
