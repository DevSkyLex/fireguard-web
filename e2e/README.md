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
(`ssr: false`, `outputMode: "static"`) — a client-only SPA build. `npm run
start:e2e` runs it directly; `playwright.config.ts`'s `webServer` runs it
automatically for `npm run e2e:*`.

## Layout

```text
e2e/
  support/
    fixtures/api-fixtures.ts   # factory functions for API response shapes
    fixtures/intervention-fixtures.ts  # intervention/activity/outbox-op factories
    mocks/api-mock.ts          # ApiMock — page.route() wrapper, one method per endpoint/scenario
    pages/*.page.ts            # page objects — selectors + user-intent methods
    helpers/offline.ts         # connectivity toggling + IndexedDB outbox read/seed
  auth/                        # login, register, forgot-password, mfa-verify,
                                # register-verify, password-reset-verify+new
  dashboard/                   # authenticated-landing redirect specs
  onboarding/                  # wizard welcome-phase + onboardingGuard specs
  account/                     # /account profile + tab-switch specs
  organization/                # /organizations list + access-control specs
  interventions/               # offline-first outbox/sync engine (IF-25/16/4/3)
  misc/                        # static error pages (404/403/500) + maintenance
```

## Coverage scope

Covered: every auth page, the dashboard landing redirect matrix, the
onboarding wizard's entry phase, the account page's default section, the
organization list, the full organization access-control guard chain
(`organizationAccessGuard` → `organizationLandingGuard` →
`organizationPermissionGuard` for members/team/settings), and the
**intervention offline outbox/sync engine** (`interventions/` — see below).

Intentionally **not** covered by this suite (each is a large, self-contained
feature area):

- the organization dashboard's own trend-chart widgets,
- the onboarding wizard's step-by-step forms (past the welcome phase),
- the account page's "security" and "notifications" sections,
- CRUD (list/create/edit/detail) for facilities, equipment, inspections, and
  checklists, and the intervention list/board/calendar and planning surfaces
  (the `interventions/` suite covers only the offline/sync engine on the
  detail page, not those flows).

## Intervention offline / sync suite

`interventions/` is the dedicated home for the offline-first "zero data loss"
subsystem, driven entirely through the live UI + IndexedDB (still fully
hermetic — every HTTP call is mocked). Two extra support pieces make it work:

- `support/helpers/offline.ts` — `setAppOffline()` / `setAppOnline()` flip the
  app's perceived connectivity via `navigator.onLine` + the `online`/`offline`
  window events (which the app's `ConnectivityService` re-reads), leaving
  `page.route` mocks intact; `readOutboxOperations()` / `seedOutboxOperations()`
  read/seed the IndexedDB outbox (`fireguard-field-interventions`, store
  `outbox`). Owner binding is inert in e2e (the `/me` fixture has no `sub`), so
  seeding after page load is never wiped.
- `ApiMock.mockInterventionDetail/Workspace/PlanningOptions` render the detail
  page; `mockCommentCreate`, `mockEquipmentCreateReplay(status)`, and
  `mockInterventionUpdateRebase(id, revision)` drive the replay outcomes.

Covered: offline comment queue + optimistic "You" entry + replay drain (IF-25);
online-but-unreachable comment fallback via a status-0 abort (IF-5); ticking a
checklist item offline through the real store path (IF-7); 412-rebase so Retry
no longer loops (IF-4); a dependent of a permanently-failed create surfaced as
failed (IF-16); a transient 5xx leaving ops pending (IF-3); idempotent dequeue
of an already-applied create (IF-6); Discard clearing blocked ops (IF-8). The
PWA-update deferral (IF-20) is service-worker-gated and is covered by unit
tests, not here.

> The IF-5 test also surfaced a real bug it now guards against:
> `ConnectivityService.isNetworkFailure` only detected status-0 via
> `instanceof HttpErrorResponse`, but `HydraApiService.handleError` normalizes
> every error to a plain `ApiError` first — so "online but unreachable" edits
> were dropped instead of queued. The fix additionally detects a status-0
> `ApiError`.

If you extend coverage into one of these, remove it from this list.

## Adding a test for a new page

1. Add a page object in `support/pages/<name>.page.ts` wrapping selectors
   behind named locators and one method per user action (`login()`, not
   `emailInput.fill()` + `submitButton.click()` inline in the spec).
2. Add any new endpoint the page calls to `ApiMock` in `support/mocks/api-mock.ts`
   (one `mock<Scenario>()` method per success/error case), backed by a fixture
   factory in `support/fixtures/api-fixtures.ts`.
3. Write the spec calling the page object + `ApiMock`, asserting on URL and
   visible state — not on mock call internals unless the spec's intent is to
   verify the request was actually sent (see `api.loginCallCount`).

## Network-mock composition rules

- `mockUnauthenticatedSession()` — call first on any auth-page test. Mocks
  `POST /api/auth/refresh` to fail (401), so the boot sequence resolves to
  "logged out" instead of hanging on the splash screen.
- `mockAuthenticatedSession()` — call instead of the above for tests that
  land directly on an authenticated route (`/`, `/onboarding`, ...). Mocks the
  full boot burst: refresh → `/api/me` → notifications → onboarding →
  organizations.
- `mockSessionData()` — the same downstream burst as `mockAuthenticatedSession`
  but WITHOUT touching `/api/auth/refresh`. Use this after `mockLoginSuccess()`
  in an interactive-login test: the login response itself provides the token,
  and Playwright resolves overlapping route patterns last-registered-first, so
  re-mocking `refresh` to succeed there would make the app treat the session
  as already authenticated before the form is ever submitted.
- Every `mock*Session*` call installs a catch-all 404 safety net for any
  `/api/*` request without a specific mock, so a missing mock fails fast with
  a clear "No E2E mock registered for ..." message instead of hanging for the
  full timeout.
- `mockOrganizationDetail()` / `mockOrganizationAccess()` — mock the
  `:organizationId` route subtree's resolver (`GET /api/organizations/{id}`)
  and the guard-consumed access payload (`GET /api/organizations/{id}/me`).
  Pass `{ permissions: [...] }` to `mockOrganizationAccess` to test a
  permission-denied guard redirect instead of the default (every
  `ORGANIZATION_PERMISSION` granted).
- Register, MFA, and password-reset all share one response envelope for
  their request/resend endpoints (`success`/`message`/`challengeToken`/...) —
  see `challengeOutput()` in `api-fixtures.ts`.
- `OtpVerificationForm` (`support/pages/otp-verification-form.ts`) is a
  composable helper, not a page object — instantiate it scoped to a page's
  root locator. It fills PrimeNG's `p-inputotp` (one native `<input>` per
  digit) by writing the full code into the first cell, which triggers the
  component's own paste-distribution logic across the remaining digits.

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
