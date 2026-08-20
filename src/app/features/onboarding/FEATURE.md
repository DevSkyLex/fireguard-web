# Onboarding Feature

## Purpose

Owns the organization **guided activation** flow — a **mandatory** onboarding that
a new user must complete (organization → plan → team → facility → equipment)
before reaching the rest of the application.

This feature is responsible for:

- onboarding state retrieval and progression (start, execute, skip, rollback),
- the split-layout activation wizard (`/onboarding`),
- the steps showcase contributed to the split layout left panel,
- the wizard-access guard and the mandatory-onboarding gate.

This feature does not own organization management after activation. Ongoing
organization workflows belong to `features/organization`. It creates the
activation resources through the published `@features/organization/setup`
boundary, never through organization subfeature stores.

## Entry Points

- Routes: `onboarding.routes.ts`, mounted from `src/app/app.routes.ts` at
  `/onboarding`.
- Public API: none. The feature root barrel was removed — it `export *`-ed the
  state, models, data-access, guards and providers trees and had no external
  consumer. Internal code imports the concern barrels directly.
- Layout contribution: `withOnboardingShowcase()` (split layout showcase slot),
  declared alongside the shell's own default panel on the `/onboarding` route
  in `app.routes.ts` — its priority `1` outranks the layout's `0`, so it wins
  the slot without the layout needing to know onboarding exists.

## Routes

- `/onboarding` — the mandatory activation wizard, a **top-level route** rendered
  in the `SplitLayout` (the same shell as `/auth/*`). `authGuard` and
  `maintenanceGuard` are applied on the mounting route in `app.routes.ts`,
  alongside the other top-level shells that share them; `onboardingGuard`
  itself is declared inside `onboarding.routes.ts`, guarding the wizard's one
  route. The mounting route also sets `data: { splitWidth: 'xl' }`, which
  `SplitLayout` binds as its own `splitWidth` input through
  `withComponentInputBinding()`: the wizard's widest step (`select_plan`)
  needs more than the shell's shared `md` (28rem) default. `2xl` was tried and
  rejected — at that cap the form column's floor pushes the showcase panel
  below half its width between the `lg` breakpoint and roughly 1472px of
  viewport, unbalancing the very panel the wizard depends on for its
  progress rail.
- The dashboard shell's root route (`app.routes.ts`, the `DashboardLayout`
  mount) carries `onboardingRequiredGuard` in its own `canActivate`, forming
  the mutual gate described under "Invariants". `authGuard`/`maintenanceGuard`
  are **not** additionally applied there by this change — the dashboard root
  already had neither, and widening that coverage is a separate decision left
  to a dedicated pass, not bundled into mounting onboarding.

## State and Data Access

Primary store: `OnboardingStore` (root-provided).
Primary service: `OnboardingService` (extends `HydraApiService`).

The store exposes per-action `CallState`s plus progress-oriented computed signals
(`steps`, `nextStep`, `activeStepIndex`, `completedSteps`, `progress`). The
`dismiss`/`resume`/`isDismissed`/`isActivationVisible` surface from the previous
non-blocking design was removed (2026-08-20) — onboarding is mandatory and
nothing rendered it. The API's `POST /onboarding/{dismiss,resume}` endpoints
still exist; rebuilding a dismissible checklist would re-add the transport.

## Cross-Feature Dependencies

- Creates activation resources through `@features/organization/setup`.
- The `create_first_equipment` step's form imports the canonical
  `EQUIPMENT_TYPE_OPTIONS` from the equipments subfeature public API
  (`@features/organization/features/equipments`) instead of keeping a local
  copy — the equipment type catalog is owned there. `create_first_facility`'s
  type options **are** a local copy (`options/onboarding-facility-type-options.constants.ts`):
  the facilities subfeature is not on the allowed-surface list below, so its
  own `FACILITY_TYPE_OPTIONS` is a private path from here.
- The `select_plan` step proposes a subscription using the organization-owned,
  root-provided `PlanService` + `BillingService` (`@features/organization/data-access`)
  and the billing/plan types from `@features/organization/models` — onboarding runs on
  its own top-level route outside the dashboard's scoped
  `provideOrganizationFeature()`, so the step talks to these root-provided services
  directly against the onboarding target organization.

These four surfaces — `setup`, `models`, `data-access`, and
`features/equipments` — are the **complete** set of organization code onboarding may
consume, and the list is **lint-enforced**: `.oxlintrc.json` restricts
`src/app/features/onboarding/**` to exactly them, so a deep import into an
organization private path fails `npm run lint` and therefore CI. To widen the
dependency, record it here first, then extend that rule (`ARCHITECTURE.md` §4.1).

