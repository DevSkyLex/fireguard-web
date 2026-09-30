# Organization Feature

**Reading guide:** [Documentation index](../../../../docs/README.md) · [Related guide](../../../../docs/guides/organization-and-access.md).

Invisible accounts are projected by the API as offline with no last-seen timestamp.
Organization never receives the private invisible preference. Heartbeats and polling continue
while visible and online so restoring availability works across devices.

Account consumes the published `ORGANIZATION_CONTEXT_PORT` for its workspace-scoped unified inbox.
Switching that context invalidates the account-owned inbox cache before new reads.

Dashboard query data and errors belong to their producing organization. Switching or clearing
organization resets all three dashboard stores and cancels obsolete reads; only same-organization
period changes and retries retain previous data and response-period labels.

The published setup facade accepts optional server session/item keys for one durable creation at
a time. Organization, invitations, facilities and equipment retain their owning transports; setup
replays never bypass permissions or the server's transactional quotas.

Access policy mode/role drafts reset only after a successful policy save or organization change.
Domain verification and refreshes never discard edits. Admission and invitation commands own typed
feedback and membership invalidation in their stores, with one notification per result.

## Purpose

Owns organization context and organization-scoped business workflows.

This feature is responsible for:

- active organization context (default-workspace resolution and the persisted last-organization preference),
- organization member, invitation, role, and settings (general & branding) data,
- organization subscription plan selection and plan-driven resource quotas (usage meters),
- organization billing (Stripe-hosted Checkout / customer Portal and invoice history),
- the organization landing page ("Dashboard"), with four operational indicators and
  period-scoped trends backed by a single `DashboardStore` instance,
- organization-scoped permission helpers derived from the active member access payload,
- organization overview pages,
- nested organization-scoped subfeatures: facilities, equipments, inspections, interventions,
  maintenance-schedules, approvals (the four-eyes decision surface), checklists (the checklist
  template library), imports (the bulk CSV import surface), audit (the read-only audit journal)
  collaboration (the conversational surface) and workload (member capacity and daily demand),
- publishing organization context to layouts and approved consumers.

This feature does not own generic shell composition or account-level user identity.

## Workload boundary

The nested Workload feature owns `/organizations/:organizationId/workload` and its
desktop/mobile Operations navigation entry. Every active member may view their own
load; the API authorizes team visibility and capacity administration separately.
Organization publishes member access, regional settings and organization context
through its existing ports. It does not distribute task effort or store time entries.

## Entry Points

- Routes: `organization.routes.ts`
- Public API: `index.ts`
- Root provider: `providers/organization.provider.ts`

<a id="adaptive-mobile-navigation"></a>

## Routes

`organization.routes.ts` owns selection, the organization context resolver/access guard,
Dashboard, More, Assets, Members, Settings and nested feature entry points. Organization
children consume the resolved context. Nested owners define their own workflows.
`statistics` redirects to Dashboard; legacy `team` and `teams` routes redirect to the
Members Roles and Teams tabs. Member detail remains separately addressable.
Dashboard resolves to the first permitted destination when its required reads are denied.

Adaptive mobile navigation publishes `withOrganizationMobileNavigation()` through the
shell slot. The shell owns interaction mode, placement and safe-area clearance;
organization owns stable destination ids, ordering and RBAC. Dashboard, Interventions,
Assets, Messages and More omit denied entries without changing according to empty data.
More retains administration, Channels, billing (`settings?tab=subscription`), account,
theme and Auth-owned logout. Changing interaction mode adds no loading path.

