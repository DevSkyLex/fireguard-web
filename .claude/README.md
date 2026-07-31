# FireGuard Web — Claude Code tooling

This app ships its own `.claude/`. Open **`fireguard-sso-web/`** as the workspace root to
activate it: 12 agents, 12 commands, 7 skills, 8 rules, 4 MCP servers, and 2 hooks.

> **This directory is also a plugin.** From the monorepo root,
> `claude --plugin-dir ./fireguard-sso-web/.claude` loads the 12 agents and the commands
> namespaced as `/fireguard-web:fg-component` and friends (~3 926 tokens per session,
> measured with `claude plugin details`). It carries neither `.mcp.json` — a plugin reads
> it from the plugin root, standalone needs it at the app root — nor `rules/`, which is not
> a plugin component. Opening this directory as the workspace root remains the only way to
> get everything. The manifest is `.claude-plugin/plugin.json`; plugin-mode hook wiring is
> `hooks/hooks.json`. Nothing is duplicated between the two modes.

Backend and cross-cutting tooling stays at the monorepo root (`G:\Projets\fireguard\.claude\`) —
`/fg-api-module`, `/fg-api-quality`, `/fg-migrate`, `/fg-security-review`, `/fg-contract-check`,
`/fg-map`. Nothing is duplicated between the two.

## Agents

**Builders — they create code.** One per kind of unit; each decides _placement_ before writing.

| Agent                  | Creates                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `fg-component-builder` | components, pages, tables, dataviews, forms, dialogs, drawers                    |
| `fg-directive-builder` | directives — behavioral (SSR-safe) or template-marker with a typed context guard |
| `fg-pipe-builder`      | pipes — **and** the `ARCHITECTURE.md` edits the first one requires               |
| `fg-feature-builder`   | a feature or subfeature: routes, concerns, wiring, `FEATURE.md`                  |
| `fg-service-builder`   | transport / behavioral / access services and pure data adapters                  |
| `fg-utils-builder`     | pure helpers, constants, option sets                                             |

**Specialists — they enrich or judge.** Called after a builder, or on existing code.

| Agent                      | Does                                                            | Writes?       |
| -------------------------- | --------------------------------------------------------------- | ------------- |
| `fg-primeng-ui`            | rich PrimeNG markup, Tailwind + `[pt]`, dark-mode parity        | yes           |
| `fg-signal-store`          | SignalStore slices: CallState, rxMethod, events, scoping        | yes           |
| `fg-web-test-writer`       | unit and integration specs at the right boundary                | yes           |
| `fg-e2e-runner`            | Playwright suite, browser reproduction, visual proof            | yes           |
| `fg-architecture-reviewer` | ownership, dependency direction, barrels, `FEATURE.md` currency | **read-only** |
| `fg-a11y-auditor`          | static WCAG 2.1 AA + `PRODUCT.md` audit                         | **read-only** |

Create ≠ enrich ≠ review. A builder that ships a finished store, a populated table, or a
spec suite has taken a specialist's job; each one is told to hand those off by name.

## Commands

| Builders        | Specialists       | Gate          |
| --------------- | ----------------- | ------------- |
| `/fg-component` | `/fg-primeng`     | `/fg-quality` |
| `/fg-directive` | `/fg-store`       |               |
| `/fg-pipe`      | `/fg-arch-review` |               |
| `/fg-feature`   | `/fg-a11y`        |               |
| `/fg-service`   | `/fg-e2e`         |               |
| `/fg-util`      |                   |               |

`/fg-quality` is pure Bash — no agent. It runs format → lint → tests → build, stops at the
first failure, and **normalizes its glob argument to end in `*.spec.ts`** (see the trap below).

## Skills

Reference material agents load on demand. Each one carries the **operational** content —
commands, harnesses, decision tables, exemplar paths — and cites `ARCHITECTURE.md` by section
for the _rule_. That split is deliberate: `ARCHITECTURE.md` is normative (§1.3), and a skill
that restated its rules would become a second source of truth that drifts.

| Skill                 | Answers                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `fireguard-naming`    | which suffix, folder, class name, selector — plus the 5 transitional deviations not to copy |
| `signalstore-recipes` | CallState vs withQueryState vs withEntities, templates, events, scoping, TransferState      |
| `primeng-styling`     | Tailwind + `[pt]`, preset-first, dark mode, and whether a shared wrapper earns its place    |
| `hydra-data-access`   | the `HydraApiService` contract, the envelope, DTOs, the error flow, adapters                |
| `web-testing`         | the `--include` trap, the boundary each unit owns, the standard harnesses                   |
| `e2e-playwright`      | `ApiMock`, page objects, port 4273, the `id`/`data-testid` hooks                            |
| `feature-md`          | the canonical headings and the four update triggers                                         |

## Rules (`rules/`)

Path-scoped instructions. Unlike a skill, a rule loads **automatically** whenever Claude reads a
file matching its `paths:` glob — so it carries the few things that must never be got wrong on
that kind of file, not the how-to.

| Rule                  | Loads when you touch                       | Carries                                                                               |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `components.md`       | `*.component.ts` / `.html`                 | no `Component` suffix, selector = folder name, `OnPush`, only a page injects a store  |
| `directives-pipes.md` | `*.directive.ts` / `*.pipe.ts`             | the **opposite** suffix rule, `[appCamelCase]`, SSR guards, `ngTemplateContextGuard`  |
| `state.md`            | `state/**`                                 | `patchState` only, `rxMethod` + `tapResponse`, `toStoreError` before `errorCallState` |
| `data-access.md`      | `data-access/**`                           | extends `HydraApiService`, never `catch`/`map`, unprefixed Hydra keys                 |
| `models-utils.md`     | `models/` `utils/` `constants/` `options/` | type-only `models/`, folder-per-util, no type in `utils/`                             |
| `barrels.md`          | `**/index.ts`                              | never `export *`, narrow by default, which folders get none                           |
| `testing.md`          | `*.spec.ts`                                | the boundary each unit owns, the harnesses, the `--include` trap                      |
| `e2e.md`              | `e2e/**`                                   | `ApiMock`, port 4273, locate by `id`/`data-testid`, local-noon fixtures               |

> `directives-pipes.md` has one deliberately unmatched pattern — `*.pipe.ts`. There are **zero
> pipes** in this codebase; the rule exists to cadre the first one, including the
> `ARCHITECTURE.md` edit it must carry.

**Why this matters here:** `CLAUDE.md` `@`-imports `ARCHITECTURE.md`, which is **133 KB** and
loads in full at every session start (152 KB in total with `AGENTS.md` and `PRODUCT.md`).
Path-scoped rules are the documented way to cut that: instructions arrive only when Claude
opens a matching file.

## MCP servers (`../.mcp.json`)

| Server       | Command                        | Tools | Note                                                                                                                                                  |
| ------------ | ------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `angular`    | `npx ng mcp --read-only`       | 6     | uses the **local** CLI (21.2.19) — always version-matched, no download. `--read-only` drops `build`/`test`/`run_target`, already covered by `npm run` |
| `primeng`    | `npx -y @primeng/mcp@22`       | 8     | see the skew note below                                                                                                                               |
| `playwright` | `npx -y @playwright/mcp`       | 24    | the heaviest; scoped to `fg-e2e-runner` via its `tools:` list                                                                                         |
| `context7`   | `npx -y @upstash/context7-mcp` | 2     | NgRx, Tailwind, CDK — what the other two do not cover                                                                                                 |

**40 tools total**, well under the ~80 ceiling where models start ignoring tools.

> **PrimeNG version skew — know this.** The MCP serves **PrimeNG 22** docs; this project runs
> **PrimeNG 21.1.9**. Pinning the MCP to its matching v21 line is **not** an option: `@primeng/mcp@21.1.9`
> crashes on startup against the current MCP SDK (`get_migration_guide expected a Zod schema`).
> So: the MCP is authoritative for _usage semantics_, and `node_modules/primeng` on disk is
> authoritative for _what exists here_. Grep the installed package before trusting an unfamiliar prop.

## Hooks

**`hooks/guard.mjs`** — PreToolUse on `Write|Edit`. Blocks:

- `.env*` (except `.env.example` / `.env.dist`),
- generated trees: `node_modules/` `dist/` `.angular/` `test-results/` `playwright-report/`,
- **`src/styles.css`** — style via Tailwind + `[pt]`, theme-wide changes via the preset,
- runtime code inside a `models/` folder, except the sanctioned `<concept>-tag/` resolver,
- **`export * from`** written into a barrel under `src/` — barrels take explicit named re-exports (§13.3).

**`hooks/format.mjs`** — PostToolUse on `Write|Edit`. Runs `oxfmt` on the edited
`.ts` `.html` `.css` `.scss` `.json` `.mjs` `.js` `.md`.

> `.md` is in that list deliberately: `.oxfmtrc.json` carries a markdown override and
> `format:check` walks the whole tree, so an unformatted `FEATURE.md` fails the gate —
> and §14.3 requires agents to update those docs in the same change.

`ARCHITECTURE.md` and `FEATURE.md` stay writable on purpose — §14.3 requires agents to update
them in the same change.

The monorepo-root guard carries the same frontend rules with a `/fireguard-sso-web/` path prefix,
for sessions opened one level up. **Keep the two in sync when a rule changes.** A relative
`../.claude/hooks/` path was rejected: it breaks the moment the cwd changes.

## Dev servers (`launch.json`)

| Config              | Port     | What                                                                        |
| ------------------- | -------- | --------------------------------------------------------------------------- |
| `fireguard-web`     | 4200     | `ng serve` — the normal dev server                                          |
| `fireguard-web-e2e` | **4273** | `ng serve --configuration=e2e`, SSR-off — matches `playwright.config.ts:11` |

> The monorepo root defines a config with the **same name** `fireguard-web` on port **4300**.
> They are never active together (different workspace roots), but if a preview lands on an
> unexpected port, that name collision is why.

## The `--include` trap

```bash
npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"
```

`--include` is the **spec-discovery glob**, not a path filter — it must end in `*.spec.ts`.
A directory glob makes the runner treat every `.html` as a test entry and fail with
`No loader is configured for ".html" files`. That error means the glob is wrong, not the code.

Never run bare `npx vitest` — it misses the project globals and dies with `describe is not defined`.
