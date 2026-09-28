# Frontend testing

Select a validation boundary before running a command. Results establish only the behavior and environment actually exercised.

**Authoritative references:** [Coverage](../../COVERAGE.md) · [E2E](../../e2e/README.md) · [Package scripts](../../package.json).

## Application tests

```sh
npx ng test --watch=false --include="src/app/features/auth/**/*.spec.ts"
npm run test:coverage
```

Use Angular's builder, not bare Vitest. A focused run supports development; the
complete suite establishes global coverage. Tests assert HTTP contracts, store
state/errors, orchestration, explicit component inputs/outputs and resource disposal.
Do not replace meaningful denial, conflict or durability assertions with invocation
tests, exclusions or retries that hide a failure.

## Browser boundaries

| Mode           | Establishes                                              | Entry point                                     |
| -------------- | -------------------------------------------------------- | ----------------------------------------------- |
| Hermetic SPA   | Browser behavior with network mocks; no real SSR/backend | `npm run e2e:chromium`                          |
| Harness        | Browser helper/fixture behavior without Angular          | `npm run e2e:harness`                           |
| Localized      | Configured locale-specific scenarios                     | Localized Playwright config                     |
| Real SSR smoke | Built SSR, targeted handoff and hydration                | `npm run e2e:ssr:build`, then `npm run e2e:ssr` |

The [E2E reference](../../e2e/README.md) defines ports, resource ownership and known
limits. Use role-based locators and settled-state assertions. Touch devices and
narrow desktop viewports exercise different contracts. Retain dated captures for
visual claims; historical reviews do not certify a later revision.

## Tooling checks

Run documentation checks from `.github/documentation`. Its tests use real link
fixtures and the Mermaid browser renderer. It has no API, database or deployment
credential dependency. Formatting and architecture lint remain separate gates.
