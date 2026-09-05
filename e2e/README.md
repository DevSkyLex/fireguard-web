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
    fixtures/api-fixtures.ts          # session/org/onboarding/register factory functions
    fixtures/equipment-fixtures.ts    # EquipmentOutput factories
    fixtures/facility-fixtures.ts     # FacilityOutput factories
    fixtures/inspection-fixtures.ts   # InspectionOutput factories
    fixtures/intervention-fixtures.ts # InterventionOutput factories
    mocks/api-mock.ts                 # ApiMock — page.route() wrapper, one method per endpoint
    pages/*.page.ts                   # page objects — selectors + user-intent methods
    helpers/appearance.ts             # dark-theme cookie, the two overflow assertions, console-error collector
    helpers/offline.ts                # perceived-connectivity toggle + IndexedDB outbox read/seed
  auth/                               # /auth/login, /auth/register(/verify), /auth/mfa-verify specs
  maintenance/                        # /maintenance + 503 interceptor specs
  onboarding/                         # /onboarding wizard (first step, steps 2-5, guard-chain) specs
  organization/                       # every /organizations/:id/... spec
```

## Coverage scope

40 specs, listed by what they drive rather than summarised — an exact count
goes stale the moment a spec is added or split, so treat this as a shape, not
an inventory.

Covered: sign-in, registration (draft → email verification → auto-login) and
MFA verification, including the login page's plain-credentials, rejected-login
and `mfa_required` hand-off cases; the organization dashboard; the
interventions list, board, calendar, recurrences, tabs, bulk transitions,
discussion, creation (from the list page's "New intervention" action through to
the new record's detail page) and detail issues/checklist; the equipments,
facilities (+ map), inspections, checklists, approvals, audit, imports and
maintenance-schedules collections; the assets explorer; members, team (roles),
settings and the organization switcher; account settings mobile navigation and
the organization-leave flow; channels; invitation accept; the maintenance
route; and the onboarding wizard's first step, steps 2 through 5
(plan and members skip, a facility staged explicitly via "Add facility", and
equipment registration completing the flow), plus the `onboardingGuard` /
`onboardingRequiredGuard` mutual gate.

Not covered, and worth stating plainly: the account profile, security and
notification workflows and the three `error` pages have no dedicated specs;
the intervention creation spec covers the "New
intervention" button entry point only, not the `?create=1` query-param
auto-open or the "start from a template" / "Duplicate" flows; `approvals`,
`audit`, `checklists`, `imports` and `maintenance-schedules` have a filter-bar
spec only — no table body, row actions, create/edit, empty or error state; and
`calendar-page`, `inspection-analytics-page`, `organization-teams-page`,
`organization-member-profile-page`, `direct-messages-page`,
`direct-conversation-page` and `saved-messages-page` have none.

`support/helpers/offline.ts` was deleted wholesale in `3fc4e588` (the spartan/ui
migration) along with the rest of the old suite, and has now been restored from
that commit's parent after checking it still matches the app: same database
names (`fireguard-field-interventions`, `fireguard-messaging`), same seven
object stores, and `ConnectivityService` still deriving from `navigator.onLine`
plus the `online`/`offline` events. The offline **specs** it served were not
restored — the helper is the tool, not the coverage.

## Responsive and touch

Two different questions, two different tools; using the wrong one is how a
suite goes green on an unusable screen.

- **Viewport** — `page.setViewportSize({ width: 375, height: 800 })` inside a
  desktop project. Twelve specs already do this. It resizes and nothing else.
- **Device** — a spec named `*.mobile.spec.ts` runs under the `Mobile Chrome`
  and `Mobile Safari` projects, and **only** under them: the desktop projects
  ignore that suffix. Those projects bring what a viewport call cannot —
  `hasTouch`, `isMobile`, `pointer: coarse` and a mobile user agent — so any
  assertion about tap targets, touch-only affordances or hover-gated UI belongs
  in one.

`expectNoHorizontalOverflow(page)` proves the _document_ does not scroll
sideways. It cannot see a table scrolling inside its own `overflow-x-auto`
container, so it passes on a collection the operator cannot read. Pair it with
`expectNoInternalOverflow(locator)` pointed at the element that owns the
overflow — for a spartan table that is `[data-slot="table-container"]`, not the
page wrapper around it.

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
- A create endpoint that shares its path with a list endpoint —
  `mockEquipmentCreate`, `mockFacilityCreate`, `mockOrganizationCreate`,
  `mockInterventionCreate` — checks the request method and calls
  `route.fallback()` on anything but `POST`, so it composes with the
  corresponding `mock*List` registered earlier on the same pattern (Playwright
  matches last-registered-first; the fallback reaches the earlier `GET`
  handler). Register the create mock after the list mock in a spec that needs
  both.
- Auth mocks (`mockLogin`, `mockLoginError`, `mockMfaVerify`, `mockMfaResend`,
  `mockRegister`, `mockRegisterVerify`, `mockRegisterResend`) and the
  onboarding step mocks (`mockOnboardingStepExecute`, `mockOnboardingStepSkip`)
  follow the same one-method-per-endpoint shape as everything else — no
  special composition rule beyond registering them before the action that
  triggers the request.

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
