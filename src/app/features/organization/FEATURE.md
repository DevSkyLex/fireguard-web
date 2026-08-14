# Organization Feature

## Purpose

Owns organization context and organization-scoped business workflows.

This feature is responsible for:

- active organization context (default-workspace resolution and the persisted last-organization preference),
- organization member, invitation, role, and settings (general & branding) data,
- organization subscription plan selection and plan-driven resource quotas (usage meters),
- organization billing (Stripe-hosted Checkout / customer Portal and invoice history),
- the organization landing page ("Today"): named work queues holding real
  interventions — overdue, sent back, awaiting review, and waiting to sync (the
  last read from the local outbox) — above them a fixed near-term KPI row and
  the backend's alert feed (counts only), and below them a "Recently updated"
  interventions list, all three sourced from the same `DashboardStore` copy
  the queues do not depend on,
- the organization statistics page: facility, member, equipment, and inspection KPI cards
  and trend charts (overview, inspection quality, non-conformities opened/resolved, asset growth),
- organization-scoped permission helpers derived from the active member access payload,
- organization overview pages,
- nested organization-scoped subfeatures: facilities, equipments, inspections, interventions,
  checklists and collaboration (the conversational surface),
- publishing organization context to layouts and approved consumers.

This feature does not own generic shell composition or account-level user identity.

## Entry Points

- Routes: `organization.routes.ts`
- Public API: `index.ts`
- Root provider: `providers/organization.provider.ts`

## Routes

> **Currently mounted:** `/organizations`, `/organizations/:organizationId` (the landing page),
> `messages`, `channels`, `interventions`, `equipments`, `facilities`, `inspections`, `calendar`,
> `members`, `members/:memberId`, `team`, `settings`, and `/organizations/invitations/accept`
> (mounted at the app root, outside this subtree — see below). `statistics` and `checklists` are the
> feature's remaining contract and are already listed by the sidebar navigation behind their
> permissions; each is remounted in `organization.routes.ts` as its page is rebuilt. A listed
> destination whose route is absent is a rebuild in progress, not a deviation. `assets` (the estate
> explorer) is future work and is **not yet listed by the sidebar**: the navigation's interim entries
> are the two routes it will absorb, `facilities` and `equipments`, each gated on its own read
> permission.

- `/organizations` — redirect-only: `organizationGuard` forwards to the default
  workspace (the last organization persisted in the `last-organization` cookie
  when still accessible, else the first accessible organization, else
  `/onboarding`). An `excluded` query parameter names an organization the guard
  must not pick again (redirect-loop breaker set by failing guards). There is
  no organization list page; switching happens through the sidebar switcher.
- `/organizations/:organizationId` — the "Today" landing page; the landing guard
  redirects a member who can read neither interventions nor the dashboard to their
  first permitted destination
