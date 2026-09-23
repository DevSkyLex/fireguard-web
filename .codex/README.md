# FireGuard Web in Codex

This directory documents the local Codex tooling. Start with [AGENTS.md](../AGENTS.md),
then follow the [workflow](workflow.md) and the [rules for the files you touch](rules.md).
The architecture is defined in [ARCHITECTURE.md](../ARCHITECTURE.md), while business contracts
live in the `FEATURE.md` files. The palette and interactions are governed by
[DESIGN.md](../DESIGN.md) and [PRODUCT.md](../PRODUCT.md).

## Choose the right entry point

A skill provides a procedure; an agent carries out an independent, bounded responsibility.
Having a specialist available does not make delegation mandatory.

| Need | Skill or reference | Agent | Validation |
| --- | --- | --- | --- |
| Page/component | `spartan` + `fg-web-spartan` | `fg-web-component-builder` | Targeted tests, build for template changes, useful screenshots |
| Native composition | `spartan` + `fg-web-spartan` | `fg-web-spartan-ui` | Desktop/mobile screenshots and affected themes |
| Form / overlay / collection | Targeted `fg-web-spartan` reference | `fg-web-form-builder` / `fg-web-overlay-builder` / `fg-web-collection-builder` | Inputs/outputs, focus, and affected flows |
| Directive / pipe / helper | `fg-web-directive` / `fg-web-pipe` / `fg-web-util` | `fg-web-directive-builder` / `fg-web-pipe-builder` / `fg-web-utils-builder` | Host/SSR behavior or pure inputs and outputs |
| Ownership / routes | `fg-web-feature` | `fg-web-feature-builder` / `fg-web-routing-ssr-builder` | Boundaries, redirects, and SSR/hydration |
| Transport / access / offline | `fg-web-service` | `fg-web-service-builder` / `fg-web-access-builder` / `fg-web-offline-sync-builder` | Wire mapping, access denial, replay/conflicts |
| State | `fg-web-store` | `fg-web-signal-store` | Transitions, errors, and introduced races |
| Tests | `fg-web-test` + `fg-web-quality` | `fg-web-web-test-writer` | Targeted `ng test`, then justified checks |
| Browser | `fg-web-e2e` | `fg-web-e2e-runner` | Explicit SPA/harness/SSR/localized mode |
| Architecture / accessibility / design | `fg-web-arch-review` / `fg-web-a11y` / design reference | `fg-web-architecture-reviewer` / `fg-web-a11y-auditor` / `fg-web-design-reviewer` | Evidence and limits; read-only |
| API contract / i18n | `fg-web-service` API reference / [i18n](references/i18n-review.md) | `fg-web-api-contract-reviewer` / `fg-web-i18n-auditor` | Wire contracts / IDs and placeholders |
| Requested second opinion | `fg-web-codex-challenge` | Targeted reviewer from the [catalog](references/agents.md) | Verified findings and stated independence |

Commands, prerequisites, and limits for each check are in the
[validation matrix](references/validation.md).

The catalog contains **13 FireGuard skills**, **2 official skills** (`spartan` and
`design-taste-frontend`), and **21 FireGuard agents**. Agent names and boundaries are
described in the [catalog](references/agents.md). Taste operates within its declared
scope, under the [third-party skill constraints](third-party-skills.md).

## Model and effort

[agent-profiles.toml](agent-profiles.toml) declares a model family and effort for
each role. These are delegation profiles: agent files do not pin a model.
A direct invocation inherits the session settings. The parent resolves the profile
against the actual catalog before invoking an agent with explicit parameters; see the
[workflow](workflow.md#agent-profiles). A model identifier shown in an example is
never evidence that it is available.

## Getting started and maintenance

Tooling prerequisites: Python 3.11+ and Node.js. Project dependencies are needed
for the Angular and browser commands described in [package.json](../package.json).
After cloning, moving, or creating a worktree:

```powershell
python -B .codex/scripts/configure.py
python -B .codex/scripts/configure.py --check
```

The configuration preserves other settings; an MCP entry does not prove a connection.
Hooks require the runtime's trust review and are not a sandbox.
Do not change trust settings, the global model, or permissions to pass a check.

Use the [validation matrix](references/validation.md) to choose checks.
Detailed procedures, third-party updates, known limits, and migration from
older invocations are in [maintenance.md](maintenance.md). After changing skills
or roles, open a new session if the active catalog still shows the old entries.