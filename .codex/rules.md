# Rules for Codex

Read each matching rule before editing. Paths are relative to the repository root.
These are native Codex references; no Claude frontmatter activation or tool is required.
ARCHITECTURE.md remains the authority when an operational summary becomes stale.

| Rule                                          | Matching paths                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [barrels](rules/barrels.md)                   | `src/app/**/index.ts`                                                                                                 |
| [comments](rules/comments.md)                 | `src/app/**/*.ts`, `src/app/**/*.html`                                                                                |
| [components](rules/components.md)             | `src/app/**/*.component.ts`, `src/app/**/*.component.html`                                                            |
| [data-access](rules/data-access.md)           | `src/app/**/data-access/**/*.ts`                                                                                      |
| [directives-pipes](rules/directives-pipes.md) | `src/app/**/*.directive.ts`, `src/app/**/*.pipe.ts`                                                                   |
| [e2e](rules/e2e.md)                           | `e2e/**/*.ts`                                                                                                         |
| [lsp-usage](rules/lsp-usage.md)               | `src/**/*.ts`, `src/**/*.html`                                                                                        |
| [models-utils](rules/models-utils.md)         | `src/app/**/models/**/*.ts`, `src/app/**/utils/**/*.ts`, `src/app/**/constants/**/*.ts`, `src/app/**/options/**/*.ts` |
| [state](rules/state.md)                       | `src/app/**/state/**/*.ts`                                                                                            |
| [testing](rules/testing.md)                   | `src/app/**/*.spec.ts`                                                                                                |
