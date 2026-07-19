/**
 * Constant ORGANIZATION_PERMISSION
 *
 * @description
 * Canonical organization-scoped permission names exposed by the frontend.
 *
 * A const object is preferred over a TypeScript enum here so consumers get
 * autocomplete and strict typing without introducing extra runtime enum code.
 *
 * This catalog **mirrors** the backend's `OrganizationPermissionCatalog`. It is
 * not a curated subset: a name missing here cannot be checked at all, so a page
 * silently renders as if the permission did not exist. Add the name when the
 * backend grants it, not when a consumer appears.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_PERMISSION = {
  READ: 'organization.read',
  DASHBOARD_READ: 'organization.dashboard.read',
  MEMBERS_READ: 'organization.members.read',
  MEMBERS_MANAGE: 'organization.members.manage',
  ROLES_READ: 'organization.roles.read',
  ROLES_MANAGE: 'organization.roles.manage',
  FACILITIES_READ: 'organization.facilities.read',
  FACILITIES_WRITE: 'organization.facilities.write',
  EQUIPMENT_READ: 'organization.equipment.read',
  EQUIPMENT_WRITE: 'organization.equipment.write',
  INSPECTION_READ: 'organization.inspection.read',
  INSPECTION_WRITE: 'organization.inspection.write',
  /** Read access to intervention pages and intervention-linked resources. */
  INTERVENTIONS_READ: 'organization.interventions.read',
  /** Write access to intervention entities during preparation phase. */
  INTERVENTIONS_WRITE: 'organization.interventions.write',
  INTERVENTIONS_PLAN: 'organization.interventions.plan',
  INTERVENTIONS_EXECUTE: 'organization.interventions.execute',
  INTERVENTIONS_REVIEW: 'organization.interventions.review',
  /** Permission required to trigger intervention publication. */
  INTERVENTIONS_PUBLISH: 'organization.interventions.publish',
  /** Permission required to manage organization settings (general, notifications, regional). */
  SETTINGS_WRITE: 'organization.settings.write',
  /** Permission required to permanently delete the organization. */
  DELETE: 'organization.delete',
  /** Read the compliance register/summary; also gates the facility hierarchy. */
  COMPLIANCE_READ: 'organization.compliance.read',
  COMPLIANCE_EXPORT: 'organization.compliance.export',
  MAINTENANCE_READ: 'organization.maintenance.read',
  MAINTENANCE_MANAGE: 'organization.maintenance.manage',
  MESSAGING_READ: 'organization.messaging.read',
  MESSAGING_WRITE: 'organization.messaging.write',
  MESSAGING_MANAGE: 'organization.messaging.manage',
  ASSISTANT_USE: 'organization.assistant.use',
  EVENTS_READ: 'organization.events.read',
  EVENTS_WRITE: 'organization.events.write',
  TEAMS_READ: 'organization.teams.read',
  TEAMS_WRITE: 'organization.teams.write',
  TEAMS_MANAGE: 'organization.teams.manage',
  APPROVALS_READ: 'organization.approvals.read',
  APPROVALS_REQUEST: 'organization.approvals.request',
  APPROVALS_DECIDE: 'organization.approvals.decide',
  WEBHOOKS_READ: 'organization.webhooks.read',
  WEBHOOKS_MANAGE: 'organization.webhooks.manage',
  ALL: 'organization.*',
} as const;

/**
 * Type OrganizationPermissionName
 *
 * @description
 * Union of all known organization-scoped permission names.
 */
export type OrganizationPermissionName =
  (typeof ORGANIZATION_PERMISSION)[keyof typeof ORGANIZATION_PERMISSION];

/**
 * Constant ORGANIZATION_PERMISSION_NAMES
 *
 * @description
 * Flat list of all known organization-scoped permission names.
 */
export const ORGANIZATION_PERMISSION_NAMES: ReadonlyArray<OrganizationPermissionName> =
  Object.values(ORGANIZATION_PERMISSION);
