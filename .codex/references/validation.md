# Select validation by the changed boundary

Use [package.json](../../package.json) for current scripts. Run the narrowest useful check first;
expand only when the change crosses boundaries or a remaining risk justifies it.
A passed command proves its covered boundary, not the entire application.

| Change or question                                  | Check                                                                        | Evidence and limit                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Docs, skills, profiles, agent TOML                  | Commands in [maintenance](../maintenance.md) plus reference/discovery review | Parseability, resource existence, integrity and resolver behavior; no Angular build needed |
| Helper, store, service, form behavior               | `npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"`          | Owning boundary; never bare Vitest or a directory-only include                             |
| Imports/public APIs                                 | `npm run lint:architecture`, focused tests                                   | Boundary rules and covered consumers; semantic ownership still needs review                |
| Authored code review                                | `npm run review:check -- --base <review-base>`                               | Changed-line structural diagnostics; warnings require interpretation                       |
| Templates, runtime entry points or public contracts | Focused checks then `npm run build`                                          | Strict template/type/build checks; no proof of visual quality                              |
| Broad application integration                       | `npm run quality`                                                            | Formatting, lint, unit suite and build; browser risks remain separate                      |

## Browser modes

Load official `spartan` and the applicable FireGuard skill for presentation verification.
Read [the E2E guide](../../e2e/README.md) and the selected config before launching a suite.

| Mode                     | Entry point                                                   | Prerequisites and proof                                                                                    |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Hermetic SPA             | `npm run e2e:chromium -- <scenario>`; `playwright.config.ts`  | SSR-off Angular on 4273, ApiMock; client behavior, no server-render proof                                  |
| Synthetic harness        | `npm run e2e:harness`; `e2e/harness/playwright.config.ts`     | No Angular server; proves test-helper/fixture mechanics, not application UI                                |
| Real SSR smoke           | `npm run e2e:ssr:build`, then `npm run e2e:ssr`               | Built SSR app, OpenSSL, isolated local API/app ports 4275/4274; bounded SSR/hydration and request evidence |
| Localized browser cases  | `npx playwright test --config=playwright.localized.config.ts` | French hermetic build on 4274; configured scenarios only, not complete translation coverage                |
| E2E TypeScript contracts | `npm run e2e:typecheck`                                       | Harness/config type checking, no browser execution                                                         |

Do not run localized and SSR servers concurrently on their shared port. Do not reuse a server
unless its build and runtime contract match the selected suite. Let each configured launcher
own its server; stop only processes started for the task.

Use device projects for touch/mobile interaction and viewport changes for layout questions.
Inspect actual recent captures for visual findings; state viewport, device, theme, scenario
and source revision. Save durable captures outside disposable runner output.
A safety-net assertion identifies an unmocked endpoint even if the UI handles its 404.
No suite may silently reach a real backend or account.

## Reading results

Preserve evidence before a runner cleans output. Report failed or skipped gates with their reason,
and distinguish existing unrelated failures from regressions. Use the smallest rerun that
validates a correction. Do not keep expanding testing after relevant risks are covered.
