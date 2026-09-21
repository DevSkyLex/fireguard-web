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
  onboarding/                         # /onboarding/workspace discovery and /onboarding/create setup
  error/                              # focused error pages, decorations and responsive actions
  organization/                       # every /organizations/:id/... spec
```

## Coverage scope

Coverage is described by workflow; use `playwright test --list` for the current inventory.

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
`onboardingRequiredGuard` mutual gate. Regression cases also cover private workspace
discovery, resumed setup receipts (including a lost creation response and a partially
completed batch), focus after successful and failed transitions, OAuth error recovery
through password/MFA, dashboard isolation during an organization switch, and the focused
error-page layouts. OAuth providers and their callbacks use mocks, not real provider sessions.

Not covered, and worth stating plainly: the account profile, security and
notification workflows are not covered by these auth/onboarding regressions;
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

The interaction-mode regressions are `organization/interaction-mode.spec.ts`
and `organization/interaction-mode.mobile.spec.ts`. They distinguish a 375px
desktop window from phone and tablet contexts, verify automatic classification,
More permissions and organization switching, drawer keyboard focus, and staged
filter Apply/Cancel.
Wide mobile layouts may fit a table while keeping mobile navigation and controls.
`support/helpers/interaction-mode.ts` completes device platform emulation on
Windows, where a mobile UA can otherwise retain the host's `navigator.platform`.
It supplies coherent device signals without overriding the application's result.
All backend calls still go through `ApiMock` and its existing safety net.

Run this bounded matrix against the configured port 4273 server:

```powershell
npx playwright test e2e/organization/interaction-mode.spec.ts e2e/organization/interaction-mode.mobile.spec.ts --project=chromium --project="Mobile Chrome" --project="Mobile Safari" --workers=2 --reporter=line --output=e2e/test-results-interaction-mode
```

Settled captures live under `e2e/artifacts/mobile-visual-review/branch-review/<run>/interaction-mode/<project>/` separately
from disposable runner output. Inspect those captures for visual review; assertions
on visibility alone are not visual evidence. These tests emulate devices, not hardware
keyboards or operating-system safe-area/virtual-keyboard behavior, and do not test SSR.

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
  full timeout. It also records a Playwright assertion failure, even if the UI
  catches the HTTP error. The net covers API paths on any origin.
- Saved messages, channels and imports require `GET` plus the exact
  bare organization id in `organization`. Direct conversations and maintenance schedules require
  the exact organization IRI. Their optional final `organizationId` argument defaults
  to `E2E_ORGANIZATION_ID`; a multi-organization fixture supplies its explicit owner.
  Wrong methods and missing/wrong organizations fall through to the failing safety net.
- `mockOnboarding(onboarding)` — registered AFTER `mockAuthenticatedSession`,
  overrides the completed default the session bootstrap installs (Playwright
  matches routes last-registered-first).
- Onboarding mocks retain a server-side journal for the test's lifetime: setup preparation
  writes `setupOperations`, successful creation mocks record receipts, and later reads
  expose them even after a reload. A custom creation handler must call
  `api.recordSetupCreation(route, resourceId, organizationId?)` when simulating a commit,
  including before aborting a response to model a committed operation whose response was lost.
  These browser mocks verify client recovery; transactional concurrency and quotas require
  separate backend tests.
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
npm run e2e:typecheck   # includes harness files and the SSR config
npm run e2e:harness     # synthetic Chromium/WebKit checks; no Angular server
npm run e2e:ssr:build   # build the separate real SSR smoke bundle
npm run e2e:ssr         # local API stub + real SSR server on ports 4275/4274
```

## Harness reliability and visual passes

`FG_VISUAL_PASS=inspection|confirmation` selects the scenarios. `FG_VISUAL_RUN` only
names their durable output directory; naming a run `confirmation` does not select that pass.
The inspection selects 100 cases, the bounded confirmation 28. Inspection covers all 30 routes
at 390px light/dark plus eight representative routes in five complementary modes: phone
375×812/light, phone 458×915/dark, tablet 1024×1366/dark, narrow desktop 375×844/light and
desktop 1440×1000/dark. Use a distinct run name and
runner output directory for each authorized run; do not overwrite prior visual evidence.

```powershell
$env:FG_VISUAL_PASS = 'inspection'
$env:FG_VISUAL_RUN = 'branch-inspection-01'
npx playwright test e2e/organization/mobile-visual-review.spec.ts --project=chromium --workers=2 --retries=0 --reporter=line,./e2e/support/helpers/mobile-visual-reporter.ts --output=e2e/test-results-branch-inspection-01
```

