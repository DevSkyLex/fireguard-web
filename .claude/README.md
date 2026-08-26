# FireGuard Web — Claude Code tooling

This app ships its own `.claude/`. Open **`fireguard-sso-web/`** as the workspace root to
activate it: 12 agents, 13 commands, 9 skills, 10 rules, 4 MCP servers, and
2 project hooks (plus 2 local impeccable hooks in the git-ignored `settings.local.json`).

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

Every agent is granted the `Skill` tool and opens with a **Skills to load** table naming which
skills it must load and on what trigger. That is deliberate: the agent prompt states the
_judgment_ (what to decide, in what order, what to hand off), the skill carries the
_operational_ detail (commands, harnesses, decision tables). Neither restates the other, so
neither drifts. From the monorepo root the skill names are namespaced `fireguard-web:<name>`.

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

### Where repetition _is_ allowed, and the rule that keeps it honest

Two kinds of file deliberately restate content they do not own:

- **`rules/`** — path-scoped, so they load _without_ the skill. A rule that only pointed at a
  skill would carry nothing at the moment it fires. Several therefore abridge one.
- **A handful of agents** repeat the `--include` trap, because it costs a wasted run the first
  time it bites and an agent that has not loaded `web-testing` would hit it.

Every such passage opens with **"Abridgement of the `<skill>` skill — change one, change
both."** That line is the whole contract: it is not decoration, it is how the next editor knows
a second copy exists. A restatement without the marker is a bug — the backend proved it, where
one false claim about `debug:firewall` lived in four files and got corrected in one.

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
| `ui-ux-pro-max`       | vendored third-party design database (Python search over CSVs, MIT) — see below             |

> **`impeccable`** is not a FireGuard-authored skill: it is vendored wholesale (~3.3 MB,
> `scripts/` + 35 reference playbooks) to power the UI-uniformization work. Its two hooks
> (PostToolUse check + Stop deep pass) are wired in the git-ignored `settings.local.json`,
> and it maintains the `<!-- impeccable:product-schema -->` block in `PRODUCT.md`.
> **Precedence:** the spartan theme palette in `src/styles.css` stays locked — impeccable's
> `colorize`/`typeset`/`overdrive` playbooks may touch theme tokens only on a decision
> recorded in `DESIGN.md`; on any conflict, the `spartan-ui` skill and `rules/components.md`
> win.

> **`frontend-design`** is not vendored at all: it is Anthropic's official skill, enabled as the
> plugin `frontend-design@claude-plugins-official` in `settings.json` here **and** at the monorepo
> root, so it upgrades upstream rather than going stale in a copy. It is namespaced
> `frontend-design:frontend-design` in both. **Precedence:** load it for the _writing_ — labels,
> button verbs, error and empty-state copy, the rule that an action keeps its name through the
> whole flow — and for its calibration of what a generic AI-generated design looks like. Its
> visual-identity half (choose a display typeface, a palette, a signature element) has no target
> in this app: there is no public marketing surface, and the identity is the spartan theme, which
> is fixed. `fg-spartan-ui` and `fg-component-builder` carry that split in their skill tables.

> **`ui-ux-pro-max`** is likewise vendored, from
> [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
> (MIT, commit `abb7f2f`, ~1.8 MB): a Python search over CSV databases of styles, palettes,
> font pairings, UX guidelines, and per-stack rules. It is a **lookup table, not a design
> director** — where `impeccable` drives a design pass, this one answers "what does the
> literature say about X". Requires Python 3.x on PATH (`scripts/search.py`); no packages.
> **Precedence:** its stack is always `angular`, spartan/ui stays the component library, the
> theme tokens stay locked, and `--persist` is never run — the SKILL.md carries these
> constraints in full. Local edits to the vendored file are listed in its Provenance footer;
> reapply them when re-vendoring upstream.

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
| `lsp-usage.md`        | `src/**/*.ts` / `.html`                    | Serena for symbols / grep for text, the cold index, `find_referencing_symbols` on the **token** |

> `directives-pipes.md` currently matches **nothing** — the repo has zero directives and zero
> pipes. Both halves are dormant on purpose: the rule exists to cadre the first unit of each
> kind, including the `ARCHITECTURE.md` edit the first pipe must carry. `e2e.md`, by contrast,
> is live: `e2e/` carries 9 specs across `onboarding/` and `organization/`, with page objects
> and fixtures under `e2e/support/`.

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

## Code intelligence (Serena, user scope)

Reached through the **`serena-web`** MCP server rather than a language-server plugin. One
server, Serena's `angular` backend, indexes 3 214 files — every `.ts` **and** all 249 `.html`
templates — and gives `find_declaration` / `find_referencing_symbols` / `find_symbol` /
`get_symbols_overview` / `find_implementations` / `get_diagnostics_for_file`. Because the
templates are indexed, `find_referencing_symbols` on a component surfaces the templates that
use it, not just the classes.

When to reach for it rather than for grep is in `rules/lsp-usage.md`, along with the one trap
worth knowing: a **port** is bound by `InjectionToken` + `useExisting`, so nothing declares
`implements ThemePort` and both `find_implementations` and `find_referencing_symbols` on the
interface come back empty — run `find_referencing_symbols` on the _token_ instead.

**The specs are invisible, and it is the limit that bites.** `tsconfig.app.json` excludes
`src/**/*.spec.ts`, and the server loads that project, so `find_referencing_symbols` and
`find_implementations` never return a spec. Measured on `InterventionService`: 14 files from
Serena against 28 real code references, the 14 missing ones being exactly the specs. Finish a
rename with `Grep -w "<Symbol>" src --include="*.spec.ts"`.

**Two further limits.** The `angular` server drops the repo's 111 `.js`/`.mjs`/`.cjs` files,
which the plain `typescript` server did index — hooks, launchers and config are not
symbol-searchable. And **inline** templates in a `.ts` file get TypeScript's view, not
Angular's; this repo puts every template in its own `.component.html` (§10.2), so that costs
nothing today.

**The `fireguard-web-lsp` plugin was removed from `enabledPlugins` on 2026-08-26**, in the
monorepo root and here. It ran `typescript-language-server` on `.ts` and
`@angular/language-server` on `.html`, from the app's own devDependencies, and served the main
session only — subagents never received the `LSP` tool — while Serena serves both. Its `lsp/`
directory is still on disk, inert; re-enabling is one line in each `settings.json`.

**What went with it, and it is a real loss on this side:** the call hierarchy
(`incomingCalls` / `outgoingCalls`), which Serena does not expose at all; and diagnostics
pushed into the session **after every edit** instead of at `npm run build` time.
`mcp__serena-web__get_diagnostics_for_file` is on demand, per file.

Full account, including the measurements that justified the removal:
`.claude/rules/lsp-availability.md`.

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
