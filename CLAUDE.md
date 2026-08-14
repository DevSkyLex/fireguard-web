# FireGuard Web — Claude Code Instructions

> **Source of truth.** This file is the entry point for Claude Code. The
> normative rules live in the documents imported below — read them, do not
> paraphrase from memory.

@AGENTS.md

> **Read on demand, deliberately not `@`-imported.** `ARCHITECTURE.md` (152 KB)
> is the normative frontend spec and `PRODUCT.md` (11 KB) the product, brand and
> accessibility frame. Importing them cost ~41 k tokens of context in every
> session, including the ones that never touch a structural or visual decision.
> Open `ARCHITECTURE.md` before any structural decision (rule 1 below) and
> `PRODUCT.md` before any user-facing copy, brand, or visual decision. The
> path-scoped `.claude/rules/*.md` carry the per-file-kind essentials
> automatically.

## TL;DR for every task

1. **Read before writing.** Open `ARCHITECTURE.md` for any structural decision
   and the touched feature's `FEATURE.md` (parent + nested) before editing it.
2. **Match the existing stack.** Read `package.json` for versions — never
   hard-code them here. What it does not state: standalone components with the
   signals API (`input()`, `computed()`, `signal()`, `linkedSignal()`),
   `ChangeDetectionStrategy.OnPush` on **every** component, NgRx SignalStore for
   feature state, Signal Forms for every form, spartan/ui + Tailwind utilities
   for presentation, SSR/hydration throughout. Do **not** introduce new
   dependencies or patterns unless the task requires it and no existing pattern
   fits.
3. **Style with Tailwind utilities and the spartan theme tokens.** `src/styles.css`
   takes theme tokens only — never a component rule.
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
   **Documentation goes in the doc block and nowhere else** — no `//` prose
   between statements, none inside object or array literals (routes, providers,
   `imports:`), no `<!-- -->` rationale in templates. One inline line is allowed
   only where a statement would otherwise read as a mistake. See
   `.claude/rules/comments.md`.
6. **Keep `models/` type-only.** Runtime values go to sibling `utils/`,
   `constants/`, `options/`. See `ARCHITECTURE.md` §10.10 for the two cohesion
   exceptions (presentation registry, const-enum catalog).
7. **Placement = usage locality.** Keep code local to its single consumer; lift
   to feature → `shared/` → `core/` only when a real second consumer appears.
   Stick to the documented feature concerns (`ARCHITECTURE.md` §8.3:
   `data-access/`, `services/`, `access/`, `setup/`, `navigation/`, `http/`,
   `ports/`, `ui/{pages,components,tables,dataviews,forms,dialogs,sheets}`,
   `state/`, `models/`, `utils/`, `constants/`, `options/`, `providers/`); do
   not invent undocumented sibling layers/folders. Naming (file suffixes,
   classes, selectors, tokens, routes) follows `ARCHITECTURE.md` §9.
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
  `@features`, `@env`. Relative imports only inside one tight local
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
npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"   # targeted specs
npm run build         # validates strict Angular templates
```

`npm run quality` runs format:check + lint + test:ci + build in one shot.

> ⚠️ Run feature specs with `npx ng test`, **not** bare `npx vitest` — the bare
> runner misses project globals and fails with "describe is not defined".
>
> ⚠️ `--include` is the **spec-discovery glob**, not a path filter — it must end
> in `*.spec.ts`. A directory glob (`--include="src/app/shared/**"`) makes the
> runner treat every `.html` and `.component.ts` under it as a test entry and
> fails with `No loader is configured for ".html" files`.

## After changing code

If a graphify graph exists (`graphify-out/`), run `graphify update .` and prefer
`graphify query` for codebase questions.

## Tooling — this app ships its own `.claude/`

Open **`fireguard-sso-web/`** as the workspace root to activate it. The agents,
commands, and skills it ships are listed in the session automatically; the guide
to what each one is for is [.claude/README.md](.claude/README.md).

Two things that listing does not tell you:

- **Rules** (`.claude/rules/`) are **path-scoped** — each loads only when you open a
  matching file, and carries the few things that must never be got wrong on that kind
  of file. They are why `ARCHITECTURE.md` no longer needs to be `@`-imported.
- Backend and cross-cutting tooling stays at the monorepo root
  (`G:\Projets\fireguard\.claude\`): `/fg-contract-check`, `/fg-map`, `/fg-api-*`,
  `/fg-migrate`, `/fg-security-review`, plus pure-Bash `/fg-web-quality` and `/fg-e2e`
  wrappers usable from there. This `.claude/` is also packaged as the **`fireguard-web`
  plugin** (manifest `.claude/.claude-plugin/plugin.json`), installed at the monorepo
  root — root sessions load the agents, the commands as `/fireguard-web:fg-…`, the
  skills, and the guard/format hooks. The two **language servers** (TypeScript on
  `.ts`, Angular templates on `.html`) ship as a second, LSP-only plugin —
  `fireguard-web-lsp`, source `.claude/lsp/` — enabled in both scopes, because LSP
  config loads only from an enabled plugin and this one is disabled here. Rules,
  permissions, MCP servers, and
  `settings.local.json` are not plugin components: they still load only when this app is
  the workspace root. The install is a cached copy — after changing anything under
  `.claude/`, bump the plugin `version` and run
  `claude plugin update fireguard-web@fireguard --scope project` from the monorepo root.