The current gallery root is `e2e/artifacts/mobile-visual-review/branch-review/<run>/`.
Reports record actual scenarios, original test outcomes, evidence-generation status, HEAD
and the authored working-tree fingerprint before/after execution. Fingerprint scope is explicit;
secret environment files, dependencies and generated output are never read. A changing tree is
marked `sourceChanged`. Static regeneration preserves these recorded source identities.
Missing attachments, corrupt PNGs, missing scroll frames/diagnostics, image decode errors,
or a source/revision change during capture and
zero executed scenarios fail evidence generation and the reporter/CLI exit status. They do not
rewrite recorded test outcomes or classify an image-generation failure as a product defect.

```powershell
node e2e/scripts/render-mobile-visual-report.cjs branch-inspection-01
```

Use `--legacy` as the third argument only for historical runs directly under
`e2e/artifacts/mobile-visual-review/`, predating the `branch-review` directory.
The critical-action probe requires full viewport/clipping-ancestor bounds with 1px tolerance
and unobstructed center/corner hit tests. It never scrolls an action into view to make it pass.
The isolated suite proves that a 44px button with only 2px visible fails.

Teams, Checklists, Calendar and Saved messages now have bounded populated visual fixtures.
The calendar event is relative to today at local noon; saved messages resolve their exact
conversation through a GET-only mock. Security and notification-preference catalogs remain
empty and explicitly limited in the matrix. Completed runs and inspected-image limits are
recorded in `MOBILE-VISUAL-REVIEW.md`; they are not exhaustive state-space coverage.

`organization/inspections.mobile.spec.ts` uses real mobile presets. Its narrow-desktop counterpart
stays in `inspections.spec.ts`. Quick actions must finish closing before Search opens; Search
owns focus and Escape restores the persistent quick-actions trigger. Staged filter Apply also
checks focus restoration after closing. `shell-transitions.mobile.spec.ts` checks notification
navigation, nested backdrop isolation, topmost parent dismissal, Close/Escape/pointer swipe and
open- and closed-parent Ctrl/Cmd+K. `facility-plan-focus.mobile.spec.ts` checks each picker closes before
focus reaches the enabled editor action that replaces its disabled trigger. Adaptive captures
have source/scenario sidecars and reject Vite compilation overlays.

## Real SSR smoke boundary

The normal suite intentionally stays SSR-off. `playwright.ssr.config.ts` separately launches
the built SSR server and a local HTTPS API. OpenSSL must be on PATH. The launcher generates
a two-day local test certificate, trusts it only in its child via `NODE_EXTRA_CA_CERTS`, uses
the existing `FIREGUARD_RUNTIME_CONFIG` public contract, and removes its key/certificate after
shutdown. It neither reads nor changes environment files and never disables production origin
validation. Browser certificate tolerance is restricted to this smoke's isolated contexts.

The API stub acknowledges anonymous refresh/login and provider discovery, plus explicitly
bounded authenticated fixtures for the Webhooks and Automations client routes. Unknown paths,
methods or unexpected origins are recorded and fail the smoke. A child preload rejects HTTP,
HTTPS and fetch requests outside the exact local app/API origins; browser requests have the
same restriction. No real backend, database, account or federated provider is used.

The smoke verifies raw login HTML and hydration markers before browser JavaScript, actual
server-side refresh traffic, desktop/mobile hydration and form submission, and the anonymous
onboarding redirect. It also checks hosted runtime configuration and authenticated client startup
without server reads or serialized private collections on Webhooks and Automations. The SSR
build uses the hosted production bootstrap so client routes fetch `/runtime-config.json`; the
regular SPA harness retains its development bootstrap. Workspace routes remain client-rendered by the application's server-route
contract; authenticated dashboard SSR is not claimed. Set `FG_SSR_RUN` to a distinct simple name
before each run. Screenshots and source/request evidence live under
`e2e/artifacts/ssr-smoke/<run>/`; process IDs are recorded in `server/processes.json`. The scoped
global teardown asks only this run's launcher to stop, waits for its ephemeral TLS cleanup and
checks the final request ledger, avoiding broad Windows process-name kills.

`e2e:ssr:build` invokes `e2e/ssr/build.cjs`. It records HEAD, authored inputs before/after compile,
and a SHA-256 over emitted JS/CSS/HTML in `dist/fireguard-web-e2e-ssr/e2e-build.json`, failing if
authored source changes during the build. The launcher copies that immutable metadata into the
run's `server/build.json`; smoke evidence keeps build inputs separate from the runtime checkout.
A pre-wrapper baseline is explicitly `unrecorded-baseline`, never attributed to current source.

The launcher can validate TLS and both egress guards without loading any Angular source:

```powershell
node e2e/ssr/start-server.cjs --check
```

Its two intentional external-request rejections are recorded under `transport-check/` and
are expected only for this launcher self-check. Real SSR smoke runs require an empty
unexpected-request ledger. Run the build/smoke and application matrix only after the main
owner announces that source work is ready.
