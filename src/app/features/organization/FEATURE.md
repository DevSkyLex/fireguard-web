# Organization Feature

## Purpose

Owns organization context and organization-scoped business workflows.

This feature is responsible for:

- active organization context (default-workspace resolution and the persisted last-organization preference),
- organization member, invitation, role, and settings (general & branding) data,
- organization subscription plan selection and plan-driven resource quotas (usage meters),
- organization billing (Stripe-hosted Checkout / customer Portal and invoice history),
- the organization landing page ("Dashboard"), merging the retired Today and
  Statistics pages into one tabbed surface: an **Overview** tab with named
  work queues holding real interventions — overdue, sent back, awaiting
  review, and waiting to sync (the last read from the local outbox) — above
  them a fixed near-term KPI row and the backend's alert feed (counts only),
  and below them a "Recently updated" interventions list; and a **Trends**
  tab with facility, equipment and inspection KPI cards, their
  period-over-period deltas, a non-conformity severity breakdown, and four
  trend charts (inspections, non-conformities opened/resolved, equipment
  and facilities added). Both tabs read the **same** component-scoped
  `DashboardStore` copy — merging the two source pages into one route
  removed the second, duplicate fetch of the aggregate `/dashboard` payload
  the two pages each held before,
- organization-scoped permission helpers derived from the active member access payload,
- organization overview pages,
- nested organization-scoped subfeatures: facilities, equipments, inspections, interventions,
  maintenance-schedules, approvals (the four-eyes decision surface), checklists (the checklist
  template library), imports (the bulk CSV import surface), audit (the read-only audit journal)
  and collaboration (the conversational surface),
- publishing organization context to layouts and approved consumers.

This feature does not own generic shell composition or account-level user identity.

## Entry Points

- Routes: `organization.routes.ts`
- Public API: `index.ts`
- Root provider: `providers/organization.provider.ts`

## Routes

> **Currently mounted:** `/organizations`, `/organizations/:organizationId` (the landing
> Dashboard page), `messages`, `channels`, `interventions`, `assets`, `equipments`, `facilities`,
> `inspections`, `maintenance`, `approvals`, `checklists`, `imports`, `audit`, `calendar`,
> `statistics` (a permanent redirect to the landing page, kept for old bookmarks and deep links —
> see Dashboard below), `members` (now tabbed: roster, roles & permissions, teams —
> see below), `members/:memberId`, `settings`, and `/organizations/invitations/accept`
> (mounted at the app root, outside this subtree — see below). `team` and `teams` are
> retired as mounted routes and now redirect functionally onto `members?tab=roles` /
> `members?tab=teams`.
> `assets` (the estate explorer) is now the sidebar's single navigation entry for the
> estate, gated on `FACILITIES_READ`; `facilities` and `equipments` stay mounted and gated on their
> own read permissions so records, creation forms and deep links keep resolving, but neither is
> listed by the sidebar navigation anymore.
>
> Because it replaced them in the sidebar, the explorer **carries their creation entry
> points**: "New facility" and "New equipment" sit in the shell header through
> `PageActionsService`, gated on `FACILITIES_WRITE` and `EQUIPMENT_WRITE`. Without them the
> only way to create a site or a piece of equipment was to type the URL — the buttons live
> on the two lists the sidebar no longer reaches.

- `/organizations` — redirect-only: `organizationGuard` forwards to the default
  workspace (the last organization persisted in the `last-organization` cookie
  when still accessible, else the first accessible organization, else
  `/onboarding`). An `excluded` query parameter names an organization the guard
  must not pick again (redirect-loop breaker set by failing guards). There is
  no organization list page; switching happens through the sidebar switcher.
- `/organizations/:organizationId` — the landing "Dashboard" page (`ui/pages/organization-dashboard-page`),
  merging the retired Today and Statistics pages into an **Overview** tab (work queues, near-term
  KPIs, alert feed, recent interventions) and a **Trends** tab (KPI deltas, severity breakdown,
  trend charts), selected with `hlm-tabs`, `overview` by default. The landing guard redirects a
  member who can read neither interventions nor the dashboard to their first permitted destination