- Contributes `OnboardingShowcase` to the split layout showcase slot via the
  layout slot contract (`ExclusiveSlotFeature`, `@shared/layout-slot`),
  claimed with `withOnboardingShowcase()` at priority `1` against the
  layout's own default panel at priority `0`.

## UI

- `ui/pages/onboarding-wizard-page/` — the route entry. Bootstraps the record
  (`OnboardingStore.initialize()`), renders the active step's rail and form,
  lazily loads each step's own catalog (plan/pricing, roles), creates the
  underlying resource through `@features/organization/setup`, and confirms
  the step through the store. Redirects to `/` once `state` is `completed`.
- `ui/components/onboarding-step-rail/` — the read-only progress list, shared
  verbatim by `OnboardingShowcase` (`lg` and up, inside the split shell's
  branded panel) and the wizard page's own in-content copy (below `lg`, since
  that is the shell's own breakpoint for showing the panel at all — not `xl`
  as an earlier draft of this document said).
- `ui/components/onboarding-showcase/` — the split shell's showcase contribution for `/onboarding`.
- `ui/forms/` — one form per step: `onboarding-organization-form`,
  `onboarding-plan-form`, `onboarding-members-form`,
  `onboarding-facilities-form`, `onboarding-equipment-form`. The last two
  stage rows locally (facilities capped at 5, matching the step's own copy;
  members uncapped) and submit the whole batch — including an empty one,
  since both steps are skippable — rather than calling a service per row.
- `models/onboarding-step-status-tag/` — the presentation registry for
  `OnboardingStepStatus`, resolved by the rail instead of branched on in its
  template (`ARCHITECTURE.md` §10.10). Only the two-ends rule's terminal
  states carry colour (`completed` success, `blocked` danger); `pending` and
  `skipped` both stay neutral.

## Routing and SSR Notes

- Onboarding is **mandatory**: `app.routes.ts` adds `onboardingRequiredGuard`
  to the dashboard shell's root route (`DashboardLayout`), redirecting any
  non-completed (or missing) record to `/onboarding`. `onboardingGuard`, on
  the wizard's own route, keeps a completed user from re-opening it (redirects
  to `/`). Together they form a mutual gate.
- `OnboardingStore.ensureLoaded()` owns the SSR/`TransferState` handoff. It is
  the first thing both guards call, on both server and browser — which
  `initialize()` is not: the server filled the store, `initialize()` returned
  early, and the key was never written, so the browser refetched on hydration.
  The wizard page still calls `initialize()` itself (both sides): when no
  record exists yet, `ensureLoaded()` alone cannot create one — `initialize()`
  is the only caller of `start()`.

## Invariants

- Onboarding blocks navigation: no dashboard/organization/account access until the
  flow is `completed`. The backend session carries the state of record
  (`in_progress` / `completed` / `blocked`); the frontend reflects it and gates on
  it.
- Because the backend auto-detects facility/equipment existence, creating those
  resources anywhere advances the flow.
- Progress is presented in two places that share the `ONBOARDING_STEP_PRESENTATION`
  registry: the split-layout showcase rail (`lg+`) and a compact in-content
  stepper (below `lg`).
- The wizard page is the route-entry orchestrator; step bodies delegate creation
  to `@features/organization/setup` and confirm via the store.
- **No `unsavedChangesGuard` on `/onboarding`.** Each step persists to the
  backend the moment its form is submitted — `OnboardingWizardPage.confirmStep`
  creates the resource and confirms the step in the same call, with no batched
  or locally-drafted state that a navigation away could lose beyond what the
  create pages already guard (`DESIGN.md` § Action Surfaces). There is
  therefore nothing for the guard to protect once a step has advanced; an
  in-progress, not-yet-submitted step is unaffected by leaving, since nothing
  was ever written for it.

## Deferred

Recorded here rather than built speculatively (§2.9 — wait for a real need):

- **Yearly billing.** `select_plan` always proposes the monthly cadence; a
  yearly toggle is a real feature, not a checkbox, and nothing today asks for
  it during activation. `BillingInterval` already supports `'year'` when it
  does.
- **Shell setup checklist.** The `isActivationVisible`/`dismiss`/`resume`
  store surface from the previous non-blocking design was removed (2026-08-20)
  — onboarding is mandatory, so there is no dashboard checklist to dismiss or
  resume. The backend endpoints remain if a dismissible checklist returns.
- **`authGuard`/`maintenanceGuard` on the dashboard shell root.** Only
  `onboardingRequiredGuard` was added there by this change; the root had
  neither guard before and widening that coverage is a distinct decision.
