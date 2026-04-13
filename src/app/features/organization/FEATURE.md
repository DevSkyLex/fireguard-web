# Organization Feature

## Purpose

Owns organization context and organization-scoped business workflows.

This feature is responsible for:

- organization list and active organization context,
- organization member, invitation, role, and audit data,
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

The `:organizationId` parent route resolves organization context before child pages render.

## State and Data Access

Primary stores:

- `ActiveOrganizationStore`
- `OrganizationStore`
- `OrganizationRoleListStore`
- `AuditStore`

Primary services:

- `OrganizationService`
- `OrganizationInvitationService`
- `OrganizationMemberService`
- `OrganizationRoleService`
- `AuditEventService`

Nested subfeatures under `features/organization/features/` own their own local routes, pages, and business flows while remaining under organization ownership.

## Published Contracts

- `ORGANIZATION_CONTEXT_PORT`
- `OrganizationContextPort`

This contract is the stable boundary for layouts and approved consumers that need the active organization context.

## Routing Notes

- Parent resolvers establish organization context and breadcrumb/title data.
- Organization-scoped child features must rely on the resolved route context instead of re-owning top-level organization selection.

## Cross-Feature Dependencies

- May expose organization context to shell composition through ports.
- Must not move organization-owned widgets into layouts just because they render in the shell.

## Invariants

- Active organization context is organization-owned state.
- Organization-scoped child workflows stay under this feature boundary.
- Layouts and sibling features consume organization behavior through the published port, not through direct store injection.
- Resolvers that load organization context belong to this feature.
