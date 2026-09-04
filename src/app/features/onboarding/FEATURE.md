# Onboarding Feature

## Purpose

Owns mandatory organization activation: organization → plan → team → facility → equipment.
It retrieves and advances the onboarding record and contributes the progress rail to the split
layout. Ongoing organization management belongs to `features/organization`; activation uses
its published setup boundary.

## Entry Points

- Routes: `onboarding.routes.ts`, mounted at `/onboarding` in `app.routes.ts`.
- Public API: none. Internal consumers use concern barrels.
- Layout contribution: `withOnboardingShowcase()` claims the split showcase slot at priority 1.

## Routes

- `/onboarding` uses `SplitLayout` with `splitWidth: 'xl'` and `splitAlign: 'start'`;
  desktop forms stay anchored as prepared rows are added. Mounting guards are `authGuard`
  and `maintenanceGuard`, and `onboardingGuard` guards the wizard route.
- `onboardingRequiredGuard` on the dashboard shell redirects incomplete activation to the
  wizard. A failed onboarding read is an unknown state, not proof that activation is incomplete;
  organization access guards remain authoritative.
- Completing activation opens `/organizations/:targetOrganizationId`; when no target exists,
  a safe `returnUrl` or `/` is the fallback. Visiting an already completed wizard instead
  resumes its safe `returnUrl`, falling back to the target organization and then `/`.
- The shell mounts auth's `withLogoutControl()` because the mandatory gate must still permit
  signing out. No additional dashboard root auth/maintenance guards are introduced here.

## State and Data Access

Primary store: root-provided `OnboardingStore`. Primary transport: `OnboardingService`.
The store owns named request states for load, start, execute, skip and rollback. Session end
and explicit invitation acceptance invalidate the cached record and its hydration handoff.
Successful progression clears obsolete errors from the previous lifecycle command.

The wizard page orchestrates resource creation through `OrganizationSetupService`, confirms
steps through the store and owns route-local named `CallState`s for catalogs and creation.
Plan/pricing, roles and persisted site summaries load only when their step becomes active.
Empty catalogs are successful states and never trigger automatic retry loops; failures have an
explicit local retry. Subscriptions end with the page.

## Cross-Feature Dependencies

- `@features/organization/setup`: activation commands, role/site summaries and the
  `organizationInvitationAcceptStoreEvents.acceptSucceeded` event that invalidates onboarding before guards reload.
- `@features/organization/data-access`: root `PlanService` and `BillingService`, because
  onboarding runs outside the dashboard's scoped organization provider.
- `@features/organization/models`: plan and billing contracts.
- `@features/organization/features/equipments`: the canonical `EQUIPMENT_TYPE_OPTIONS`.
- `@features/auth`: session lifecycle events; `@features/auth/utils`: safe return URL validation.
- `@shared/layout-slot`: the layout contribution contract.

The four organization surfaces above are the complete lint-enforced allowlist. No organization
subfeature store or private transport is consumed by onboarding. Facility type choices remain
local until their owning feature publishes an approved shared contract.

## UI

- Desktop progress stays in the shell's narrow secondary panel. Mobile shows the current
  position and native Spartan progress, with the full read-only rail in a collapsible.
- Every step has one named submit action and a skip only when `skippable && skipAvailable`.
  The same approved skip remains available when an optional catalog fails or is empty.
  Its footer sticks within the shell's scroll area. Facilities and equipment remain required.
- Forms own Signal Forms and emit setup inputs. Related fields use native field groups;
  organization address customization is secondary. Plans are mutually exclusive radio choices,
  with the current/default plan identified and the Stripe exit named before submission.
- Members and facilities stage compact item rows. A valid current draft is automatically included
  on submit; Add another is needed only for an additional row. Rows can be edited or removed
  before they are saved. A partial batch retains successful rows, identifies failed rows and
  retries only unsaved entries. Saved rows cannot be edited or removed from the local batch.
- Facilities are capped at five per batch and cannot submit an empty batch. An empty member
  draft uses the explicit skip action when available; a non-skippable member step may confirm
  an empty batch according to the existing backend contract.
- Equipment restores persisted sites when the wizard resumes. One site is automatically attached
  and shown as a summary; multiple sites require an explicit searchable selection. The site ID
  is mapped by the setup facade to the facility IRI in the same equipment creation request.
- Global action failures use `hlmAlert`; field errors use the primitive's own validation wiring.
  Catalog loading, empty responses, recoverable failures and blocked activation are distinct.

## Routing and SSR Notes

`OnboardingStore.ensureLoaded()` owns the small route-critical `TransferState` handoff used by
both guards. The browser consumes and removes the key; no token or broad organization payload
is serialized. The page calls `initialize()` to start a missing record. Requests are not duplicated
between a successful guard load and page initialization.

## Invariants

- The API's five steps, available actions, skip/rollback permissions and completion state remain
  authoritative. Progress is informative and never navigates freely between committed steps.
- A resource successfully created in the current page is not recreated when its step confirmation
  fails; retry confirms the step. Batch successes are also retained for the page lifetime.
- Backend existence detection may advance facility/equipment steps. Reloaded equipment setup
  restores its site catalog rather than creating an unattached equipment by default.
- Paid-plan checkout does not confirm the step locally; the server/webhook remains authoritative.
  Monthly billing remains the activation default; no yearly toggle or backend change is added.
- Completion announces a short success and opens the target organization without another click.
- No unsaved-changes guard is introduced: successful step resources persist immediately. Drafts
  and partial batch bookkeeping are page-local; a browser reload rereads server activation state.
- No dismissible checklist or second onboarding flow is introduced in the application shell.