- `/organizations/:organizationId/assets` — the estate explorer, on three
  first-level axes: **by site** (the facility hierarchy on the left, via
  `shared/tree`'s `Tree` primitive and the facilities subfeature's
  `FacilityTreeStore`, with the selected site's equipment and inspections on
  the right — the equipment pane's header then offers **Print QR labels**,
  streaming the selected subtree's label-sheet PDF through
  `EquipmentService.exportLabels` (`GET …/equipment/labels?facilityId=…`)
  and this page's own `BrowserDownloadService`, saved as
  `equipment-labels-{facilityId}.pdf`; a selection past 500 labels is
  refused server-side with a 422 whose RFC 7807 `detail` surfaces as an
  error toast via `resolveCsvExportErrorDetail`. The whole-inventory
  variant of the same endpoint lives on the equipment list's toolbar
  (`equipments/FEATURE.md`)), **everything** (the same panes unscoped, so an
  operator holding a serial number and no site can still find it), and **compliance**
  (the backend Compliance module's own enriched hierarchy — same `Tree`
  primitive, eager: the whole tree arrives nested in one call, so this
  page's own `ComplianceExplorerStore` maps it to a fully-populated
  `childrenByParent` up front and `Tree`'s lazy `expandRequested` never
  fires. Each node badges its compliance rate and severity bucket — icon and
  label together, never colour alone. Selecting a node loads that facility's
  compliance summary on the right, with an "Export safety register" button
  streaming the PDF through this page's own `BrowserDownloadService`, and an
  "Archive register" button beside it (`POST
…/compliance/register-snapshots`, facility-scoped when a node is selected,
  organization-wide otherwise; success and the 403 non-entitled refusal both
  surface as toasts, the latter carrying the backend's RFC 7807 `detail`).
  An "Archived registers" panel below lists the dated snapshots (`GET
…/compliance/register-snapshots`, paginated Hydra collection: generatedAt,
  scope, size, truncated content hash) with a per-row download (`GET
…/register-snapshots/{snapshotId}/download`); the panel renders only for
  holders of `organization.compliance.export`, the same permission the
  backend asserts on all three snapshot endpoints, which also share the live
  export's pro/max plan gate). The
  compliance tree — and, for members holding the export permission, the
  snapshot list — loads only on the axis's first activation, per the
  secondary-UI loading rule. It is now the single navigation entry for the
  estate, replacing the "Facilities" and "Equipments" pair below; both route
  trees stay mounted regardless so records, creation forms and deep links
  keep resolving.

  **The explorer's own state is in the URL** (`?axis=`, `?facility=`,
  `?compliance=`), written with `replaceUrl` so browsing the tree does not fill
  the history with one entry per click, and restored from route-bound inputs on
  arrival. It replaced two routed list pages that both did this and inherited
  neither: a reload came back on "By site" with nothing selected, the back
  button left the page instead of clearing the selection, and "the equipment of
  Bâtiment C" could not be sent to a colleague. **The creation buttons carry the
  selection too** — `?facility=` for equipment, `?parent=` for a site — so
  "New equipment" on a selected site produces a record already assigned rather
  than an orphan the operator then assigns by hand through the detail page's
  dialog. Operators holding
  `FACILITIES_WRITE` can re-parent a site by dragging it onto another —
  `Tree`'s optional pointer drag-drop, calling `FacilityTreeStore.move`. The
  tree row menu's "Move to…" action opens `FacilityMoveDialog` for the same
  operation and is the keyboard/AT path: drag-drop is pointer-only by
  construction and is never the only way to re-parent a site. The same menu's
  "Duplicate" action, gated identically, calls `FacilityTreeStore.duplicate`
  directly with no confirmation dialog — the backend defaults the copy's name
  and parent, and duplicating is not destructive

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
- `/organizations/:organizationId/approvals` — the four-eyes approvals inbox, owned by the
  `approvals` subfeature, gated by `organization.approvals.read`. Decision controls (approve/reject)
  are additionally gated by `organization.approvals.decide`
- `/organizations/:organizationId/imports` — the bulk CSV import surface, owned by the `imports`
  subfeature, gated by `organization.equipment.read` **or** `organization.facilities.read`
  (`match: 'any'`); the backend additionally gates the upload itself on the matching write
  permission for the submitted `kind`
- `/organizations/:organizationId/audit` — the organization audit journal, owned by the `audit`
  subfeature, gated by `organization.audit.read`. Not in the default member role — an admin holds
  it via the `organization.*` wildcard — so the sidebar entry and this route are both absent for
  most members
- `/organizations/:organizationId/statistics` — permanent redirect to `/organizations/:organizationId`
  (`pathMatch: 'full'`); the Trends section it used to be is one scroll away, on the same page
- `/organizations/:organizationId/checklists` — the checklist template library, owned by the
  `checklists` subfeature, gated by `organization.inspection.read`. Write actions (create, edit,
  archive) are additionally gated by `organization.inspection.write`. Checklists are consumed as
  inspection templates by the `inspections` subfeature's create flow
- `/organizations/:organizationId/members` — the single people-management surface, tabbed via
  `?tab=` (`members` default, `roles`, `teams`), `?tab=`-addressable the same way as
  `organization-settings-page` and `intervention-detail-page`'s rail. The route itself opens on
  the **union** of every tab's read permission (`organizationPermissionGuard`, `match: 'any'`
  over `organization.members.read`, `.manage`, `organization.roles.read`, `.manage`,
  `organization.teams.read`) — reaching the route at all does not imply seeing every tab.
  `OrganizationMembersPage` gates each trigger and panel individually
  (`canViewMembersTab`/`canViewRolesTab`/`canViewTeamsTab`) and never resolves `activeTab` to a
  tab the acting member cannot see: an unauthorized or unrecognized `?tab=` falls back to the
  first permitted tab in `members` → `roles` → `teams` order.
  - **`members` tab** (members + invitations; `organization.members.*`) — the page's own KPI row,
    roster and pending-invitations sections, fed by the component-scoped `OrganizationMembersStore`.
  - **`roles` tab** (RBAC roles; `organization.roles.*`) — `OrganizationTeamPage` mounted as-is
    inside a lazy tab panel (`hlmTabsContentLazy`), so its component-scoped `OrganizationTeamStore`
    and "New role" page action only activate once the tab is first opened.
  - **`teams` tab** (named member groups; `organization.teams.read`) — `OrganizationTeamsPage`
    mounted the same way, with its own `OrganizationTeamsStore`. See the naming disambiguation in
    **Invariants** — `roles`/`OrganizationTeamPage` and `teams`/`OrganizationTeamsPage` are
    unrelated concepts sharing this one host page.
  - The retired `/team` and `/teams` routes are functional `redirectTo`s
    (`redirectToOrganizationMembersTab`, `organization.routes.ts`) preserving every incoming
    query param, mirroring `interventions.routes.ts`'s `redirectToInterventionView`.
- `/organizations/:organizationId/members/:memberId` — another member's profile, read-only
- `/organizations/:organizationId/settings` (tabbed via `?tab=`: general & branding, subscription, usage, notifications, regional & formats, compliance, assistant, danger zone; gated by `organization.settings.write`)
- `/organizations/invitations/accept` — public invitation landing page; the
  route is mounted at the **app root** (outside the auth-guarded dashboard
  shell, in `app.routes.ts`) so a logged-out invitee can preview the invitation
  and sign in / sign up before accepting. The page is owned by this feature.

The `:organizationId` parent route resolves organization context before child pages render.
Organization navigation and routes are filtered by the active member permissions. Subscription
plans cap resource quantities (see Subscription quotas below); they do not gate routes.

**The sidebar's "Administration" group is retired.** `members`, `team`, `teams`, `settings` and
`audit` no longer appear in `ORGANIZATION_NAVIGATION_ITEMS` / `ORGANIZATION_NAVIGATION_GROUPS`
(`navigation/organization-navigation.config.ts`) — `OrganizationNavigationGroupId` now carries
only `'operations' | 'assets'`. Their routes stay mounted and permission-guarded exactly as
before; only the sidebar entry point moved. The five destinations' new entry point is
`OrganizationSwitcher`'s dropdown, which becomes the organization's administration menu:
organization identity header, then Settings / Billing (`settings?tab=subscription`, no new
route) / Members / Audit journal as `routerLink`s reusing the same
`hasOrganizationNavigationAccess`/`matchesOrganizationPermission` gate the sidebar used, then the
existing organization-switching panel and "Create organization" action. "Leave organization…" is
not offered from this menu, nor from the settings danger zone — it lives at
`/account/organizations` (`features/account/FEATURE.md`), reachable by every signed-in member
regardless of organization permission (see below).
**The companion move of `OrganizationTeamPage`/`OrganizationTeamsPage`'s content into
`roles`/`teams` tabs of `OrganizationMembersPage` is done** — see the `members` route entry
above. The switcher-side menu rebuild itself (identity header, Settings/Billing/Members/Audit
`routerLink`s) remains follow-up work — see **Not Built Yet**.

