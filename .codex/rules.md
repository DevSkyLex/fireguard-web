# Rules for Codex

Read matching rules before editing; paths are relative to the repository root.
These are manual routing references, not automatic activation guarantees.
ARCHITECTURE.md and the owner FEATURE.md remain normative. Generated/dependency trees and
official skill payloads are excluded from authored-code rules and must not be hand-edited.

| Rule                                                | Matching paths or task                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Ownership/contracts](rules/ownership-contracts.md) | `src/app/**/FEATURE.md`, feature creation, public ports, `providers/`, `setup/`, `navigation/`, cross-feature changes |
| [Barrels](rules/barrels.md)                         | Authored `src/app/**/index.ts`                                                                                        |
| [Comments](rules/comments.md)                       | Authored `src/app/**/*.ts`, `src/app/**/*.html`                                                                       |
| [Components](rules/components.md)                   | Authored `*.component.ts`, `*.component.html`                                                                         |
| [Forms](rules/forms.md)                             | `ui/forms/**`, `**/validators/**`, `*.validator.ts`                                                                   |
| [Data access](rules/data-access.md)                 | `src/app/**/data-access/**/*.ts`                                                                                      |
| [Behavior/access](rules/behavior-access.md)         | `**/services/**`, `**/access/**`, repositories and offline sync                                                       |
| [Directives/pipes](rules/directives-pipes.md)       | Authored `*.directive.ts`, `*.pipe.ts`                                                                                |
| [Routing/SSR](rules/routing-ssr.md)                 | `*.routes.ts`, `**/http/**`, routing and hydration changes                                                            |
| [E2E](rules/e2e.md)                                 | `e2e/**`, `playwright*.config.ts`, browser verification                                                               |
| [Code intelligence](rules/lsp-usage.md)             | Symbol changes in authored TypeScript/HTML                                                                            |
| [Models/utils](rules/models-utils.md)               | `**/models/**`, `**/utils/**`, `**/constants/**`, `**/options/**`                                                     |
| [State](rules/state.md)                             | `src/app/**/state/**/*.ts`                                                                                            |
| [Testing](rules/testing.md)                         | `src/app/**/*.spec.ts`                                                                                                |
| [Localization review](references/i18n-review.md)    | Message IDs, `src/locale/*.xlf`, locale changes                                                                       |
| [Validation selection](references/validation.md)    | Choosing checks, including tooling-only work                                                                          |
