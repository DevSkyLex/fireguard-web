# Onboarding Feature

## Purpose

Owns explicit workspace selection and creator activation: organization → plan → team → facility → equipment.
It retrieves and advances the onboarding record and renders progress above the form in the split
layout. Ongoing organization management belongs to `features/organization`; activation uses
its published setup boundary.

## Entry Points

- Routes: `onboarding.routes.ts`, mounted at `/onboarding` in `app.routes.ts`.
- Public API: none. Internal consumers use concern barrels.
- Layout: the existing auth showcase fills the left half; layouts own no workflow state.

## Routes

- `/onboarding` uses `SplitLayout` with `splitWidth: 'xl'` and `splitAlign: 'start'`;
  desktop forms stay anchored as prepared rows are added. Mounting guards are `authGuard`
  and `maintenanceGuard`, and `onboardingGuard` guards only `/onboarding/create`.
- `onboardingRequiredGuard` redirects accounts without completed creation or independent
  workspace access to the entry resolver. A failed onboarding read is an unknown state, not proof that activation is incomplete;
  organization access guards remain authoritative. The dashboard parent authenticates before this
  guard runs on its Account/Organization children, preserving anonymous deep-link destinations.
- Completing activation opens `/organizations/:targetOrganizationId`; when no target exists,
  a safe `returnUrl` or `/` is the fallback. Visiting an already completed wizard instead
  resumes its safe `returnUrl`, falling back to the target organization and then `/`.
- The shell mounts auth's `withLogoutControl()` because the mandatory gate must still permit
  signing out. The dashboard parent rechecks authentication on navigation; maintenance retains its existing scope.

## State and Data Access

Primary store: root-provided `OnboardingStore`. Primary transport: `OnboardingService`.
The store owns named request states for load, start, execute, skip and rollback. Session end
and explicit invitation acceptance invalidate the cached record and its hydration handoff.
Invalidation cancels all in-flight response subscriptions, including guard reads and initialization,
so an old session or membership snapshot cannot repopulate the cache after it has been cleared.
Successful progression clears obsolete errors from the previous lifecycle command.

The page-scoped `OnboardingSetupStore` prepares a durable batch through `OnboardingService`,
then creates each remaining item through `OrganizationSetupService` with its server session and
stable item key. Prepared inputs and completed resource IDs survive reloads. Responses from another
session, incomplete preparation and missing completion receipts cannot advance the wizard.
Prepared and refreshed snapshots also update the root cache through a typed same-session event,
so leaving and returning through browser history cannot restore an obsolete journal. Snapshots from
an ended or different session are ignored.
The page confirms successful batches through `OnboardingStore` and owns route-local named
`CallState`s only for catalogs and Billing checkout.
Plan/pricing, roles and persisted site summaries load only when their step becomes active.
Empty catalogs are successful states and never trigger automatic retry loops; failures have an
explicit local retry. Subscriptions end with the page.

## Cross-Feature Dependencies

- `@features/organization/setup`: activation commands, role/site summaries and the
  `organizationInvitationAcceptStoreEvents.acceptSucceeded` event that invalidates onboarding before guards reload.
- `@features/organization/data-access`: root `PlanService` and `BillingService`, because
  onboarding runs outside the dashboard's scoped organization provider.
- `@features/organization/models`: plans, billing, access policies, domains and admission contracts.
- `@features/organization/utils`: localized admission failure mapping.
- `@features/auth/data-access`, `models` and `ui/forms`: mailbox proof transport and OTP form.
- `@features/account`: notification-center invalidation counter; no private notification content.
- `@features/organization/features/equipments`: the canonical `EQUIPMENT_TYPE_OPTIONS`.
- `@features/auth`: session lifecycle events; `@features/auth/utils`: safe return URL validation.
- `@shared/layout-slot`: the layout contribution contract.

The organization surfaces listed here are the complete lint-enforced allowlist. No organization
subfeature store or private transport is consumed by onboarding. Facility type choices remain
local until their owning feature publishes an approved shared contract.

## UI

- Central mobile mode selects searchable drawers for equipment type and multi-site choices;
  desktop keeps its select and combobox. Both write the same Signal Forms fields. Changing
  orientation or interaction mode preserves the wizard form and staged draft. The sticky mobile footer
  clears the published navigation height, with a zero fallback outside the dashboard shell.
- Forms use an open, width-capped canvas without nested cards; fields, radio choices, staged items,
  separators and actions use the installed Spartan anatomy. Long values wrap within their rows.
- Progress stays above the form at all widths. It shows the current
  position and native Spartan progress, with the full read-only rail in a collapsible. Steps use native
  items and a muted active state; ordinary status text stays accessible without repeating it visually.
- Every step has one named submit action and a skip only when `skippable && skipAvailable`.
  The same approved skip remains available when an optional catalog fails or is empty.
  Both the primary and optional skip buttons fill the form width and have the same minimum height. Its footer sticks within the shell's scroll area on phones; desktop actions follow the fields. Facilities and equipment remain required.
- Forms own Signal Forms and emit setup inputs. Related fields use native field groups;
  the server generates the organization slug. Plans are full-width mutually exclusive radio rows,
  with larger plan names, price and a vertical list of quota summaries from Billing,
  with the current/default plan identified and the Stripe exit named before submission.
