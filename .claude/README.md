# FireGuard Web — Claude Code tooling

This app ships its own `.claude/`. Open **`fireguard-sso-web/`** as the workspace root to
activate it: 12 agents, 13 commands, 8 skills, 9 rules, 4 MCP servers, and 2 project hooks
(plus 2 local impeccable hooks in the git-ignored `settings.local.json`).

> **This directory is also a plugin.** The monorepo root installs it as
> `fireguard-web@fireguard` (project scope, via the root `.claude-plugin/marketplace.json`),
> so root sessions load the 12 agents, the commands namespaced as `/fireguard-web:fg-store`
> and friends, the skills, and the guard/format hooks. MCP servers, `rules/`, permissions,
> and `settings.local.json` are not plugin components — opening this directory as the
> workspace root remains the only way to get everything. The manifest is
> `.claude-plugin/plugin.json`; plugin-mode hook wiring is `hooks/hooks.json`. The install
> is a **cached copy**: after changing tooling here, bump `version` in
> `.claude-plugin/plugin.json` and run
> `claude plugin update fireguard-web@fireguard --scope project` from the monorepo root.

Backend and cross-cutting tooling stays at the monorepo root (`G:\Projets\fireguard\.claude\`) —
`/fg-api-module`, `/fg-api-quality`, `/fg-migrate`, `/fg-security-review`, `/fg-contract-check`,
`/fg-map`. Nothing is duplicated between the two.

## Agents

**Builders — they create code.** One per kind of unit; each decides _placement_ before writing.

| Agent                  | Creates                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `fg-component-builder` | components, pages, tables, dataviews, forms, dialogs, sheets                     |
| `fg-directive-builder` | directives — behavioral (SSR-safe) or template-marker with a typed context guard |
| `fg-pipe-builder`      | pipes — **and** the `ARCHITECTURE.md` edits the first one requires               |
| `fg-feature-builder`   | a feature or subfeature: routes, concerns, wiring, `FEATURE.md`                  |
| `fg-service-builder`   | transport / behavioral / access services and pure data adapters                  |
| `fg-utils-builder`     | pure helpers, constants, option sets                                             |

**Specialists — they enrich or judge.** Called after a builder, or on existing code.

| Agent                      | Does                                                            | Writes?       |
| -------------------------- | --------------------------------------------------------------- | ------------- |
| `fg-spartan-ui`            | spartan/ui surfaces, Tailwind + theme tokens, dark-mode parity  | yes           |
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
| `/fg-component` | `/fg-spartan`     | `/fg-quality` |
| `/fg-directive` | `/fg-store`       |               |
| `/fg-pipe`      | `/fg-test`        |               |
| `/fg-feature`   | `/fg-arch-review` |               |
| `/fg-service`   | `/fg-a11y`        |               |
| `/fg-util`      | `/fg-e2e`         |               |

A command is **pure delegation**: it names the subagent, passes `$ARGUMENTS`, and states what
the report must contain. The rules live in the agent alone — restating them in the command is
what made earlier copies drift.

`/fg-quality` is pure Bash — no agent. It runs format → lint → tests → build, stops at the
first failure, and **normalizes its glob argument to end in `*.spec.ts`** (see the trap below).

## Skills

Reference material agents load on demand. Each one carries the **operational** content —
commands, harnesses, decision tables, exemplar paths — and cites `ARCHITECTURE.md` by section
for the _rule_. That split is deliberate: `ARCHITECTURE.md` is normative (§1.3), and a skill
that restated its rules would become a second source of truth that drifts.

| Skill                 | Answers                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `fireguard-naming`    | which suffix, folder, class name, selector — plus the 4 transitional deviations not to copy |
| `signalstore-recipes` | CallState vs withQueryState vs withEntities, templates, events, scoping, TransferState      |
| `spartan-ui`          | the catalog-first rule, where helm lives, adding a component, theme tokens, dark mode       |
| `hydra-data-access`   | the `HydraApiService` contract, the envelope, DTOs, the error flow, adapters                |
| `web-testing`         | the `--include` trap, the boundary each unit owns, the standard harnesses                   |
| `e2e-playwright`      | `ApiMock`, page objects, port 4273, the `id`/`data-testid` hooks                            |
| `feature-md`          | the canonical headings and the four update triggers                                         |
| `impeccable`          | vendored third-party design skill (`npx impeccable`, Apache-2.0) — see below                |

> **`impeccable`** is not a FireGuard-authored skill: it is vendored wholesale (~3.3 MB,
> `scripts/` + 35 reference playbooks) to power the UI-uniformization work. Its two hooks
> (PostToolUse check + Stop deep pass) are wired in the git-ignored `settings.local.json`,
> and it maintains the `<!-- impeccable:product-schema -->` block in `PRODUCT.md`.
> **Precedence:** the spartan theme palette in `src/styles.css` stays locked — impeccable's
> `colorize`/`typeset`/`overdrive` playbooks may touch theme tokens only on a decision
> recorded in `DESIGN.md`; on any conflict, the `spartan-ui` skill and `rules/components.md`
> win.

## Rules (`rules/`)

Path-scoped instructions. Unlike a skill, a rule loads **automatically** whenever Claude reads a
file matching its `paths:` glob — so it carries the few things that must never be got wrong on
that kind of file, not the how-to.

| Rule                  | Loads when you touch                       | Carries                                                                               |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `components.md`       | `*.component.ts` / `.html`                 | no `Component` suffix, selector = folder name, `OnPush`, only a page injects a store  |
| `comments.md`         | any `src/app` `.ts` / `.html`              | documentation goes in the doc block — no `//` prose blocks, no template `<!-- -->`    |
| `directives-pipes.md` | `*.directive.ts` / `*.pipe.ts`             | the **opposite** suffix rule, `[appCamelCase]`, SSR guards, `ngTemplateContextGuard`  |
| `state.md`            | `state/**`                                 | `patchState` only, `rxMethod` + `tapResponse`, `toStoreError` before `errorCallState` |
| `data-access.md`      | `data-access/**`                           | extends `HydraApiService`, never `catch`/`map`, unprefixed Hydra keys                 |
| `models-utils.md`     | `models/` `utils/` `constants/` `options/` | type-only `models/`, folder-per-util, no type in `utils/`                             |
| `barrels.md`          | `**/index.ts`                              | never `export *`, narrow by default, which folders get none                           |
| `testing.md`          | `*.spec.ts`                                | the boundary each unit owns, the harnesses, the `--include` trap                      |
| `e2e.md`              | `e2e/**`                                   | `ApiMock`, port 4273, locate by `id`/`data-testid`, local-noon fixtures               |

> `directives-pipes.md` currently matches **nothing** — the repo has zero directives and zero
> pipes. Both halves are dormant on purpose: the rule exists to cadre the first unit of each
> kind, including the `ARCHITECTURE.md` edit the first pipe must carry. Same for `e2e.md`
> while `e2e/` is empty pending the suite's return.

**Why this matters here:** `ARCHITECTURE.md` (~150 KB) is deliberately **not** `@`-imported
by `CLAUDE.md` — importing it cost ~41 k tokens in every session. It is read on demand before
structural decisions, and the path-scoped rules carry the per-file-kind essentials
automatically so nothing critical depends on that read happening.

## MCP servers (`../.mcp.json`)

| Server       | Command                        | Tools | Note                                                                                                                                        |
| ------------ | ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `angular`    | `npx ng mcp --read-only`       | 6     | uses the **local** CLI — always version-matched, no download. `--read-only` drops `build`/`test`/`run_target`, already covered by `npm run` |
| `spartan`    | `npx -y @spartan-ng/mcp`       | 17    | the component catalog, APIs, and blocks — ask it before writing markup                                                                      |
| `playwright` | `npx -y @playwright/mcp`       | 24    | the heaviest; the writing agents scope it out via their `tools:` lists — only `fg-e2e-runner` declares it                                   |
| `context7`   | `npx -y @upstash/context7-mcp` | 2     | NgRx, Tailwind, CDK — what the other two do not cover                                                                                       |

## Hooks

Both project hooks are wired in `settings.json` on `Write|Edit|MultiEdit`, through
`${CLAUDE_PROJECT_DIR}` paths so they resolve regardless of the cwd.

**`hooks/guard.mjs`** — PreToolUse. Denies:

- `.env*` (except `.env.example` / `.env.dist`),
- generated trees: `node_modules/` `dist/` `.angular/` `test-results/` `playwright-report/`,
- a **class/id/attribute rule in `src/styles.css`** — the file takes theme tokens, at-rules,
  and element resets only; component styling is Tailwind utilities at the call site,
- runtime code inside a `models/` folder, except the sanctioned `<concept>-tag/` resolver,
- **`export * from`** written into a barrel under `src/` — barrels take explicit named re-exports (§13.3),
- loose documentation under `src/app/` — a multi-line `//` block or a template HTML comment
  (`rules/comments.md`).

**`hooks/format.mjs`** — PostToolUse. Runs the local `oxfmt` (directly through Node — no
`npx` round-trip) on the edited `.ts` `.html` `.css` `.scss` `.json` `.mjs` `.js` `.md`,
skipping everything `.oxfmtrc.json` ignores.

> `.md` is in that list deliberately: `.oxfmtrc.json` carries a markdown override and
> `format:check` walks the whole tree, so an unformatted `FEATURE.md` fails the gate —
> and §14.3 requires agents to update those docs in the same change.

`ARCHITECTURE.md` and `FEATURE.md` stay writable on purpose — §14.3 requires agents to update
them in the same change.

The monorepo-root guard carries the same frontend rules with a `/fireguard-sso-web/` path prefix,
for sessions opened one level up. **Keep the two in sync when a rule changes.**

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
