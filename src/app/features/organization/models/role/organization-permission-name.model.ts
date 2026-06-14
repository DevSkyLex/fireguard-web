/**
 * Constant ORGANIZATION_PERMISSION
 *
 * @description
 * Canonical organization-scoped permission names exposed by the frontend.
 *
 * A const object is preferred over a TypeScript enum here so consumers get
 * autocomplete and strict typing without introducing extra runtime enum code.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_PERMISSION = {
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
  LEGAL_PROFILE_WRITE: 'organization.legal_profile.write',
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
