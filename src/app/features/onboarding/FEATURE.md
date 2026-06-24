# Onboarding Feature

## Purpose

Owns the organization **guided activation** flow — a non-blocking onboarding that
helps a new user reach first value (organization → plan → team → facility →
equipment → first inspection) without ever locking them out of the application.

This feature is responsible for:

- onboarding state retrieval and progression (start, execute, skip, rollback,
  dismiss, resume),
- the focused single-column activation wizard (`/onboarding`),
- the persistent shell setup checklist contributed to the dashboard topbar,
- the wizard-access guard.

This feature does not own organization management after activation. Ongoing
organization workflows belong to `features/organization`. It creates the
activation resources through the published `@features/organization/setup`
boundary, never through organization subfeature stores.

## Entry Points

- Routes: `onboarding.routes.ts`
- Public API: `index.ts` (state, models, data-access, guard, providers)
- Shell contribution: `withSetupChecklist()` (dashboard topbar slot)

## Routes

- `/onboarding` — the optional, resumable activation wizard, rendered in the
  `FocusedLayout`.

## State and Data Access

Primary store: `OnboardingStore` (root-provided).
Primary service: `OnboardingService` (extends `HydraApiService`).

The store exposes per-action `CallState`s plus activation-oriented computed
signals: `isDismissed`, `progress` (`{ done, total }`), and `isActivationVisible`.

## Cross-Feature Dependencies

- Creates activation resources through `@features/organization/setup`.
- The `select_plan` step proposes a subscription using the organization-owned,
  root-provided `PlanService` + `BillingService` (`@features/organization/data-access`)
  and the billing/plan models — the org feature stores are route-scoped to the
  dashboard, so the step talks to the services directly against the onboarding
  target organization.
- Contributes `SetupChecklist` to the dashboard topbar via the layout slot
  contract (`DashboardLayoutTopbarSlotFeature`), type-only import.

## Routing and SSR Notes

- Onboarding is **non-blocking**: it is no longer part of the `DashboardLayout`
  `canActivate`. `onboardingGuard` only guards the `/onboarding` wizard route,
  redirecting to `/` when the flow is already `completed`.
- `OnboardingStore.initialize()` keeps the SSR/`TransferState` handoff for the
  wizard; the shell checklist hydrates browser-only via `OnboardingStore.load()`.

## Invariants

- Onboarding never blocks navigation. The backend session carries the state of
  record (`in_progress` / `completed` / `blocked`) plus a `dismissed` flag; the
  frontend reflects it but never hard-locks the app.
- Because the backend auto-detects facility/equipment/inspection existence,
  creating those resources anywhere (wizard, contextual empty state, normal flow)
  advances the flow — the shell checklist reflects progress.
- Activation surfaces (wizard welcome, shell checklist) honor `dismissed`; resume
  is always available from the backend.
- The wizard page is the route-entry orchestrator; step bodies delegate creation
  to `@features/organization/setup` and confirm via the store.
