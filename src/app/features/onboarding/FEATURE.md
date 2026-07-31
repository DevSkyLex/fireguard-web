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

- Routes: `onboarding.routes.ts`
- Public API: none. The feature root barrel was removed — it `export *`-ed the
  state, models, data-access, guards and providers trees and had no external
  consumer. Internal code imports the concern barrels directly.
- Layout contribution: `withOnboardingShowcase()` (split layout showcase slot)

## Routes

- `/onboarding` — the mandatory activation wizard, a **top-level route** rendered
  in the `SplitLayout` (the same shell as `/auth/*`), guarded by `authGuard`,
  `maintenanceGuard`, and `onboardingGuard`.

## State and Data Access

Primary store: `OnboardingStore` (root-provided).
Primary service: `OnboardingService` (extends `HydraApiService`).

The store exposes per-action `CallState`s plus progress-oriented computed signals
(`steps`, `nextStep`, `activeStepIndex`, `completedSteps`, `progress`). It still
carries `dismiss`/`resume`/`isDismissed`/`isActivationVisible` from the previous
non-blocking design; these are no longer surfaced now that onboarding is
mandatory.

## Cross-Feature Dependencies

- Creates activation resources through `@features/organization/setup`.
- The `create_equipment` step's form imports the canonical `EQUIPMENT_TYPE_OPTIONS`
  from the equipments subfeature public API (`@features/organization/features/equipments`)
  instead of keeping a local copy — the equipment type catalog is owned there.
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
  layout slot contract (`SplitLayoutShowcaseSlotFeature`), type-only import.

## Routing and SSR Notes

- Onboarding is **mandatory**: the application shell (`WorkspaceLayout` route)
  adds `onboardingRequiredGuard` to its `canActivate`, redirecting any
  non-completed (or missing) record to `/onboarding`. `onboardingGuard` keeps a
  completed user from re-opening the wizard (redirects to `/`). Together they
  form a mutual gate.
- `OnboardingStore.ensureLoaded()` owns the SSR/`TransferState` handoff. It is
  the first thing both guards call, on both server and browser — which
  `initialize()` is not: the server filled the store, `initialize()` returned
  early, and the key was never written, so the browser refetched on hydration.

## Invariants

- Onboarding blocks navigation: no dashboard/organization/account access until the
  flow is `completed`. The backend session carries the state of record
  (`in_progress` / `completed` / `blocked`); the frontend reflects it and gates on
  it.
- Because the backend auto-detects facility/equipment existence, creating those
  resources anywhere advances the flow.
- Progress is presented in two places that share the `ONBOARDING_STEP_PRESENTATION`
  registry: the split-layout showcase rail (`xl+`) and a compact in-content
  stepper (below `xl`).
- The wizard page is the route-entry orchestrator; step bodies delegate creation
  to `@features/organization/setup` and confirm via the store.
