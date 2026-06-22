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
5. **Heavy JSDoc.** Every class, public/protected member and exported function
   gets `@description`, `@access`, `@since`, `@type`/`@param`/`@returns`, and on
   components `@author Valentin FORTIN <contact@valentin-fortin.pro>`.
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

## Boundaries (hard rules)

- `core` never imports from `features`. `shared` never imports feature state,
  services, or domain models. Cross-feature imports only through published
  public APIs / ports approved by the relevant `FEATURE.md`.
- Use path aliases across boundaries: `@app`, `@core`, `@shared`, `@layouts`,
  `@features`, `@ports`, `@env`. Relative imports only inside one tight local
  area (one component folder, one state slice).
- Feature API services extend `HydraApiService` (`@core/services/hydra-api`).
  Never build `HttpParams`/`HttpHeaders` manually outside it.
- SignalStore: mutate with `patchState`, async via `rxMethod` + `tapResponse`,
  expose request state from `@core/state/request-state`. No `rxResource` /
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

## Tooling available in this repo

- `.claude/commands/` — slash commands: `/fg-quality`, `/fg-feature`,
  `/fg-component`, `/fg-store`, `/fg-arch-review`, `/fg-primeng`.
- `.claude/agents/` — subagents: `fg-architecture-reviewer`, `fg-feature-scaffolder`,
  `fg-primeng-ui`.
- `.claude/output-styles/fireguard.md` — concise, architecture-aware response style.
- A PrimeNG MCP server is configured (`.vscode/mcp.json`) — use it to look up
  component props, events, theming tokens and examples instead of guessing.