See the [organization routing reference](../../../../docs/guides/organization-and-access.md#organization-routing-reference) for details and rationale.

## State and Data Access

Primary stores:

- `ActiveOrganizationStore`
- `OrganizationMemberAccessStore`
- `OrganizationStore`
- `OrganizationPlanStore` (scoped to the `OrganizationPlanSelector` in the settings Subscription tab; self-service plan change)
- `OrganizationQuotaStore` (root-provided; active organization quota usage feeding the settings Usage tab and the create-flow quota checks)
- `OrganizationBillingStore` (component-scoped to the settings Subscription tab; current subscription, plan pricing, hosted Stripe Checkout / Portal, invoice history, and cancel/resume — both gated by `organization.settings.write` on the backend, same as Checkout/Portal)
- `OrganizationDashboardStore` is provided once by the dashboard page for aggregate operational metrics, comparisons and severity counts. The page activates its period-scoped trend slices on entry; trend queries run only in the browser.
- `FacilityTreeStore` (owned by the facilities subfeature, component-scoped to the assets explorer; the site hierarchy, loaded one branch at a time)
- `OrganizationAssetsPaneStore` (component-scoped to the assets explorer; the right pane's equipment and inspections, facility-scoped or organization-wide depending on the active axis. Reuses `EquipmentService`/`InspectionService` from the equipments/inspections subfeatures' `data-access` barrels rather than duplicating transport — it is a read-only preview, not the surface those subfeatures own)
- `ComplianceExplorerStore` (component-scoped to the assets explorer's compliance axis; named `CallState` fields — the tree, the selected/organization-wide summary, the safety-register export, the archived-snapshot list, the archive write, and the per-row snapshot download (plus `downloadingSnapshotId` flagging the row in flight) — since they are unrelated requests. `archiveRegister` `exhaustMap`s so a double click cannot race the write; the page reloads the snapshot list from its success-toast effect. Owns the `flattenComplianceTree` mapping onto the shared `Tree` shape, exposed as `roots`/`childrenByParent` computeds)
- `OrganizationTodayStore` remains an intervention queue slice; the dashboard no longer provides or loads it.
- `OverviewTrendStore`, `AssetGrowthTrendStore` (component-scoped to the landing Dashboard page's Trends section; combined trend datasets for the four charts — see `state/organization-dashboard/slices/`. Both activate when the dashboard mounts and only query in the browser)
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
- The settings **Usage** tab (`OrganizationUsagePanel`) explains what each resource counts, renders
  meter bars (used / limit and remaining capacity per resource, with percentages and unlimited
  rows), and explains what happens at the limit. It is driven by `OrganizationQuotaStore`.
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
- `withOrganizationMobileNavigation()`
- `navigation` publishes the shared quick-link definitions and pure mobile navigation model.

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
- collaboration publishes `withCollaborationNav()` for the Messages and Collaboration
  destinations in the sidebar footer, replacing `withDirectMessagesNav()`
  and `withDirectMessagesSidebarExtension()` / `withChannelsSidebarExtension()` for
  route-exclusive lists. Organization providers re-export them and
  `provideChannelsWorkspace()`, which shares channel state at the dashboard route.
  Contributions implement the public extension contract; access, URLs and loading
  remain collaboration-owned.
- a shell contributes the global search trigger to its header-actions slot through
  `withGlobalSearch()`, ahead of the assistant toggle. The organization feature initializes its
  single palette owner independently of that trigger's render lifetime: Ctrl+K / Cmd+K still
  works when mobile quick actions are closed. Browser keyboard registration happens only after
  hydration; initialization does not load search data. Opening from quick actions waits for the
  native parent to finish closing before creating the palette and preserves native focus return.
  Editable fields retain their own shortcuts. The palette
  answers `GET /organizations/{organizationId}/search` through
  `OrganizationService.search()` behind a dialog-scoped `OrganizationSearchStore`
  (`state/organization-search/`): one debounced (300 ms) `withQueryState` query per settled
  keystroke — a typeahead, so no multi-call slice — that never dials under 2 trimmed characters
  (the backend's own 400 bound) and resets to idle instead. Hits are grouped by type in the
  backend's stable order and navigate by `type` + `id`: equipment, facility, intervention and
  inspection to their detail routes; a non-conformity to its owning inspection when `parentId`
  is available, otherwise to the inspections index. The opening organization remains fixed until
  dismissal; changing context closes the palette, and stale results cannot navigate across
  organizations. No palette opens without an active organization. Spartan's command primitive supplies the combobox/listbox
  ARIA contract. Its large viewport-bounded dialog keeps a visible scope explanation, rich idle,
  loading, error and no-result states, grouped result counts, and persistent keyboard guidance;
  a polite live region announces the settled result count. Closing disposes the query store;
  the next opening starts with an empty draft and no previous results.

`navigation/` owns the organization body destinations and permission-filtered sections.
Collaboration owns its footer destinations through its public contribution factory.
Route guards enforce access independently.

Sidebar destinations stay at one level within their section, with no nested sub-navigation.

**Messages and Collaboration are feature-owned footer destinations above Support.** Both
require `organization.messaging.read`, including namespace wildcard grants. Collaboration
derives their URLs through the organization context port. Their respective conversation and
channel lists mount only on matching routes in the sidebar extension and prime secondary data
browser-only. The shell does not resolve organization routes or permissions itself.

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
`toStoreError`-normalized error account's own dialog surfaces. A confirmed departure invalidates active selection, member permissions and onboarding before
refreshing the server membership list. Only a completed refresh permits navigation: no remaining
access opens `/onboarding/workspace`; other access opens `/organizations/select`. Failed refreshes
retain a retry that never resends the accepted DELETE. List totals come from the server. Session end
cancels old requests and clears account-scoped memberships. Settings status/ownership and admission
events use the same consumer invalidation paths. The legacy unused settings departure command
publishes `membershipLeft` for those consumers.

`/organizations/select` is an explicit, browser-loaded selector with server pagination, separate from
the default `/organizations` redirector. Organization guards validate each selected destination.
`setup` publishes departure/settings events for the Onboarding cache consumer.

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
  Rendered directly with Spartan `Item` and `Avatar` in the team member-add form, the
  transfer-ownership dialog and every intervention picker.

## UI Conventions

Use the shared collection query/pagination/filter contracts; advertise only operators
actually supported by the endpoint. Filters are business query state, distinct from
presentation preferences. Domain widgets remain organization-owned when rendered in a shell.
The dashboard shell owns the single route h1 and registered header actions/tabs.

Follow DESIGN.md for create surfaces, responsive overlays and guarded draft dismissal.
Existing route-hosted create forms retain their documented placement exception.
Keep touched-gated validation intent, accessible submit progress and DOM/focus order;
installed Spartan host behavior remains an explicit accessibility verification boundary.

See the [organization ui reference](../../../../docs/guides/organization-and-access.md#organization-ui-reference) for details and rationale.

## Routing Notes

- Parent resolvers establish organization context and breadcrumb/title data.
- Organization-scoped child features must rely on the resolved route context instead of re-owning top-level organization selection.

## Cross-Feature Dependencies

- More consumes Auth's public `LogoutControl`, retaining its logout port and
  session-ended navigation behavior. This approved composition introduces no
  organization-owned authentication state.

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
- Consumes Auth's `AUTH_SESSION_PORT` to gate member-access, directory, counter and quota reads.
  A remembered organization never triggers a protected request before authentication and MFA
  finish. Caches belong to an organization and authentication session revision; a new session or
  scope clears previous data and cancels reads. Only a refresh of the same context retains data.
  Permission guards and imperative loads share one request; replacement settles guard waits to
  `false`, and failed reads remain retryable.
- May expose onboarding-approved setup workflows through `organization/setup`.
- Must not move organization-owned widgets into layouts just because they render in the shell.

## Invariants

- Active organization context is organization-owned state.
- Settings commands retain their original organization and session. Navigation resets local
  action state without cancelling accepted writes; late results never replace a new selection.
  Same-session invalidation events identify the organization actually changed, while page
  feedback is restricted to the command's current context.
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

The earlier webhook deferral is superseded: integrations are owned by the nested
webhooks feature described below. Teams and Roles are implemented as distinct
Members tabs; their create sheets retain dirty-form dismissal guards. Do not treat
the old implementation inventory as a current feature roadmap or test result.

Invitation acceptance publishes
`organizationInvitationAcceptStoreEvents.acceptSucceeded({ organizationId })`
only after server acceptance. Organization caches and onboarding invalidate before
guards reload access, then the joined organization opens directly.

## Asset explorer paging

The assets pane preserves its three axes. Equipment and inspection lists each own their
page, exact total and request state. Changing a selected facility cancels old reads and
clears data from the previous scope; a retry only reloads the affected resource. Current
snapshot indicators remain separate from period-bound dashboard trends; resource-growth
charts are secondary to inspections and non-conformities.

Organization access changes are also consumed by Onboarding through the public access service,
transport models, membership events in `setup`, and `organizationAccessErrorMessage` in `utils`.
Discovery never accepts a caller-supplied domain and exposes no member lists or invitation tokens.
Access policy configuration requires both settings-write and members-manage; request review
requires members-manage and receives its assignable roles from the same scoped response.

The setup facade publishes `searchFacilityAddresses` for creator onboarding; it delegates to
Facilities transport and returns provider-normalized street, city, region, postal code, country and ISO country code together with the canonical label and coordinates.

The Assets compliance summary separates register generation (`generatedAt`) from the
oldest maintenance evaluation (`dataEvaluatedAt`) and shows the server count of active
equipment still unevaluated. Live summaries and immutable register archives remain distinct.

## Automation execution history

The `automations` nested feature owns `/organizations/:organizationId/automations`, guarded by
`organization.automation.read`. Explicit retries additionally require `organization.automation.manage`.
Organization settings retain policy editing under `organization.settings.write`; no run command
changes that policy. The shared organization navigation catalog exposes the history on desktop and
in the mobile directory. See `features/automations/FEATURE.md` for recovery and SSR invariants.

## Webhook integrations

The nested webhooks feature owns `/organizations/:organizationId/integrations/webhooks`,
with read-gated administration links in the organization switcher and More. Management
uses a separate permission and one-time secrets remain local to its transient dialog.

## Member presence

Organization owns the ephemeral member-presence state, transport and browser coordinator. Bootstrap
initializes the coordinator through `provideOrganizationFeature()` after hydration. Active membership
allows heartbeats; reading additionally requires members.read or messaging.read. No presence request
runs during SSR and no presence or subscription credential enters TransferState.

`MEMBER_PRESENCE_PORT` publishes confirmed snapshots and consumer registrations. The public
`services/member-presence` helper `registerMemberPresence` registers rendered member ids and releases
them on destruction. Concurrent surfaces are merged and reads are deduplicated in batches of 100.
Account consumes only the port's own status; collaboration consumes the port/helper and the public
`MemberPresenceIndicator` component through `ui/components/member-presence-indicator`. `PresenceStatus` is published through `models`.

Visible online sessions ping every 60 seconds and read every 45 seconds. A 90-second backend lease
expires independently of the browser; another device may keep it alive. Mercure ordinary private
`presence.changed` messages invalidate tracked members after a 300 ms coalescing window. Opening,
reconnecting, becoming visible or returning online reconciles immediately. Subscriber credentials
renew before expiry; polling remains available during Mercure failure and detects offline status
within 135 seconds of the last heartbeat. A 429 backs heartbeat attempts off for three minutes.
Session or organization changes cancel requests and clear snapshots. Unknown or unverifiable states
hide the indicator; pausing never deletes a lease shared by other devices.

Account owns the persistent global do-not-disturb preference. Presence decoration does not change
administrative membership status, notification delivery, unread counts, email or existing action
feedback. Avatar indicators use accessible labels and native semantic success/destructive/muted tokens.

## Public entry points

Layouts read permission grants through `ORGANIZATION_MEMBER_ACCESS_PORT`; the pure
`hasAnyOrganizationPermission` matcher is exported through `access` to preserve wildcard
semantics without injecting `OrganizationPermissionService` into the shell.

These narrow entry points are published to the named consumers. `app` denotes the application composition root. Standard concern barrels follow ARCHITECTURE.md; prose examples do not grant access.

| Entry point                               | Consumers                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/member-presence`                | `organization/features/collaboration`                                                                                                                                                       |
| `ui/components/member-presence-indicator` | `account`, `organization/features/collaboration`                                                                                                                                            |
| `services/browser-download`               | `organization/features/equipments`, `organization/features/facilities`, `organization/features/imports`, `organization/features/inspections`, `organization/features/maintenance-schedules` |
