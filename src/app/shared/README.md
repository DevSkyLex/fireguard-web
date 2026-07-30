# `shared/` — generic, domain-agnostic concepts

`shared` hosts the app's generic building blocks: UI primitives, collection
surfaces, directives, validators, and pure utilities that carry **no business
knowledge**. It is not a fallback folder — anything that names a business
concept belongs to its owning feature.

Normative rules: `ARCHITECTURE.md` §8.5 (this boundary), §10.2 (folder
template), §6.4 (domain-agnosticism test), §2.8 (usage locality).

## Layout — concept-first

One self-contained folder per concept, exactly like `core/<concern>/`. No
type-first buckets (`components/`, `utils/`, `models/`, …). A small concept
stays flat; a large one grows the optional sub-buckets of the canonical
template (`components/`, `models/`, `options/`, `constants/`, `utils/`,
`testing/`).

| Concept                         | What it is                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `board/`                        | generic drag-and-drop kanban (`Board<T>`)                                        |
| `calendar/`                     | month/week/agenda calendar with category sidebar                                 |
| `empty-state/` · `error-state/` | icon + title + description placeholders                                          |
| `infinite-scroll/`              | infinite-scroll attribute directive                                              |
| `initials/`                     | `deriveInitials` pure helper                                                     |
| `logo/`                         | brand mark                                                                       |
| `match-fields/`                 | cross-field equality validator + error key                                       |
| `nav-row/`                      | sidebar navigation row                                                           |
| `splash-screen/`                | boot overlay (consumes `SPLASH_SCREEN_PORT`)                                     |
| `table-card-shell/`             | card-shell design tokens for feature `p-table` grids                             |
| `tag/`                          | `TagDescriptor` / `TagOption` contracts for feature tag registries (types only)  |
| `tag-severity/`                 | severity vocabulary + severity→class helpers                                     |
| `theme-switcher/`               | light/dark toggle (consumes `THEME_PORT`)                                        |
| `toast/`                        | app-wide toast outlet                                                            |
| `testing/`                      | cross-cutting test doubles (`match-media.mock.ts`) — the one sanctioned grouping |

## Public API

Import a concept through its barrel, and only through it:
`@shared/tag`, `@shared/calendar`, `@shared/empty-state`, `@shared/testing`, …
There is **no root `@shared` barrel** and no aggregate kind barrel. Deep imports
into a concept's implementation files are forbidden. Cross-concept imports
inside `shared` also go through the sibling's barrel (mirrors `core → core`).

## Dependency rules

Allowed: other `shared` concepts (via barrels), Angular/PrimeNG/framework code,
and **owner-published ports** (`THEME_PORT`, `SPLASH_SCREEN_PORT`).

Forbidden: feature state/services/models/UI, concrete `core` services, layout
imports, transport-shaped code (RFC 7807 helpers and query-param mapping live
in `core/api`), slot-contribution providers (the owning layout or feature keeps
those).

## Prefer PrimeNG over a wrapper

A concept that exists only so call sites avoid repeating PrimeNG markup does not
belong here: use the PrimeNG component directly and accept the duplication. Every
concept above that wraps PrimeNG does so for a reason PrimeNG cannot cover —

- a **capability gap**: `board` needs a per-drop validation predicate that
  `pDraggable` has no hook for; `calendar` has no scheduler equivalent in
  PrimeNG 21; `toast` stacks its deck with `:nth-last-child()` selectors that
  `[pt]` cannot express;
- a **rendering shape PrimeNG has no component for**: `empty-state` and
  `error-state` are centred blocks, not the inline banner `p-message` renders;
- an **accessibility pattern PrimeNG gets wrong for the context**: `nav-row` must
  not be the `role="menu"` that `p-menu` / `p-panelmenu` render, which is a
  transient-menu pattern rather than primary navigation.

Style through the design-token preset in `core/primeng/presets/`, not by
re-skinning a component with `[pt]` at each call site. Reserve `[pt]` for
structural adjustments (`table-card-shell` makes an inner `p-table` scroll) and
for ARIA that PrimeNG omits.

## Promotion into `shared`

Move a unit here only when all of the following hold:

1. it is domain-agnostic per §6.4 (no feature imports, primitive/generic inputs),
2. PrimeNG cannot already do the job (see above),
3. its consumers are not all inside one feature subtree — a generic component
   used only by one feature belongs to that feature (§2.8),
4. for UI: it is generic **by design** (may precede its second consumer);
   for `utils`/`constants`/`options`: several features already consume it (§2.8),
5. it gets its own concept folder with an `index.ts` barrel,
6. its specs live in `testing/` folders next to their subjects.