- Members and facilities stage compact item rows. A valid current draft is automatically included
  on submit; Add another is needed only for an additional row. Rows can be edited or removed
  before they are saved. A partial batch retains successful rows, identifies failed rows and
  retries only unsaved entries. Saved rows cannot be edited or removed from the local batch.
- Invitations and facilities are capped at five per batch and cannot submit an empty batch. An empty member
  draft uses the explicit skip action when available; a required member step needs at least one invitation.
- Invitation emails are compared after trimming and case normalization; edits and batch submission
  cannot reintroduce duplicates. Prepared rows display their role and native item separators.
- Facility addresses require an explicitly selected suggestion. Changing the text invalidates
  that selection; street, city, country and postal code are editable Signal Forms fields populated from the provider, never parsed from a display label. Locality edits also invalidate the selection. Its canonical label (including the region when available) and coordinates are persisted together. The page-local
  address search store debounces queries, cancels stale responses and distinguishes failures from
  empty matches. Suggestions load only in the browser through the organization setup facade.
- Facility type options and the selected type share decorative Lucide icons. Confirmed country
  codes select Ng Icons flags loaded on demand; editing the address removes the unconfirmed flag.
- Equipment restores persisted sites when the wizard resumes. One site is automatically attached
  and shown as a summary; multiple sites require an explicit searchable selection. The site ID
  is mapped by the setup facade to the facility IRI in the same equipment creation request.
- API command failures use the app-wide feedback toast once per failed request; forms retain only local field validation. The page keeps retry controls and failed-row markers without repeating the API message inline.
  Catalog loading, empty responses, recoverable failures and blocked activation are distinct.

## Routing and SSR Notes

`OnboardingStore.ensureLoaded()` owns the small route-critical `TransferState` handoff used by
both guards. The browser consumes and removes the key; no token or broad organization payload
is serialized. Only the creator page calls `initialize()` to start a missing record. Requests are not duplicated
between a successful guard load and page initialization.

## Invariants

- The API's five steps, available actions, skip/rollback permissions and completion state remain
  authoritative. Progress is informative and never navigates freely between committed steps.
- Creation results are journaled atomically by the server. After a lost response, reload or failed
  confirmation, saved resources are reused and only unfinished items are created. A completed singleton
  exposes confirmation directly; saved batch rows remain immutable and retry preserves their item keys.
- Reloaded equipment setup restores its site catalog; the initial assignment belongs to the same
  idempotent equipment creation request. Joined organizations never become creation rollback targets.
- Only the explicit Free plan bypasses Billing. A commercial monthly tariff of zero still opens
  Billing; missing, null or invalid monthly tariffs are unavailable for selection. Checkout never
  confirms the step locally; the server/webhook remains authoritative.
- Completion announces a short success and opens the target organization without another click.
- Unsaved typing remains form-local; the entire submitted batch is persisted before any resource write.
  The server journal is browser-only secondary data and is omitted from the route-critical SSR handoff.
- Successful step changes focus the rendered title and announce its position and label; failed
  commands restore their initiating control without stealing focus moved elsewhere. If a completed
  singleton replaced the form, its confirmation action receives focus instead. Resource command
  feedback is dispatched once through typed store events.
- No dismissible checklist or second onboarding flow is introduced in the application shell.

## Workspace selection and admission

- `/onboarding` resolves a safe invitation first, existing access second, then a pinned creation
  or `/onboarding/workspace`. Reading choices never starts creation.
- `/onboarding/workspace` owns the invitation-first choice; `/onboarding/requests` shows request
  history. `/onboarding/create` retains the five-step creator flow. Creation is committed through
  an explicit `intent: create` start command before entering the wizard.
- `accessibleOrganizationId` permits joined members past the activation gate independently of
  `targetOrganizationId`. The latter remains a server-owned, resumable creation target.
  Joined organizations never enter the creator rollback stack.
- Page-scoped `WorkspaceStore` exposes separate request states for discovery, admission,
  requesting, cancellation, mailbox challenge/confirmation and creation. Commands are exclusive.
  Choices, requests and OTP challenges load browser-only; none enter TransferState.
- Workspace commands publish typed feedback and membership invalidation once from the store.
  Pages retain query retry controls and field validation without duplicating command messages.
- Organization owns eligibility and allowed actions. Auth/User owns mailbox proof. The workspace
  page reuses the Auth OTP form only when server proof is missing; OAuth profile verification
  alone does not unlock discovery.
- Successful admission dispatches the published organization membership event, invalidating
  membership and onboarding caches before navigation. Realtime notification invalidation and
  manual refresh reread actions; no client grants access from a notification payload.
- Desktop uses equal columns from 1024 px and a top-aligned content column capped at 576 px.
  Smaller screens keep brand, theme and logout while hiding the decorative showcase.

## Adaptive interaction

Equipment type and multi-site choices use searchable mobile drawers and native desktop controls,
selected by the central interaction mode signal. Both write the same Signal Forms fields. Interaction-mode
and orientation changes preserve the field tree and staged draft. The sticky mobile footer clears
the published navigation height with a zero fallback outside the dashboard shell.