The settings page's danger-zone tab is gated on `organization.delete` as a whole — a member
holding none of it falls back to the General tab. Leave no longer lives on this tab (see below).

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

**The danger-zone tab now renders every action `OrganizationSettingsStore` owns, not only Delete.**
Suspend (`app-organization-suspend-dialog`, stating the consequences — access blocked immediately,
data preserved) renders when the organization is `active`; Restore (a direct button, no dialog,
mirroring `OrganizationMemberTable`'s Reactivate) renders when it is `suspended` or `archived` — the
two are mutually exclusive by status and both need only `organization.settings.write`, already
implied by the route guard on `/settings`. Transfer ownership (`app-organization-transfer-ownership-dialog`
— an `hlm-combobox` member picker mirroring `FacilityMoveDialog`, plus the typed-organization-name
confirm gate `OrganizationDeleteDialog` uses) renders only for the current owner on a non-archived
organization; its candidate list is `OrganizationMemberService.listAll`, loaded once the owner opens
the tab, narrowed to active, non-owner members. Leave is no longer offered from this tab — see
below.

**`OrganizationOutput.isOwner` is authoritative.** Since backend 1.5.0 the API projects `isOwner`
(and the caller's `roles`) through one shared caller-membership port on the user's organization list,
the single-organization `GET`, and every mutation that returns a refreshed organization (suspend,
restore, transfer-ownership, the settings PATCH). The settings page reads the declared field directly
— `organization().isOwner === true` — with no client-side derivation from `ownerUserId`.

**The settings General tab carries a "Legal information" section** (`app-organization-legal-form`):
country (ISO 3166-1 alpha-2), legal entity type (`GET /organizations/legal-types`, a reference
catalog loaded once when the tab opens), registered legal name, registration number and VAT number.
Every field is optional and clears on an empty string — unlike the general form's `description`,
which clears on `null` — matching `UpdateOrganizationSettingsInput`'s own doc block. Saved through
`OrganizationSettingsStore.save` with only these five keys, the same partial-save pattern every other
section uses.

**The subscription tab now offers Cancel and Resume alongside Checkout/Portal.** Cancel
(`app-organization-cancel-subscription-dialog`, stating that the subscription keeps working until
the current period ends rather than implying an immediate cutoff) renders while a subscription is
active and not already scheduled to cancel; Resume (a direct button, no dialog — it undoes Cancel)
renders once `cancelAtPeriodEnd` is true. Both call `OrganizationBillingStore.cancelSubscription`/
`resumeSubscription`, gated by the same `organization.settings.write` the tab's other controls need.

**Compliance, automation and assistant policy** (`OrganizationSettings.compliance` /
`.automation` / `.assistant`) are persisted the same way, through the Compliance and Assistant
tabs' own `OrganizationComplianceForm`, `OrganizationAutomationForm` and
`OrganizationAssistantForm`, each calling `OrganizationSettingsStore.save` with only its own
section. The two `compliance` maps (`nonConformitySlaDays`, `inspectionPeriodicityDefaults`)
carry EFFECTIVE values — catalog defaults overlaid with the organization's customizations — and
the API names which keys are customized (`customizedSlaSeverities`,
`customizedPeriodicityTypes`); the Compliance tab renders every key the seed returns rather than
a hard-coded severity or equipment-type list, save for the periodicity picker's five-option
duration catalog (`P1M`/`P3M`/`P6M`/`P1Y`/`P2Y`). The assistant's `model` override renders as
read-only text — there is no operator-published model catalog for a picker yet. **The four-eyes
approval policy (`OrganizationSettings.approval`) is now editable**, through
`OrganizationApprovalForm` at the bottom of the Compliance tab — one rule row per action type from
the `approvals` subfeature's action-type catalog (enabled, minimum approver role, and — `nc_waiver`
only — a minimum severity), self-approval, and the request TTL, all saved through
`OrganizationSettingsStore.save` with only the `approval` section. This was read-only
(`OrganizationApprovalSummaryCard`) until the `approvals` subfeature's inbox gave a reader a
surface to act on a gated request — activating a policy nothing could act on would have stranded
requests. That invariant is now retired; see `features/approvals/FEATURE.md`.

## State and Data Access

Primary stores:

- `ActiveOrganizationStore`
- `OrganizationMemberAccessStore`
- `OrganizationStore`
- `OrganizationPlanStore` (scoped to the `OrganizationPlanSelector` in the settings Subscription tab; self-service plan change)
- `OrganizationQuotaStore` (root-provided; active organization quota usage feeding the settings Usage tab and the create-flow quota checks)
- `OrganizationBillingStore` (component-scoped to the settings Subscription tab; current subscription, plan pricing, hosted Stripe Checkout / Portal, invoice history, and cancel/resume — both gated by `organization.settings.write` on the backend, same as Checkout/Portal)
- `OrganizationDashboardStore` (aggregate slice: KPI cards plus the per-metric trend stores under `state/organization-dashboard/slices/`; component-scoped **once** to the landing Dashboard page, which reads it across the whole page — the overview counts, the alert feed and the recent-interventions list for the KPI strip and work-queue column, the health rates, comparison block and severity breakdown for the Trends section. Before the Today/Statistics merge each page held its own copy, fetching the aggregate `/dashboard` payload twice; one page now means one fetch)
- `FacilityTreeStore` (owned by the facilities subfeature, component-scoped to the assets explorer; the site hierarchy, loaded one branch at a time)
- `OrganizationAssetsPaneStore` (component-scoped to the assets explorer; the right pane's equipment and inspections, facility-scoped or organization-wide depending on the active axis. Reuses `EquipmentService`/`InspectionService` from the equipments/inspections subfeatures' `data-access` barrels rather than duplicating transport — it is a read-only preview, not the surface those subfeatures own)
- `ComplianceExplorerStore` (component-scoped to the assets explorer's compliance axis; named `CallState` fields — the tree, the selected/organization-wide summary, the safety-register export, the archived-snapshot list, the archive write, and the per-row snapshot download (plus `downloadingSnapshotId` flagging the row in flight) — since they are unrelated requests. `archiveRegister` `exhaustMap`s so a double click cannot race the write; the page reloads the snapshot list from its success-toast effect. Owns the `flattenComplianceTree` mapping onto the shared `Tree` shape, exposed as `roots`/`childrenByParent` computeds)
- `OrganizationTodayStore` (component-scoped to the landing Dashboard page's work-queues column; the work queues. Two independent `CallState` fields: the collection-backed queues, and the unsynced queue read from the local outbox so it still renders offline. Replaces the count-only `OrganizationAttentionStore`)
- `OverviewTrendStore`, `AssetGrowthTrendStore` (component-scoped to the landing Dashboard page's Trends section; combined trend datasets for the four charts — see `state/organization-dashboard/slices/`. Both load unconditionally on mount, correct now that the Trends section always renders on this single-scroll page)
- `OrganizationSettingsStore` (component-scoped to the settings page; general & branding mutations, logo upload and removal, and the danger-zone actions — archive, restore, suspend, ownership transfer and leaving the organization. One named `CallState` per action, since several are offered side by side and a shared one would leak an error between controls. Refreshes `ActiveOrganizationStore` on every mutation that returns an organization)
- `OrganizationMembersStore` (component-scoped to the members page; members & invitations as `withEntities` collections, roles, role assignments, invite/resend/revoke, single & bulk member removal, and the per-invitation accept-link map. `loadMembers` re-issues the server-side roster query with the page's search, status filter and ordering (`joinedAt`/`displayName`, restored from `OrganizationMemberListPreferencesService`'s cookie), so `membersTotal` — the "Total members" KPI — tracks the current filter, while `membersActiveTotal` — the "Active" KPI — is a fixed organization-wide snapshot fetched once per `load`; keep that split when touching either. Pending invitations are paginated server-side (`INVITATIONS_PAGE_SIZE`, `loadInvitations`): the invitations endpoint's `status` filter accepts exactly one value, so the pending-invitations card's own universe — pending and expired only — is fetched as a paginated `pending` query plus one unpaginated, "cheap" `expired` query (`fetchActiveInvitations`), combined into one page and one `invitationsTotal`; `invitationsTotal` is adjusted locally on invite/revoke rather than refetched)
- `OrganizationTeamStore` (component-scoped to the roles page; roles and the permission catalog)
- `OrganizationInvitationAcceptStore` (page-scoped; loads the public invitation preview and accepts an invitation token)

Sanctioned bounded drains (DESIGN.md § Collections' Server Rule): three of
these stores deliberately fetch without user-facing pagination —
`MemberDirectoryStore` drains the roster (a
capped single page would silently misattribute members past the cap),
`OrganizationAssetsPaneStore` caps at 50 per axis because the pane is a
preview that links to the owning subfeature's full list, not a browsing
surface, and `OrganizationTeamStore` drains the permission catalog via
`listAllPermissions` (a checkbox-selection catalog feeding the "Permissions in
catalog" KPI, the create-role dialog and the role-permissions sheet, never a
browsing list — a bounded page risks silently truncating the set a role can
be granted). Any other collection in this feature paginates, sorts and
filters server-side.

Primary services:

- `OrganizationService` (includes `changePlan`, `getQuota` and `listLegalTypes` — the settings Legal information section's type-picker catalog)
- `PlanService`
- `BillingService` (Stripe Checkout / Portal session creation and invoice listing)
- `OrganizationInvitationService`
- `OrganizationMemberService`
- `OrganizationRoleService`
- `ComplianceService` (the backend Compliance module's surface: the enriched facility tree, the organization/facility compliance summary, the safety-register PDF export, and the dated register-snapshot archive — `createRegisterSnapshot` (`POST …/compliance/register-snapshots`, `{}` or `{ facilityId }`), `listRegisterSnapshots` (paginated Hydra collection of `SafetyRegisterSnapshotOutput`), `downloadRegisterSnapshot` (per-snapshot PDF blob) — `services/browser-download`'s `BrowserDownloadService` saves the exported blob to the visitor's device, mirroring `features/interventions/services/browser-download` rather than importing it: two small, single-purpose classes, not yet a third consumer that would justify lifting one to a shared location)
- `TeamService` (read-only: `list` only, no frontend team CRUD yet. Consumed directly by the nested `interventions` subfeature's team-assignment dialog and detail page, imported from this feature's `data-access` and `models` barrels rather than duplicated — see interventions/FEATURE.md Cross-Feature Dependencies)

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
(`Facility`, `Equipment`, `Inspection`, `Intervention`, `Maintenance`, `Messaging`) whose resources
belong to an organization; the backend siblinghood is not what decides placement here, ownership of
the data is.

## Published Contracts

- `ORGANIZATION_CONTEXT_PORT`
- `OrganizationContextPort`
- `ORGANIZATION_MEMBER_ACCESS_PORT`
- `OrganizationMemberAccessPort`
- `MEMBER_DIRECTORY_PORT`
- `MemberDirectoryPort`
- `REGIONAL_FORMATTING_PORT`
- `RegionalFormattingPort`
- `MY_ORGANIZATIONS_PORT`
- `MyOrganizationsPort`
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
- pages feed the active organization's regional formatting preferences (date format, timezone)
  through `REGIONAL_FORMATTING_PORT` into `shared/regional-format`'s pure `appOrgDate` pipe — the
  one port in this set whose approved consumer is `shared` markup rather than a sibling feature:
  the pipe never injects the port itself (dependency direction), callers pass the port's signal
  value as the pipe's explicit settings argument,
- `features/account`'s `/account/organizations` page lists the caller's own memberships and lets
  them leave one, through `MY_ORGANIZATIONS_PORT` — the one port in this set built for a consumer
  holding no organization permission at all, backed by the root-provided `MyOrganizationsStore`
  (`state/my-organizations/`) rather than any component-scoped organization store,
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
- a shell contributes the global search — the header magnifier and its Ctrl+K / Cmd+K command
  palette (`OrganizationGlobalSearch`, `ui/components/organization-global-search/`) — to its
  header-actions slot through `withGlobalSearch()`, ahead of the assistant toggle. The palette
  answers `GET /organizations/{organizationId}/search` through
  `OrganizationService.search()` behind a component-scoped `OrganizationSearchStore`
  (`state/organization-search/`): one debounced (300 ms) `withQueryState` query per settled
  keystroke — a typeahead, so no multi-call slice — that never dials under 2 trimmed characters
  (the backend's own 400 bound) and resets to idle instead. Hits are grouped by type in the
  backend's stable order and navigate by `type` + `id`: equipment, facility, intervention and
  inspection to their detail routes; a non-conformity to the inspections index, because it has
  no detail page and its hit carries no owning-inspection id. The component renders nothing
  without an active organization, and spartan's command primitive supplies the combobox/listbox
  ARIA contract; a polite live region announces the settled result count, and closing hands
  focus back to the trigger.

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

**Leaving an organization is self-service on the backend, and it is reachable by every member,
independent of any organization permission.** `LeaveOrganizationProcessor` checks nothing beyond
active membership — the owner-cannot-leave and last-administrator guards are both 409s the caller
resolves by acting differently, not permission failures. The settings danger-zone tab used to carry
Leave, but that tab sits behind `/settings`'s `organization.settings.write` guard
(`OrganizationSystemRoleCatalog::MEMBER` never holds it), so a rank-and-file member could never
reach it — a known gap in an earlier revision of this document. **Leave now lives at
`/account/organizations`** (`features/account/FEATURE.md`), a page reachable from the account menu
with no organization permission of any kind. `MyOrganizationsStore` (root-provided,
`state/my-organizations/`) backs `MY_ORGANIZATIONS_PORT`, which the account page consumes instead
of any organization-owned store; its `leave` method wraps
`OrganizationMemberService.leave` directly, and a 409 refusal renders inline through the same
`toStoreError`-normalized error account's own dialog surfaces. Leaving the organization currently
open in the workspace navigates the caller to `/organizations`, which re-resolves the next
accessible workspace (or onboarding) through the existing guard chain — it does not explicitly
clear `ActiveOrganizationStore`, since `MY_ORGANIZATIONS_PORT` is deliberately read-only-plus-leave
and exposes no such write; `organizationGuard`'s own cookie validation covers the stale reference.
Leaving any other organization only removes its row. `OrganizationSettingsStore.leave`/
`leaveCallState` remain in this feature but are currently unused by any UI surface — kept rather
than deleted since another settings-scoped consumer may still want them; flagged here so a future
reviewer does not read them as dead code by accident. `OrganizationLeaveDialog`, the settings
danger-zone dialog this replaced, was removed.

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

- **`MemberSelectOption`** (`models/member/`) and **`toMemberSelectOption`**
  (`utils/member-select-option/`) — the one shape and the one mapper for a
  member in a picker; the caller picks what `value` submits (member IRI by
  default, member id for a team roster, user id for an ownership transfer).
  Rendered by `app-person-option` (`@shared/person-option`) in the team
  member-add form, the transfer-ownership dialog and every intervention picker.

## UI Conventions

**Dashboard (`organization-dashboard-page`) merges the retired Today and Statistics pages into one
continuous scroll**, not `hlm-tabs` and not two route-level pages behind a redirect: an identity row,
a single deduplicated KPI strip, the work queues, the alert feed and "Recently updated"
interventions, then a Trends section with its own period preset / compare-to-previous-period header,
a non-conformity severity breakdown and four trend charts. Every KPI tile reads `DashboardStore`
alone, never the period-scoped `OverviewTrendStore`/`AssetGrowthTrendStore` the Trends section's
period selector governs — the KPI strip therefore holds regardless of that selector's position on
the page, and the header actions template (`PageActionsService`) carries only "New intervention"; the
period toggle and compare switch sit in the Trends section's own header, next to the charts and
"vs previous period" summary lines they actually scope, rather than in the shell header where they
would imply filtering the whole page. `OverviewTrendStore` and `AssetGrowthTrendStore` load
unconditionally on mount, which is correct now that the trend charts always render on this single
page — the earlier tabbed layout carried the same unconditional load as a known defect, since it
fetched behind a tab a visitor might never open. The old `/statistics` route survives only as a
`redirectTo: ''`.

**`shared/chart`'s `LineChart` moved off `@swimlane/ngx-charts` onto Chart.js**, wired through
`ng2-charts`' `BaseChartDirective` (`canvas[baseChart]`) rather than a hand-rolled canvas
integration — `ng2-charts`' peer range covers this app's Angular major, and its directive already
guards its own browser-only work, matching this wrapper's own `isPlatformBrowser` skeleton fallback.
This closes the gap the ngx-charts era could not: ngx-charts painted gridlines, tick typography and
tooltip chrome through its own internal SVG/DOM classes, reachable only via a global CSS selector —
closed on both sides, since `src/styles.css` is guarded to theme tokens only (`CLAUDE.md` rule 3)
and a component `styleUrl` is banned outright (`ARCHITECTURE.md` §1.1). Chart.js takes all three as
first-class `ChartOptions` (`scales.*.grid`, `scales.*.ticks`, `plugins.tooltip`), so
`utils/chart-grid-colors` resolves them as literal, theme-appropriate colours the same way
`utils/chart-color-scheme` already resolved the dataset palette — both read `ThemePort.resolvedTheme`
rather than the DOM, so a live appearance switch recolors an already-rendered chart. The retired
`BarChart` sibling had no consumer beyond its own spec and was deleted rather than ported. Chart.js'
own controllers/scales/plugins are registered once, app-wide, in `app.config.ts`'s `provideCharts()` —
only the subset `LineChart` uses (`LineController`, `LineElement`, `PointElement`, `LinearScale`,
`CategoryScale`, `Filler`, `Legend`, `Tooltip`), not `withDefaultRegisterables()`'s full bundle.

**Every section is `hlmCard`, application-wide** — not only on the Dashboard, where this decision
started. "Your work queues", "Also worth a look" and "Recently updated" were the first to move off a
bare `app-page-section`; the equipment and intervention detail panels (attachments, tags, maintenance
history, activity, proposed changes, work items) followed, each having hand-rebuilt a card header in
slightly different Tailwind. They share the `hlmCard`/`hlmCardHeader`/`hlmCardContent` primitives with
the Trends charts and with `app-stat-tile` (`ui/components/stat-tile`), which
`app-intervention-kpi-strip` already builds on. `shared/page-section` is deleted rather than kept as an
unused second answer, and `DESIGN.md` §The Working Surface Rule is amended to match — it previously
said the opposite.

`app-stat-tile` renders its figure at one size — `text-2xl font-semibold` — whatever inputs it is
given. It used to switch to `text-3xl font-bold` when a caption was passed, which put the same kind of
metric at two sizes depending on the page and broke `DESIGN.md`'s 24px ceiling. Its badge sits beside
the label in a wrapping flex row rather than in `hlmCardAction`, because that slot's
`grid-cols-[1fr_auto]` starved the label at a KPI strip's narrow column.

List pages (roster, facilities, equipments, inspections, interventions) share one pagination
recipe, `app-collection-pagination` (`@shared/collection-pagination`), one toolbar shell,
`app-collection-toolbar` (`@shared/collection-toolbar`), one search box,
`app-collection-search-box` (also `@shared/collection-toolbar`), one editable filter-chip row,
`app-collection-filter-bar` and its `app-filter-chip` shell (`@shared/collection-filters`), and
one boundary for the three empty/error idioms spartan offers: `hlm-empty` with a dashed border
(`border border-dashed`) is a **page-level empty slot** (nothing loaded, no rows to show);
`app-empty-state` (`@shared/empty-state`) is an **in-card or in-section empty slot** nested
inside a larger page; `app-error-state` (`@shared/error-state`) is **every list's error state**,
never `hlm-empty` re-tinted to look like a failure.

**The five collection components moved to `shared/` on a deliberate uniformity bet, not on
today's locality.** At the time of the move every consumer still lived under
`features/organization/` (this feature's own roster page plus the four nested subfeatures'
list pages), which by §2.8 usage locality alone would keep them at
`features/organization/ui/components/`. They moved anyway because the goal driving the
extraction was uniforming every list surface across the app, including ones this feature does
not own — `shared/` is the bet that a sixth consumer outside `organization` is coming, not a
conclusion the current five consumers force. `app-collection-search-box` takes the current
draft value as an `input()` and emits one `output()` per keystroke; the debounce and the `?q=`
round-trip stay page-owned (route orchestration, §10.3) — `InspectionStore` exposes no search
filter, so `InspectionsPage` renders no search box rather than inventing one the backend cannot
serve. Its `app-collection-toolbar` therefore carries only the "Filters" toggle in
`toolbarEnd` and no `toolbarStart` content at all — a toolbar with one empty slot, not the
absent toolbar the page rendered before the toggle existed.

**`app-collection-filter-toggle` (`@shared/collection-filters`) is the "Filters" button every
list page's toolbar now carries**, mounting or unmounting the sibling `app-collection-filter-bar`
below it — a page's `filtersVisible` signal, seeded by `initialCollectionFilterBarVisibility`
(same module) from that page's own `activeFilterKeys().length > 0` at construction, then purely
toggle-driven. On `interventions-page` it sits beside "Columns" in `toolbarEnd`; on the eight
other pages that carry a filter bar it is `toolbarEnd`'s only control. The button carries an `hlm-badge` count of the active
narrowing, and defaults open whenever the page mounts already filtered (only `interventions-page`
persists filters in the URL, so it is the only one this is ever observable on) — a shared,
filtered link must never render behind a collapsed bar. The toggle is deliberately not part of
`app-collection-filter-bar` itself: the bar has no opinion on whether it is mounted, and the
button has no opinion on the bar's own chip row or "+ Filter" menu.

**`app-collection-filter-bar` replaced three divergent popovers (equipments, facilities,
inspections) and interventions' own bespoke chip row with one component**, first proven inside
`interventions-page` and then generalized. Its contract stays generic — a field is `{ key:
string, fieldLabel: string, icon: string, operators: readonly CollectionFilterOperator[] }`
(`CollectionFilterField`) — and it owns the chip row's pick-order memory, the "+ Filter" menu,
and the "Clear filters" button; a page still owns its own `filters` signal (URL-backed), which
of its fields currently carry a value (`activeKeys`), and which field is mid-pick before a value
lands (`pendingKey` / `openFilterKey`). **The value control is always projected**, one
`ng-template` per field (resolved through `viewChild(TemplateRef)`, the same idiom already used
for a page's `#pageActions` template), so `shared/` never imports a feature's tag component or
model — `app-equipment-status-tag`, `app-inspection-status-tag` and `app-intervention-tag` all
stay in their owning feature. A field's value control need not be a select either: facilities'
lone `archived` field projects a plain `hlm-checkbox`, since "opening a selector" has no meaning
for a boolean.

**Not every chip's value control converts to a generic component, and the ones that stay
hand-rolled still restore focus on pick.** Audit's `action` field keeps a hand-rolled
`hlm-combobox` (`AuditPage`): its options are grouped by module through `hlmComboboxGroup`, a
shape `CollectionFilterSelect` cannot render, and it is the sole consumer of that shape — below
`CLAUDE.md` rule 8's third-consumer threshold. Checklists' `status` field keeps a hand-rolled
`hlm-toggle-group` (`ChecklistsPage`) for the same reason, the same shape `ApprovalsPage`'s own
`status` chip already uses — two consumers, not three. Both still open on a "+ Filter" pick and
close themselves back out through the bar's `state`/`stateChanged` contract, since `HlmCombobox`
hosts the very same `BrnPopover` `app-collection-filter-select` wraps — converted or not, every
popover-backed chip in this bar behaves alike. Facilities' checkbox and checklists' toggle group
open no popover at all, so `onFieldPicked` instead moves real DOM focus onto the freshly rendered
control directly, deferred through `afterNextRender` the same way
`CollectionFilterBar.focusAfterRemoval` defers its own post-removal focus move.

**The chip's operator segment (8.0) is generic, never a hardcoded "is".** `CollectionFilterOperator`
(`@shared/collection-filters/models`) is the full comparison vocabulary — `equals`, `notEquals`,
`contains`, `notContains`, `startsWith`, `endsWith`, `greaterThan`, `lessThan`, `between`,
`isEmpty`, `isNotEmpty`, `isAnyOf`, `isNoneOf` — and a field declares only the subset its own
data-access layer actually maps to a real query param through `operators`; `FilterChip` renders
that subset as a fixed label when it has exactly one entry (every field but two across the nine
pages that carry a filter bar today — approvals, audit, checklists, equipments, facilities,
imports, inspections, interventions, maintenance-schedules) and as an `hlm-select` once a field
declares more than one. **A feature owns
the operator→query-param mapping**, never `shared/` — `equals` maps to a field's exact-match param,
and interventions' "Deadline" and "Planned start" fields (`dueRange`/`plannedStartRange`, 8.1/8.2)
are the framework's first fields genuinely wired to more than one: `greaterThan`/`lessThan`/`between`
map to the `dueAtAfter`/`dueAtBefore` and `plannedStartAtAfter`/`plannedStartAtBefore` bounds
`InterventionListOptions` already served (`features/interventions/FEATURE.md`) — no backend
change, confirmed by reading the backend `InterventionResource`/`InterventionProvider` directly.
That same read confirmed the reverse too: `isAnyOf`, `notEquals`, `isEmpty`/`isNotEmpty` and
`contains` stay undeclared on every enum/IRI field because the provider reads each filter as a
single value and the gateway matches by equality only — a verified "no", not an unconfirmed one.
Both date-range fields' operator selects also prove `CollectionFilterField.operatorLabels`
(`@shared/collection-filters`), the optional per-field label override this round added: a
date field reads "after"/"before", not the generic registry's "greater than"/"less than", while
every field that sets no override stays on the shared wording. An operator a field does not
declare is simply never offered — this bar never sends a param unverified against the real
backend.

**Create-surface placement** follows field count and navigation cost, not precedent: a form of
**3 fields or fewer with no navigation cost** belongs in a dialog; **4 to 8 fields that should
keep the list in context** belong in a right sheet; a form that **needs its own URL or deep-link,
or exceeds 8 fields**, belongs in a route page. The equipment, facility and inspection create
pages predate this rule and stay as route pages — that is a recorded exception, not a precedent
for a new create surface to follow. Sheet-hosted forms' padding ownership — why the 3 intervention
sheet forms keep `px-4` on their own `hlm-field-group` instead of following the page/dialog
pattern — is recorded in `features/interventions/FEATURE.md` § UI Conventions.

Every native `<input hlmInput>`/`<textarea hlmTextarea>` bound with `[formField]` carries
`[attr.aria-invalid]="f().touched() && f().invalid()"` at the call site — the sanctioned dialect
across every feature's forms, documenting intent even where it is not (yet) fully effective. In
today's vendored state, `BrnInput`/`BrnTextarea` (`shared/ui`, not owned here) already set their
own host `aria-invalid` from the control's **raw** `invalid`, and that host binding wins over the
call-site one: a pristine required field is announced invalid before it is ever touched. The
visual ring is correctly touched-gated (`data-matches-spartan-invalid`) — only the announced value
is off. A repo-owned helm-layer correction (mirroring the touched-gated `spartanInvalid` state the
ring already reads) was evaluated and declined, to keep the vendored `shared/ui` layer untouched;
the call-site binding stays because it becomes live the day that correction — or an upstream
spartan fix — lands. `HlmSelectTrigger`, `HlmComboboxInput` and `HlmDatePickerTrigger` are
`Component`s with their own template, so a call-site `[attr.aria-invalid]` on their host tag never
reaches the real focusable control — no form here binds one on those.

A submit control whose label swaps to a pending variant (`Save` → `Saving…`) carries
`aria-live="polite"` directly on the `<button>` — the one mechanism this app uses to announce that
swap, chosen over wrapping the swapped spans in a `role="status"` container because it needs no
extra element and the button already owns `[attr.aria-busy]`. This applies across every feature's
forms, not only `organization`'s, since the pattern is form-wide rather than feature-owned.

**Page header (shell contract).** `layouts/dashboard-layout`'s `DashboardPageHeader` carries every
routed page's title and header actions now, not the page itself: it renders the activated route's
`title` (via `TitleService`, kept in sync by `PageTitleStrategy`) as the document's one `<h1>`, and
a page contributes its right-side action buttons through a `<ng-template #pageActions>` registered
on `PageActionsService` (`@core/page-actions`) — never an in-page title band. The breadcrumb trail
below it never carries a heading itself, so there is exactly one `<h1>` per route regardless of
whether that route opts into the trail. `app-organization-page-header` is retired entirely,
including from `organization-dashboard-page`, which was its last consumer: the org identity it
carried (avatar, plan, status, member count) is shown nowhere else, so it now renders as a
page-local lead row above `organization-dashboard-page`'s tabs, built from `organizationContext`.
A page's informative subtitle (a live count, e.g. members' "N members" line) stays as a lead
paragraph at content top; a decorative, static subtitle is dropped rather than kept as dead
weight.

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
  (ARCHITECTURE.md §4): its `state` barrel for `FacilityTreeStore` and its
  `models` barrel for `FacilityOutput`. Read-only — the parent browses the
  hierarchy, the subfeature owns it. `AssetEquipmentTab`/`AssetInspectionTab`,
  named earlier as a possible shared pane shape, were not built: the explorer's
  right pane is instead this feature's own `OrganizationAssetsPaneStore`
  (see facilities/FEATURE.md "Deferred, not built").
- Consumes the nested `features/equipments` and `features/inspections` public
  APIs for the assets explorer's right pane: their `data-access` barrels
  (`EquipmentService`, `InspectionService`), their `models` barrels
  (`EquipmentOutput`, `InspectionOutput`), and their `EquipmentStatusTag` /
  `InspectionStatusTag` components. Read-only — the parent previews, neither
  subfeature's own management surface or state is touched.

  The two components were added to this contract deliberately: the pane
  previously printed `item.status` and `item.result` raw, so the same equipment
  showed `in_progress` here and a localized, coloured tag everywhere else. The
  `models` barrels do export `resolveEquipmentStatusTag`, which would have given
  the label without widening anything — but not the severity colour or the icon,
  so it would have traded one inconsistency for another and hand-rolled a
  thinner copy of a component that already exists. The precedent is the
  facilities dependency directly above, which already reaches `ui/dialogs` for
  `FacilityMoveDialog`.

- Consumes the nested `features/approvals` subfeature's `data-access` barrel
  (`ApprovalRequestService.listActionTypes()`) for the settings Compliance
  tab's approval-policy form. Read-only — the parent takes no approval
  decision and owns no `ApprovalRequestOutput` state.
- May expose organization context to shell composition through ports.
- May expose the caller's own organization memberships and the ability to leave one to
  `features/account` through `MY_ORGANIZATIONS_PORT`.
- May expose current active member access to approved sibling features through `ORGANIZATION_MEMBER_ACCESS_PORT`.
- May expose onboarding-approved setup workflows through `organization/setup`.
- Must not move organization-owned widgets into layouts just because they render in the shell.

## Invariants

- Active organization context is organization-owned state.
- Organization-scoped child workflows stay under this feature boundary.
- Layouts and sibling features consume organization behavior through the published port, not through direct store injection.
- Resolvers that load organization context belong to this feature.
- A mutating confirm dialog stays open, busy-locked, until the write settles — the members remove confirm mirrors interventions' publish confirmation: it stays open on failure and shows the outcome inline, so the operator sees it exactly where they took the action and can retry without reopening the dialog, rather than the failure surfacing only as a page-level toast.
- **The compliance axis is gated on `COMPLIANCE_READ` and the safety-register export button on `COMPLIANCE_EXPORT`** — the same `organization.compliance.read`/`organization.compliance.export` pair the backend asserts (the read permission is held by the system member role; export is admin/manager-only). The backend additionally gates the export on the organization's plan tier (pro/max): that refusal is backend-owned and surfaces through the export error state — the frontend never re-derives the plan rule.
- **The four-eyes approval policy is editable now that the `approvals` subfeature's inbox exists** — the
  invariant that kept it read-only (activating an undecidable policy would strand requests) is retired.
  `OrganizationApprovalForm` is the only writer of `UpdateOrganizationInput.approval`, section-scoped
  through `OrganizationSettingsStore.save`, matching every other settings section.
- **`organization-team-*` and `organization-teams-*` name two unrelated concepts — never
  merge, rename across, or copy between them.** `OrganizationTeamStore` (`state/organization-team`)
  and `OrganizationTeamPage` (`ui/pages/organization-team-page`, the `members` page's `roles` tab)
  manage **RBAC roles** (`organization.roles.*`). `OrganizationTeamsStore`
  (`state/organization-teams`, component-scoped, provided on `OrganizationTeamsPage`) and
  `OrganizationTeamsPage` (`ui/pages/organization-teams-page`, the `members` page's `teams` tab)
  manage **teams** — named groups of members over `POST/GET/PATCH/DELETE
/organizations/{organizationId}/teams` and its `/members` sub-resource, gated by
  `organization.teams.{read,write,manage}`. The singular/plural distinction is the only thing that
  tells them apart; do not rely on it disambiguating itself in a diff. Both pages stay mounted as
  their own `ui/pages/` units — `ARCHITECTURE.md` §10.2's route-entry naming and shape — even
  though `OrganizationMembersPage` now mounts them as tab content rather than a router outlet;
  their own component-scoped stores and page actions work unchanged nested this way, and each
  keeps a `[active]` input so its page action only owns the shell header's action slot while its
  own tab is showing (`hlmTabsContentLazy` keeps a tab's content mounted after its first
  activation, so a plain "register once" page action would otherwise go stale on tab switch).

## Not Built Yet

- **`OrganizationSwitcher` as the organization's administration menu** — the dropdown must gain
  an identity header, Settings / Billing / Members / Audit journal `routerLink`s (permission-gated
  through `navigation/organization-navigation.config.ts`'s existing helpers, not a second
  permission check), a height-bounded (3 rows, internal scroll) organization panel, and the
  existing organization-switching panel and "Create organization" action, in the order above — see
  Routes above for the exact target shape. The five nav items were already pulled out of the
  sidebar; only the switcher-side UI remains (`fg-spartan-ui` / `fg-component-builder`).

Backend endpoints exist for these; no frontend model, service method or store does:

- **Webhook subscriptions** — the whole `Webhook` module: `GET`/`POST /organizations/{id}/webhooks`,
  `GET`/`PATCH`/`DELETE /organizations/{id}/webhooks/{webhookId}`, plus `ping`, `rotate-secret`,
  the delivery log (`/deliveries`) and `redeliver`, and the `GET /webhooks/event-types` catalog.
  The permissions are already minted and exposed —
  `organization.webhooks.read` and `organization.webhooks.manage` are in
  `OrganizationPermissionCatalog` and in `organization-permission-name.model.ts` — so a role editor
  can grant an entitlement that reaches nothing, which is the part worth knowing before touching the
  role UI.

  This is a **deliberate deferral, not an oversight**: the natural home is an "Integrations" settings
  surface that does not exist yet, and a secret-bearing subscription form needs its own design pass
  (secret shown once, rotation, delivery-failure triage). Build it when integrations are a product
  goal; until then this line is the record that the backend is ready and the frontend is not.

- **Teams management real specs** — the whole `Team` slice behind the `members` page's `teams` tab
  (see Routes and Invariants above) is now built end to end: `TeamOutput`, `TeamMemberOutput`,
  `CreateTeamInput`, `UpdateTeamInput`, `AddTeamMemberInput` (`models/team/`), `TeamService`
  (`data-access/services/team/team.service.ts`), `OrganizationTeamsStore`
  (`state/organization-teams`), and the UI: `OrganizationTeamsPage`
  (`ui/pages/organization-teams-page`, list/create/edit/delete + a members panel),
  `OrganizationTeamTable` (`ui/tables/organization-team-table`), the create/edit/delete dialogs
  (`ui/dialogs/organization-team-*-dialog`), `OrganizationTeamMembersSheet`
  (`ui/sheets/organization-team-members-sheet`) and its `OrganizationTeamMemberAddForm`
  (`ui/forms/organization-team-member-add-form`). Still owed: real specs replacing the smoke
  tests each of those units carries today (`fg-web-test-writer`).