- `/organizations/:organizationId/assets` — not yet mounted. The planned estate
  explorer, on two first-level axes: **by site** (the hierarchy on the left, the
  selected site's equipment and inspections on the right) and **everything**
  (the same panes unscoped, so an operator holding a serial number and no site
  can still find it). Once built it becomes the single navigation entry for the
  estate, replacing the "Facilities" and "Equipments" pair below; both route
  trees stay mounted regardless so records, creation forms and deep links keep
  resolving
- `/organizations/:organizationId/messages` — the direct-messages workspace, owned by the
  `collaboration` subfeature, gated by `organization.messaging.read`. `messages/:conversationId`
  opens one. Reached from the shell's bottom navigation, not from the organization sections
- `/organizations/:organizationId/channels` — the channel workspace (group "salons"), owned by the
  `collaboration` subfeature, gated by `organization.messaging.read`. `channels/:channelId` opens
  one. Listed in the organization sections (`navigation/`), unlike direct messages: channels are
  organization workspaces, while conversations follow the reader
- `/organizations/:organizationId/facilities`
- `/organizations/:organizationId/equipments`
- `/organizations/:organizationId/inspections`
- `/organizations/:organizationId/statistics` (activity KPIs and trend charts; gated by `organization.dashboard.read`)
- `/organizations/:organizationId/checklists`
- `/organizations/:organizationId/members` (members + invitations; gated by `organization.members.*`)
- `/organizations/:organizationId/members/:memberId` — another member's profile, read-only
- `/organizations/:organizationId/team` (roles & permissions only; gated by `organization.roles.*`)
- `/organizations/:organizationId/settings` (tabbed via `?tab=`: general & branding, subscription, usage, notifications, regional & formats, danger zone; gated by `organization.settings.write`)
- `/organizations/invitations/accept` — public invitation landing page; the
  route is mounted at the **app root** (outside the auth-guarded dashboard
  shell, in `app.routes.ts`) so a logged-out invitee can preview the invitation
  and sign in / sign up before accepting. The page is owned by this feature.

The `:organizationId` parent route resolves organization context before child pages render.
Organization navigation and routes are filtered by the active member permissions. Subscription
plans cap resource quantities (see Subscription quotas below); they do not gate routes.

The settings page's danger-zone tab is additionally gated by the `organization.delete` permission.

**"Delete" is an archive, and it is reversible.** `DELETE /api/organizations/{id}` soft-deletes:
the owned facilities, equipment, inspections and interventions are preserved, and
`POST /{id}/restore` brings the organization back. The endpoint also requires a **`slug` query
parameter** retyping the organization's current slug, or it refuses with 422 and archives nothing —
the same confirmation `POST /{id}/transfer-ownership` takes in its body. The delete dialog gates on
the organization **name** in the reader's own terms; the slug travels from the resolved
organization, so the two are not the same string when a name and its slug differ.

Ownership transfer is **outside RBAC**: only the organization's current owner may call it, and no
permission substitutes for that. Suspend and restore, by contrast, need only
`organization.settings.write` — the same permission the legacy `isActive` toggle already required. Notification and regional preferences are persisted via the
settings `PATCH` but are not yet enforced (notification dispatch and app-wide date/locale
formatting consume them in follow-up work).

## State and Data Access

Primary stores:

- `ActiveOrganizationStore`
- `OrganizationMemberAccessStore`
- `OrganizationStore`
- `OrganizationRoleListStore`
- `OrganizationPlanStore` (scoped to the `OrganizationPlanSelector` in the settings Subscription tab; self-service plan change)
- `OrganizationQuotaStore` (root-provided; active organization quota usage feeding the settings Usage tab and the create-flow quota checks)
- `OrganizationBillingStore` (component-scoped to the settings Subscription tab; current subscription, plan pricing, hosted Stripe Checkout / Portal, invoice history)
- `OrganizationDashboardStore` (aggregate slice: KPI cards plus the per-metric trend stores under `state/organization-dashboard/slices/`; component-scoped separately by both the landing page — which reads the overview counts, the alert feed and the recent-interventions list, but none of the trend slices or the comparison block the statistics page's KPI deltas need — and the statistics page, each fetching its own copy of the aggregate `/dashboard` payload)
- `FacilityTreeStore` (owned by the facilities subfeature, component-scoped to the assets explorer; the site hierarchy, loaded one branch at a time)
- `OrganizationTodayStore` (component-scoped to the landing page; the work queues. Two independent `CallState` fields: the collection-backed queues, and the unsynced queue read from the local outbox so it still renders offline. Replaces the count-only `OrganizationAttentionStore`)
- `OrganizationSettingsStore` (component-scoped to the settings page; general & branding mutations, logo upload and removal, and the danger-zone actions — archive, restore, suspend, ownership transfer and leaving the organization. One named `CallState` per action, since several are offered side by side and a shared one would leak an error between controls. Refreshes `ActiveOrganizationStore` on every mutation that returns an organization)
- `OrganizationMembersStore` (component-scoped to the members page; members & invitations as `withEntities` collections, roles, role assignments, invite/resend/revoke, single & bulk member removal, and the per-invitation accept-link map. `loadMembers` re-issues the server-side roster query with the page's search and status filters, so `membersTotal` — the "Total members" KPI — tracks the current filter, while `membersActiveTotal` — the "Active" KPI — is a fixed organization-wide snapshot fetched once per `load`; keep that split when touching either)
- `OrganizationTeamStore` (component-scoped to the roles page; roles and the permission catalog)
- `OrganizationInvitationAcceptStore` (page-scoped; loads the public invitation preview and accepts an invitation token)

Primary services:

- `OrganizationService` (includes `changePlan` and `getQuota`)
- `PlanService`
- `BillingService` (Stripe Checkout / Portal session creation and invoice listing)
- `OrganizationInvitationService`
- `OrganizationMemberService`
- `OrganizationRoleService`

Access helpers (`access/`):

- `OrganizationPermissionService` — checks the active member's effective permissions.

## Subscription quotas

A subscription plan caps the quantity of countable resources (`ORGANIZATION_QUOTA_RESOURCE`:
members, facilities, equipment, inspections). A plan stores a `limits` map of resource → integer
cap; a resource absent from the map is unlimited. Plans do **not** disable features — they only
limit quantities.

- Enforcement is **strict and backend-owned**: each create flow (member add/invite, facility,
  equipment, inspection) asserts the quota before persisting and returns **HTTP 409** when the cap
  is reached. There is no frontend route gating.
- The settings **Usage** tab (`OrganizationUsagePanel`) renders meter bars
  (used / limit per resource, with percentages and unlimited rows), driven by
  `OrganizationQuotaStore`.
- Plan cards consume `PlanOutput.quotas`: a backend-built list of `{ resource, label, limit, summary }`
  where `summary` is a ready-made sentence (e.g. "Up to 125 facilities" / "Unlimited inspections")
  phrased server-side in `OrganizationQuotaResource::summarize`, so the UI never re-derives the wording.
- Plan changes are self-service via `OrganizationPlanStore.changePlan`, which refreshes the active
  organization and reloads the quota usage so the meters reflect the new limits immediately.

Nested subfeatures under `features/organization/features/` own their own local routes, pages, and
business flows while remaining under organization ownership. Each mirrors a top-level backend module
(`Facility`, `Equipment`, `Inspection`, `Intervention`, `Messaging`) whose resources belong to an
organization; the backend siblinghood is not what decides placement here, ownership of the data is.

## Published Contracts

- `ORGANIZATION_CONTEXT_PORT`
- `OrganizationContextPort`
- `ORGANIZATION_MEMBER_ACCESS_PORT`
- `OrganizationMemberAccessPort`
- `MEMBER_DIRECTORY_PORT`
- `MemberDirectoryPort`
- `organization/setup`
- `OrganizationSetupService`
- `organization/services`
- `SubmissionGateService`
- `withOrganizationSwitcher()`
- `withOrganizationNav()`

These contracts are the stable boundaries for approved consumers:

- layouts consume active organization context through `ORGANIZATION_CONTEXT_PORT`,
- approved sibling features consume current organization member roles and permissions through `ORGANIZATION_MEMBER_ACCESS_PORT`,
- approved sibling features resolve a bare member id to a name and an avatar through `MEMBER_DIRECTORY_PORT`,
- onboarding consumes organization-owned setup workflows through `organization/setup`,
- this feature's own pages, and its nested subfeatures, build a surface's claim on a store that
  multiplexes several mutations through one shared `mutationCallState` with
  `SubmissionGateService` (`organization/services`). A gate reports busy and error only for the
  write its own surface submitted, which is what keeps an earlier or sibling mutation's failure out
  of the next dialog opened. It is a stopgap for stores that share one mutation call state —
  a store with named per-action `CallState` fields (`ARCHITECTURE.md` §10.11) needs no gate,
- a shell contributes the organization switcher to its sidebar-header slot through
  `withOrganizationSwitcher()`, and the organization navigation to the top of its sidebar-nav slot
  through `withOrganizationNav()`. Both are slot contribution factories — the shell renders the
  component without importing it, and never learns that an organization exists.

`navigation/` is the single source for what the sidebar lists and, once it returns, what the
landing guard falls back to: `ORGANIZATION_NAVIGATION_ITEMS` carries each destination's required
permissions, and `buildOrganizationNavigation()` resolves the sections the active member may
actually reach. Route visibility and fallback behaviour cannot diverge because both read this list.

**Direct messages are the one destination listed by the shell's bottom block rather than here;
channels are listed here.** Direct conversations are scoped to one organization on the API —
`organization` is required on every call, the permissions are `organization.messaging.*`, and the
Mercure topic is per organization — but they follow the reader rather than the workspace, so the
row sits under Support with the other utilities. Channels are the opposite case: they are
organization workspaces, so their row lives in `navigation/` with the other organization sections,
behind the same `organization.messaging.read` floor. The shell completes its route with `ORGANIZATION_CONTEXT_PORT.selectedOrganizationId()`
and withholds it entirely from a member without `organization.messaging.read`; the permission
constant still comes from this feature's public API, so the gate cannot drift from the guard.

**The assistant is in neither list.** It is not a destination — it has no URL and opens over the
current page — so it is a single control in the header's action cluster, published by the
`collaboration` subfeature, which carries its own sheet rather than claiming a shell panel. A
navigation row would promise an address that does not exist. **The intervention sync indicator is
likewise absent from both lists**, for the same reason: it is not a destination either, and is
published by the `interventions` subfeature as a header-action slot contribution
(`withSyncIndicator()`, documented in that feature's own `FEATURE.md`).

`OrganizationSwitcher` (`ui/components/organization-switcher/`) is feature-owned even though it
only ever renders inside a layout: it reads organization state, and rendering location does not
transfer ownership (`ARCHITECTURE.md` §2.7). It provides `OrganizationStore` itself, because that
store is not root-provided.

**The URL chooses the organization; the workspace outlives the route.** The dashboard shell serves
global pages too — `/account` first among them — and those name no organization of their own.
`ActiveOrganizationStore` therefore keeps a `rememberedOrganizationId`, seeded from the
`last-organization` cookie and rewritten on every organization-scoped navigation, and
`selectedOrganizationId` reads `routed ?? remembered`. Stepping into the account no longer empties
the column: the switcher still names the workspace and every row still leads into it.

The invariant this preserves is that the fallback is a **memory of a previous URL, never a second
way to choose**. `:organizationId` always outranks it, the port stays read-only, and picking another
organization is still a navigation. A stale identifier is invalidated by `organizationGuard`, which
already validates the cookie before redirecting to it.

`selectedOrganizationId` is consequently non-null on every signed-in page once a first organization
has been opened. `OrganizationSwitcher` has no "none selected" state left — it renders a skeleton
until the list arrives — and `OrganizationNav` renders no inert row.

**Another member's profile is organization-owned, and thin by force rather than by choice.** There
is still no `GET /api/users/{id}`. A single-member endpoint now exists —
`GET /api/organizations/{organizationId}/members/{memberId}`, exposed as `OrganizationMemberService.get`
— but it is a **deliberately thinner projection than the list**: the backend resolves no User
module data on it, so `displayName` comes back as the raw `userId` and `email`, `avatarUrl`,
`roleNames` and `isOwner` are absent. Reading one member through it would therefore _degrade_ the
profile page, which is why `/organizations/:organizationId/members/:memberId` keeps sourcing
`MEMBER_DIRECTORY_PORT` (the list) and renders name, picture, roles and whether the membership is
active — and nothing else, because nothing else reaches the client. It carries no edit control for
the same reason. Widening it means widening `MemberDirectoryEntry` first, and the backend before
that.

`isOwner` and `roleNames` are populated **only by the list endpoint**; every mutation response
(reactivate, set-roles) and the member detail leave them at their defaults. Read owner status from
a listed member, never from what a write returned.

The route sits under `:organizationId` because that is the truth of it: a person is visible to you
_as a member of an organization you can read_, never in the abstract.

`MEMBER_DIRECTORY_PORT` exists because member IRIs are not dereferenceable: messaging hands out
`/api/organizations/{orgId}/members/{memberId}` with no GET route behind it. Reading the directory
requires `organization.members.read`, which messaging permissions do **not** imply, so the port
publishes `isAvailable` and consumers must degrade to raw ids rather than surface an error. The
store never calls the API without the permission — the request would be a guaranteed 403.

## UI Conventions

List pages (roster, facilities, equipments, inspections, interventions) share one pagination
recipe, `app-list-pagination` (`ui/components/list-pagination/`), and one boundary for the three
empty/error idioms spartan offers: `hlm-empty` with a dashed border (`border border-dashed`) is a
**page-level empty slot** (nothing loaded, no rows to show); `app-empty-state`
(`@shared/empty-state`) is an **in-card or in-section empty slot** nested inside a larger page;
`app-error-state` (`@shared/error-state`) is **every list's error state**, never `hlm-empty`
re-tinted to look like a failure.

**Create-surface placement** follows field count and navigation cost, not precedent: a form of
**3 fields or fewer with no navigation cost** belongs in a dialog; **4 to 8 fields that should
keep the list in context** belong in a right sheet; a form that **needs its own URL or deep-link,
or exceeds 8 fields**, belongs in a route page. The equipment, facility and inspection create
pages predate this rule and stay as route pages — that is a recorded exception, not a precedent
for a new create surface to follow. Sheet-hosted forms' padding ownership — why the 3 intervention
sheet forms keep `px-4` on their own `hlm-field-group` instead of following the page/dialog
pattern — is recorded in `features/interventions/FEATURE.md` § UI Conventions.

A required Signal Forms field's `[attr.aria-invalid]` — bound at the call site as
`f().touched() && f().invalid()`, per every form in this feature — is now redundant with (not
overridden by) `HlmInput`/`HlmTextarea`/`HlmSelectTrigger`/`HlmDatePickerTrigger`'s own host
binding: those `shared/ui` components (not owned here) each carry a repo-owned correction that
announces the same touched-gated `spartanInvalid` state the visual ring already uses, superseding
their vendored `BrnInput`-family default of the raw, untouched-gated `invalid`. The call-site
binding stays for the day one of those controls is used with a Signal Forms field it does not read
`spartanInvalid` from.

A submit control whose label swaps to a pending variant (`Save` → `Saving…`) carries
`aria-live="polite"` directly on the `<button>` — the one mechanism this app uses to announce that
swap, chosen over wrapping the swapped spans in a `role="status"` container because it needs no
extra element and the button already owns `[attr.aria-busy]`. This applies across every feature's
forms, not only `organization`'s, since the pattern is form-wide rather than feature-owned.

## Routing Notes

- Parent resolvers establish organization context and breadcrumb/title data.
- Organization-scoped child features must rely on the resolved route context instead of re-owning top-level organization selection.

## Cross-Feature Dependencies

- Consumes the nested `features/interventions` public API for the landing page's work
  queues (ARCHITECTURE.md §4): `InterventionService` from the feature root barrel, plus
  its `models`, `utils` and `data-access` concern barrels. Read-only — the parent lists
  and counts interventions and reads the local outbox, but owns no intervention state
  and takes no workflow decision.
- Consumes the nested `features/facilities` public API for the assets explorer
  (ARCHITECTURE.md §4): its `state` barrel for `FacilityTreeStore`, and its
  `ui/components` barrel for the equipment and inspection tab panes the facility
  record already uses. Read-only — the parent browses, the subfeature owns.
- May expose organization context to shell composition through ports.
- May expose current active member access to approved sibling features through `ORGANIZATION_MEMBER_ACCESS_PORT`.
- May expose onboarding-approved setup workflows through `organization/setup`.
- Must not move organization-owned widgets into layouts just because they render in the shell.

## Invariants

- Active organization context is organization-owned state.
- Organization-scoped child workflows stay under this feature boundary.
- Layouts and sibling features consume organization behavior through the published port, not through direct store injection.
- Resolvers that load organization context belong to this feature.
- A mutating confirm dialog stays open, busy-locked, until the write settles — the members remove confirm mirrors interventions' publish confirmation: it stays open on failure and shows the outcome inline, so the operator sees it exactly where they took the action and can retry without reopening the dialog, rather than the failure surfacing only as a page-level toast.
