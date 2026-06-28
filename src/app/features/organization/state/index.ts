// Root-provided organization stores and the feature-shared stores consumed across
// multiple pages/components (or by approved sibling features). Page-scoped stores
// consumed by a single page (team, settings, plan, billing, invitation-accept,
// audit) are intentionally NOT re-exported here — their owning page imports them
// directly from the slice barrel (ARCHITECTURE.md §11.3).
export type { ActiveOrganizationState } from './active-organization';
export type { OrganizationMemberAccessState } from './organization-member-access';
export type { OrganizationState } from './organization-list';
export type { OrganizationRoleListState } from './organization-roles';
export { ActiveOrganizationStore } from './active-organization';
export type { ActiveOrganizationStoreType } from './active-organization';
export { OrganizationMemberAccessStore } from './organization-member-access';
export type { OrganizationMemberAccessStoreType } from './organization-member-access';
export { OrganizationStore } from './organization-list';
export type { OrganizationStoreType } from './organization-list';
export { OrganizationRoleListStore } from './organization-roles';
export type { OrganizationRoleListStoreType } from './organization-roles';
export { activeOrganizationStoreEvents } from './active-organization';
export { organizationStoreEvents } from './organization-list';
export { OrganizationQuotaStore } from './organization-quota';
export type { OrganizationQuotaStoreType } from './organization-quota';
