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
  READ: 'organization.read',
  DASHBOARD_READ: 'organization.dashboard.read',
  EVENTS_READ: 'organization.events.read',
  EVENTS_WRITE: 'organization.events.write',
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
  /** Read access to conversations, channels, direct messages and their contents. */
  MESSAGING_READ: 'organization.messaging.read',
  /** Permission required to post, edit and delete own messages, replies and attachments. */
  MESSAGING_WRITE: 'organization.messaging.write',
  /** Permission required to create/archive channels, manage participants and moderate messages. */
  MESSAGING_MANAGE: 'organization.messaging.manage',
  /** Permission required to open an assistant thread and ask questions. */
  ASSISTANT_USE: 'organization.assistant.use',
  /** Permission required to manage organization settings (general, notifications, regional). */
  SETTINGS_WRITE: 'organization.settings.write',
  /** Permission required to permanently delete the organization. */
  DELETE: 'organization.delete',
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
