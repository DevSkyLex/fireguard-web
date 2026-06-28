# Organization Feature

## Purpose

Owns organization context and organization-scoped business workflows.

This feature is responsible for:

- organization list and active organization context,
- organization member, invitation, role, settings (general & branding), and audit data,
- organization subscription plan selection and plan-driven resource quotas (usage meters),
- organization billing (Stripe-hosted Checkout / customer Portal and invoice history),
- the organization overview dashboard (KPI cards and trend charts),
- organization-scoped permission helpers derived from the active member access payload,
- organization overview pages,
- nested organization-scoped subfeatures such as facilities, equipments, and inspections,
- publishing organization context to layouts and approved consumers.

This feature does not own generic shell composition or account-level user identity.

## Entry Points

- Routes: `organization.routes.ts`
- Public API: `index.ts`
- Root provider: `providers/organization.provider.ts`

## Routes

- `/organizations`
- `/organizations/:organizationId`
- `/organizations/:organizationId/facilities`
- `/organizations/:organizationId/equipments`
- `/organizations/:organizationId/inspections`
- `/organizations/:organizationId/checklists`
- `/organizations/:organizationId/team`
- `/organizations/:organizationId/settings` (tabbed via `?tab=`: general & branding, subscription, usage, notifications, regional & formats, danger zone; gated by `organization.settings.write`)
- `/organizations/invitations/accept`

The `:organizationId` parent route resolves organization context before child pages render.
Organization navigation and routes are filtered by the active member permissions. Subscription
plans cap resource quantities (see Subscription quotas below); they do not gate routes.

The settings page's danger-zone tab (organization deletion) is additionally gated by the
`organization.delete` permission. Notification and regional preferences are persisted via the
settings `PATCH` but are not yet enforced (notification dispatch and app-wide date/locale
formatting consume them in follow-up work).

## State and Data Access

Primary stores:

- `ActiveOrganizationStore`
- `OrganizationMemberAccessStore`
- `OrganizationStore`
- `OrganizationRoleListStore`
- `OrganizationPlanStore` (scoped to the `OrganizationPlanSelector` in the settings Subscription tab; self-service plan change)
- `OrganizationQuotaStore` (root-provided; active organization quota usage for the sidebar meters)
- `OrganizationBillingStore` (component-scoped to the settings Subscription tab; current subscription, plan pricing, hosted Stripe Checkout / Portal, invoice history)
- `OrganizationDashboardStore` (aggregate slice: overview KPI cards plus the per-metric trend stores under `state/organization-dashboard/slices/`)
- `OrganizationSettingsStore` (component-scoped to the settings page; general & branding mutations + logo upload, refreshes `ActiveOrganizationStore`)
- `OrganizationTeamStore` (component-scoped to the team page; members, invitations, roles and their assignments)
- `OrganizationInvitationAcceptStore` (page-scoped; accepts an invitation token)
- `AuditStore`

Primary services:

- `OrganizationService` (includes `changePlan` and `getQuota`)
- `PlanService`
- `BillingService` (Stripe Checkout / Portal session creation and invoice listing)
- `OrganizationInvitationService`
- `OrganizationMemberService`
- `OrganizationRoleService`
- `AuditEventService`

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
- The `OrganizationQuotaMeters` widget renders PrimeNG `MeterGroup` bars (used / limit per resource)
  in the organization context sidebar, driven by `OrganizationQuotaStore`.
- Plan cards consume `PlanOutput.quotas`: a backend-built list of `{ resource, label, limit, summary }`
  where `summary` is a ready-made sentence (e.g. "Up to 125 facilities" / "Unlimited inspections")
  phrased server-side in `OrganizationQuotaResource::summarize`, so the UI never re-derives the wording.
- Plan changes are self-service via `OrganizationPlanStore.changePlan`, which refreshes the active
  organization and reloads the quota usage so the meters reflect the new limits immediately.

Nested subfeatures under `features/organization/features/` own their own local routes, pages, and business flows while remaining under organization ownership.

## Published Contracts

- `ORGANIZATION_CONTEXT_PORT`
- `OrganizationContextPort`
- `ORGANIZATION_MEMBER_ACCESS_PORT`
- `OrganizationMemberAccessPort`
- `organization/setup`
- `OrganizationSetupService`

These contracts are the stable boundaries for approved consumers:

- layouts consume active organization context through `ORGANIZATION_CONTEXT_PORT`,
- approved sibling features consume current organization member roles and permissions through `ORGANIZATION_MEMBER_ACCESS_PORT`,
- onboarding consumes organization-owned setup workflows through `organization/setup`.

## Routing Notes

- Parent resolvers establish organization context and breadcrumb/title data.
- Organization-scoped child features must rely on the resolved route context instead of re-owning top-level organization selection.

## Cross-Feature Dependencies

- May expose organization context to shell composition through ports.
- May expose current active member access to approved sibling features through `ORGANIZATION_MEMBER_ACCESS_PORT`.
- May expose onboarding-approved setup workflows through `organization/setup`.
- Must not move organization-owned widgets into layouts just because they render in the shell.

## Invariants

- Active organization context is organization-owned state.
- Organization-scoped child workflows stay under this feature boundary.
- Layouts and sibling features consume organization behavior through the published port, not through direct store injection.
- Resolvers that load organization context belong to this feature.
