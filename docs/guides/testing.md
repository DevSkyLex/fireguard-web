# Frontend testing

Select a validation boundary before running a command. Results establish only the behavior and environment actually exercised.

**Authoritative references:** [Coverage](../../COVERAGE.md) · [E2E](../../tests/e2e/README.md) · [Package scripts](../../package.json).

## Application tests

```sh
npx ng test --watch=false --include="src/app/features/auth/**/*.spec.ts"
npm run test:coverage
```

Use Angular's builder for application specs. A focused run supports development; the
complete suite establishes global coverage. Tests assert HTTP contracts, store
state/errors, orchestration, explicit component inputs/outputs and resource disposal.
Do not replace meaningful denial, conflict or durability assertions with invocation
tests, exclusions or retries that hide a failure.

## Architecture tests

```sh
npm run test:architecture
```

The [architecture suite](../../tests/architecture/README.md) uses a dedicated Vitest Node
configuration and the TypeScript compiler API. It checks real application dependencies and
proves the detector against allowed and forbidden fixtures. The existing lint CI gate runs it.
See the [repository test index](../../tests/README.md) for suite ownership.

## API fixture contracts

```sh
npm run test:contracts
npm run e2e:harness -- api-contract.spec.ts --project=chromium
npm run test:contracts:drift
```

The [contract suite](../../tests/contracts/README.md) validates the actual SSR stub responses
and selected SPA mocks against a reviewed OpenAPI export. Positive and negative validator
cases cover missing routes/methods, statuses, media types, required fields, enums and formats.
Path/query parameters also enforce required values and scalar/form-array serialization;
populated fixtures cover eight collection families and omitted nullable non-conformity fields.
The API owns the reference; synchronize and review it when its HTTP contract changes.

## Browser boundaries

| Mode           | Establishes                                              | Entry point                                     |
| -------------- | -------------------------------------------------------- | ----------------------------------------------- |
| Hermetic SPA   | Browser behavior with network mocks; no real SSR/backend | `npm run e2e:chromium`                          |
| Harness        | Browser helper/fixture behavior without Angular          | `npm run e2e:harness`                           |
| Localized      | Configured locale-specific scenarios                     | Localized Playwright config                     |
| Real SSR smoke | Built SSR, targeted handoff and hydration                | `npm run e2e:ssr:build`, then `npm run e2e:ssr` |

The [E2E reference](../../tests/e2e/README.md) defines ports, resource ownership and known
limits. Use role-based locators and settled-state assertions. Touch devices and
narrow desktop viewports exercise different contracts. Retain dated captures for
visual claims; historical reviews do not certify a later revision.

Each PR runs desktop Chromium, Mobile Chrome and Mobile Safari, the real SSR harness
in Chromium/WebKit, and French/Spanish localized checks. Releases run all five SPA
projects, adding desktop Firefox and WebKit; a manual `full_browser_matrix` run does
the same. Translation catalog drift fails CI. These gates still use hermetic API
fixtures; the separate [live API scenario](../../tests/e2e/live-api/README.md) requires
an isolated real stack, durable workers, trusted HTTPS and successful readiness probes.
An authored or listed live scenario does not establish a passing integration run.

## Tooling checks

Run documentation checks from `.github/documentation`. Its tests use real link
fixtures and the Mermaid browser renderer. It has no API, database or deployment
credential dependency. Formatting and architecture tests remain separate checks.
