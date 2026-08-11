# E2E tests (Playwright)

Hermetic browser tests: every backend call is mocked at the network layer
(`e2e/support/mocks/api-mock.ts`), so no API, database, or Mercure hub needs
to run. This keeps runs fast, deterministic, and safe to run repeatedly.

## Why an `e2e` build configuration

The app is SSR by default (`ng serve` renders on the server). Playwright's
`page.route()` only intercepts requests made by the browser, so an SSR render
would fire its own server-side API calls that no mock ever sees, and the app
would hang waiting on a backend that isn't running.

`angular.json` therefore defines an `e2e` build/serve configuration
(`ssr: false`, `outputMode: "static"`) — a client-only SPA build.
`playwright.config.ts`'s `webServer` runs it automatically for `npm run e2e:*`.

## Layout

```text
e2e/
  support/
    fixtures/api-fixtures.ts          # session/org/onboarding factory functions
    fixtures/equipment-fixtures.ts    # EquipmentOutput factories
    fixtures/facility-fixtures.ts     # FacilityOutput factories
    fixtures/inspection-fixtures.ts   # InspectionOutput factories
    mocks/api-mock.ts                 # ApiMock — page.route() wrapper, one method per endpoint
    pages/*.page.ts                   # page objects — selectors + user-intent methods
    helpers/appearance.ts             # dark-theme cookie, overflow assertion, console-error collector
  organization/                       # /organizations/:id/{equipments,facilities,inspections} specs
  onboarding/                         # /onboarding wizard + guard-chain specs
```

## Coverage scope

Covered: the equipments/facilities/inspections list, create and detail
routes (search/filters/pagination, required-field validation, status-tag
icon+label rendering, in-place edit panels, the facility hierarchy chart,
`/edit` redirects), and the onboarding wizard's first step plus the
`onboardingGuard` / `onboardingRequiredGuard` mutual gate.

**This harness was rebuilt from a clean slate.** The previous suite (session
mocks, page objects, auth/dashboard/interventions specs) was deleted wholesale
in `3fc4e588` (the spartan/ui migration) and never restored. Only the pieces
this pass needed were rebuilt; auth, dashboard, account, organization-access
and interventions coverage — and the `support/helpers/offline.ts` +
IndexedDB-outbox machinery the old interventions suite depended on — do not
exist here and should be treated as a separate restoration task before this
suite is considered at parity with what shipped before.

## Adding a test for a new page

1. Add a page object in `support/pages/<name>.page.ts` wrapping selectors
   behind named locators and one method per user action.
2. Add any new endpoint the page calls to `ApiMock` in `support/mocks/api-mock.ts`
   (one `mock<Scenario>()` method per success/error case), backed by a fixture
   factory in `support/fixtures/`.
3. Write the spec calling the page object + `ApiMock`, asserting on URL and
   visible state.

## Network-mock composition rules

- `mockUnauthenticatedSession()` — call first on any auth-page test. Mocks
  `POST /api/auth/refresh` to fail (401), so the boot sequence resolves to
  "logged out" instead of hanging on the splash screen.
- `mockAuthenticatedSession()` — call instead of the above for tests that
  land directly on an authenticated route (`/`, `/onboarding`,
  `/organizations/:id/...`). Mocks the full boot burst: refresh → `/api/me`
  → notifications → onboarding → organizations (+ that organization's access
  and detail).
- Every `mock*Session*` call installs a catch-all 404 safety net for any
  `/api/*` request without a specific mock, so a missing mock fails fast with
  a clear "No E2E mock registered for ..." message instead of hanging for the
  full timeout.
- `mockOnboarding(onboarding)` — registered AFTER `mockAuthenticatedSession`,
  overrides the completed default the session bootstrap installs (Playwright
  matches routes last-registered-first).
- `mockEquipmentList` / `mockFacilityList` / `mockInspectionList` match the
  organization-scoped collection endpoint with a regex tolerant of query
  strings, so search/filter/page navigation never needs re-mocking.

## Running

```bash
npm run e2e:install     # once — installs browser binaries
npm run e2e:test        # all projects (chromium, firefox, webkit)
npm run e2e:chromium    # chromium only — fastest feedback loop
npm run e2e:headed      # chromium, headed
npm run e2e:ui          # Playwright's interactive UI mode
npm run e2e:debug       # chromium, Playwright inspector
npm run e2e:report      # open the last HTML report
```
