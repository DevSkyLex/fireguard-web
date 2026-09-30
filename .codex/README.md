# FireGuard Web in Codex

This directory documents the local Codex tooling. Start with [AGENTS.md](../AGENTS.md),
then follow the [workflow](workflow.md) and the [rules for the files you touch](rules.md).
The architecture is defined in [ARCHITECTURE.md](../ARCHITECTURE.md), while business contracts
live in the `FEATURE.md` files. The palette and interactions are governed by
[DESIGN.md](../DESIGN.md) and [PRODUCT.md](../PRODUCT.md).

## Choose the right entry point

A skill provides a procedure; an agent carries out an independent, bounded responsibility.
Having a specialist available does not make delegation mandatory.

| Need                                   | Skill or reference                                                 | Agent                                                                              | Validation                                                     |
| -------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Page/component                         | `spartan` + `fg-web-spartan`                                       | `fg-web-component-builder`                                                         | Targeted tests, build for template changes, useful screenshots |
| Native composition                     | `spartan` + `fg-web-spartan`                                       | `fg-web-spartan-ui`                                                                | Desktop/mobile screenshots and affected themes                 |
| Form / overlay / collection            | Targeted `fg-web-spartan` reference                                | `fg-web-form-builder` / `fg-web-overlay-builder` / `fg-web-collection-builder`     | Inputs/outputs, focus, and affected flows                      |
| Directive / pipe / helper              | `fg-web-directive` / `fg-web-pipe` / `fg-web-util`                 | `fg-web-directive-builder` / `fg-web-pipe-builder` / `fg-web-utils-builder`        | Host/SSR behavior or pure inputs and outputs                   |
| Ownership / routes                     | `fg-web-feature`                                                   | `fg-web-feature-builder` / `fg-web-routing-ssr-builder`                            | Boundaries, redirects, and SSR/hydration                       |
| Transport / access / offline           | `fg-web-service`                                                   | `fg-web-service-builder` / `fg-web-access-builder` / `fg-web-offline-sync-builder` | Wire mapping, access denial, replay/conflicts                  |
| State                                  | `fg-web-store`                                                     | `fg-web-signal-store`                                                              | Transitions, errors, and introduced races                      |
| Tests                                  | `fg-web-test` + `fg-web-quality`                                   | `fg-web-web-test-writer`                                                           | Targeted `ng test`, then justified checks                      |
| Browser                                | `fg-web-e2e`                                                       | `fg-web-e2e-runner`                                                                | Explicit SPA/harness/SSR/localized mode                        |
| Architecture / accessibility / design  | `fg-web-arch-review` / `fg-web-a11y` / design reference            | `fg-web-architecture-reviewer` / `fg-web-a11y-auditor` / `fg-web-design-reviewer`  | Evidence and limits; read-only                                 |
| API contract / i18n                    | `fg-web-service` API reference / [i18n](references/i18n-review.md) | `fg-web-api-contract-reviewer` / `fg-web-i18n-auditor`                             | Wire contracts / IDs and placeholders                          |
| Comments and JSDoc                     | [shared convention](../docs/guides/code-comments.md)               | `fg-web-comment-maintainer` (luna / medium, Fast)                                  | docs:check, scoped formatting/lint                             |
| Frontend security | Architecture and auth feature contract | `fg-web-security-auditor` | Token/cookie/cache boundaries and denial evidence |
| Performance | Architecture budgets and supplied measurements | `fg-web-performance-reviewer` | Bundle/network/hydration evidence |
| CI and deployment | Assigned frontend workflows and test commands | `fg-web-workflow-reviewer` | Triggers, permissions, browser/build gates, image identity |
| Requested second opinion               | `fg-web-codex-challenge`                                           | Targeted reviewer from the [catalog](references/agents.md)                         | Verified findings and stated independence                      |
| SonarQube issue triage and remediation | `fg-web-sonarqube`                                                 | Parent or already assigned specialist                                              | Exact analyzed SHA, issue decisions, focused checks            |

Commands, prerequisites, and limits for each check are in the
[validation matrix](references/validation.md).

The catalog contains **14 FireGuard skills**, **2 official skills** (`spartan` and
`design-taste-frontend`), and **25 FireGuard agents**. Agent names and boundaries are
described in the [catalog](references/agents.md). Taste operates within its declared
scope, under the [third-party skill constraints](third-party-skills.md).

## Optional Serena

`serena-web` is configured with `enabled = false` to avoid starting its process
and language server for every task. Use `rg` for routine text and documentation
work. Enable Serena for symbol navigation, reference analysis or refactoring.

For one CLI session, run from this repository root:

```powershell
codex -c 'mcp_servers.serena-web.enabled=true'
```

This override ends with the CLI session. In the desktop app or IDE, temporarily
set `enabled = true` in `.codex/config.toml`, start a new session, then restore
`false` after the task. In a desktop project, change the configuration in the primary folder.
The native `cwd` entry selects the web checkout before Serena uses `--project-from-cwd`.
Install a Serena version supporting this option. The other Serena instance has its own
`cwd` entry and is disabled by default as well. Update these entries when switching checkouts.
Do not start a separate Serena process just because its tools are unavailable.

All seven Luna agents explicitly request Fast; Sol agents explicitly request Standard.
Speed is separate from reasoning effort. See [OpenAI speed documentation](https://learn.chatgpt.com/docs/agent-configuration/speed).

## Model and effort

Native TOMLs are the source of truth for each role. Invoke the custom role rather than
naming a generic task. Read [the workflow](workflow.md#native-agent-settings) for availability
and inheritance checks; configuration validity does not prove runtime behavior.

The complete model/effort table is in [the agent catalog](references/agents.md).

## Getting started and maintenance

Tooling prerequisites: Python 3.11+ and Node.js. Project dependencies are needed
for the Angular and browser commands described in [package.json](../package.json).
Keep one desktop project with API, web and landing attached. API or web can be primary;
Codex automatically discovers configuration from the primary folder. Its peer role declarations
make the same 47 agents available from either primary checkout. Read the owning repository's
AGENTS.md and workflow explicitly when working in a secondary folder.

The shared [configuration example](config.example.toml) contains the peer role declarations
and optional MCP setup. `.codex/config.toml` is local and ignored: copy the example on a new
checkout and replace `<API_CHECKOUT>` / `<WEB_CHECKOUT>` only in the local MCP entries. Preserve
existing local server settings when updating agent declarations. MCP `cwd` binds Angular,
Spartan, Playwright and each Serena server to its intended checkout. Both Serena servers stay
disabled unless needed. Configuration presence does not prove a live connection or trusted hooks.
Do not change personal settings, project trust or approval policy.

Validate tooling with `python -B .codex/scripts/validate.py`.

Keep machine-specific executable paths and overrides in user-level configuration.
An MCP entry does not prove a connection.
Hooks require the runtime's trust review and are not a sandbox.
Do not change trust settings, the global model, or permissions to pass a check.

Use the [validation matrix](references/validation.md) to choose checks.
Detailed procedures, third-party updates, known limits, and migration from
older invocations are in [maintenance.md](maintenance.md). After changing skills
or roles, open a new session if the active catalog still shows the old entries.
