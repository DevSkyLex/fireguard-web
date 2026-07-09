# FireGuard Web — Claude Code Instructions

> **Source of truth.** This file is the entry point for Claude Code. The
> normative rules live in the documents imported below — read them, do not
> paraphrase from memory.

@AGENTS.md
@ARCHITECTURE.md
@PRODUCT.md

## TL;DR for every task

1. **Read before writing.** Open `ARCHITECTURE.md` for any structural decision
   and the touched feature's `FEATURE.md` (parent + nested) before editing it.
2. **Match the existing stack.** Angular 21 standalone + signals
   (`input()`, `computed()`, `signal()`, `linkedSignal()`),
   `ChangeDetectionStrategy.OnPush`, NgRx SignalStore, PrimeNG controls,
   Tailwind v4 utilities, SSR/hydration. Do **not** introduce new dependencies
   or patterns unless the task requires it and no existing pattern fits.
3. **Style with Tailwind + PrimeNG `[pt]` only.** Never edit `src/styles.css`.
   Use literal class strings (Tailwind scans `.ts`/`.html`). The dark variant is
   `html[data-theme="dark"]`.
4. **Strict TypeScript.** Explicit types, `readonly` members, no `any`, no
   non-null assertions. Reuse shared model/presentation types.
5. **Heavy JSDoc, concise prose.** Every class, public/protected member and
   exported function gets `@description`, `@access`, `@since`,
   `@type`/`@param`/`@returns`, and on components
   `@author Valentin FORTIN <contact@valentin-fortin.pro>`. Keep the
   `@description` short — one or two sentences on purpose and any non-obvious
   behavior. Do not over-detail: never narrate the implementation line-by-line or
   restate what the signature and types already say.
6. **Keep `models/` type-only.** Runtime values go to sibling `utils/`,
   `constants/`, `options/`. See `ARCHITECTURE.md` §9 for the two cohesion
   exceptions (presentation registry, const-enum catalog).
7. **Placement = usage locality.** Keep code local to its single consumer; lift
   to feature → `shared/` → `core/` only when a real second consumer appears.
   Stick to the documented feature concerns (`ARCHITECTURE.md` §8.3:
   `data-access/`, `services/`, `access/`, `setup/`, `navigation/`, `http/`,
   `ports/`, `ui/{pages,components,tables,dataviews,forms,dialogs,drawers}`,
   `state/`, `models/`, `utils/`, `constants/`, `options/`, `providers/`); do
   not invent undocumented sibling layers/folders.
8. **Rule of three — don't force DRY.** Do not extract a shared util, helper,
   constant, or abstraction until the **third** real usage appears. Two
   near-duplicates are cheaper left inline than abstracted prematurely; a
   one-line wrapper that is only called once earns nothing but an extra file and
   an indirection. Inline first, extract when a genuine third consumer proves the
   shape. (This tightens rule 7: a _second_ consumer justifies lifting an
   already-shared unit to the lowest common scope, but it does not justify
   _inventing_ a new abstraction — wait for the third.)

## Boundaries (hard rules)

- `core` never imports from `features`. `shared` never imports feature state,
  services, or domain models. Cross-feature imports only through published
  public APIs / ports approved by the relevant `FEATURE.md`.
- Use path aliases across boundaries: `@app`, `@core`, `@shared`, `@layouts`,
  `@features`, `@ports`, `@env`. Relative imports only inside one tight local
  area (one component folder, one state slice).
- Feature API services extend `HydraApiService` (`@core/api`).
  Never build `HttpParams`/`HttpHeaders` manually outside it.
- SignalStore: mutate with `patchState`, async via `rxMethod` + `tapResponse`,
  expose request state from `@core/request-state`. No `rxResource` /
  `httpResource` as the store standard.

## Quality gate — must pass before declaring a task done

Run the narrowest useful check first, widening only as the blast radius grows:

```bash
npm run format        # oxfmt — always run after editing
npm run lint          # oxlint --tsconfig tsconfig.json
npx ng test --watch=false --include="<glob>"   # targeted feature specs
npm run build         # validates strict Angular templates
```

`npm run quality` runs format:check + lint + test:ci + build in one shot.

> ⚠️ Run feature specs with `npx ng test`, **not** bare `npx vitest` — the bare
> runner misses project globals and fails with "describe is not defined".

## After changing code

If a graphify graph exists (`graphify-out/`), run `graphify update .` and prefer
`graphify query` for codebase questions.

## Tooling available (from the monorepo root)

This app no longer ships its own `.claude/`. All Claude Code tooling lives in the
**monorepo-root** `G:\Projets\fireguard\.claude\` and is active when you work from
that root. Web-focused subagents:

- `fg-architecture-reviewer` — review Angular code against this `ARCHITECTURE.md`
  (ownership, dependency direction, type-only `models/`, ports, barrels; read-only).
- `fg-feature-scaffolder` — scaffold a new feature / page / slice per §8.3/§8.4.
- `fg-signal-store` — NgRx SignalStore work per §9.7/§17 and `@core/request-state`.
- `fg-primeng-ui` — PrimeNG tables/dataviews/forms/dialogs/drawers, Tailwind + `[pt]`,
  dark mode; it uses the PrimeNG MCP for real props/events/tokens.
- `fg-a11y-auditor` — static WCAG 2.1 AA + `PRODUCT.md` audit of templates (read-only).
- `fg-web-test-writer` — unit/integration specs by architectural boundary
  (`npx ng test --watch=false`, never bare `vitest`).

Frontend gate and cross-cutting commands also live at the root: `/fg-web-quality`,
`/fg-e2e`, `/fg-contract-check`, `/fg-map`. A PrimeNG MCP server is available — use
it to look up component props, events, theming tokens and examples instead of guessing.
