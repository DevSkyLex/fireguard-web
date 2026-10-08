/**
 * Constant ORGANIZATION_PERMISSION
 *
 * @description
 * Canonical organization-scoped permission names exposed by the frontend.
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
  WORKLOAD_READ: 'organization.workload.read',
  WORKLOAD_MANAGE: 'organization.workload.manage',
  INTERVENTIONS_TIME_WRITE: 'organization.interventions.time.write',
  INTERVENTIONS_TIME_MANAGE: 'organization.interventions.time.manage',
  MEMBERS_READ: 'organization.members.read',
  MEMBERS_MANAGE: 'organization.members.manage',
  ROLES_READ: 'organization.roles.read',
  ROLES_MANAGE: 'organization.roles.manage',
  FACILITIES_READ: 'organization.facilities.read',
  FACILITIES_WRITE: 'organization.facilities.write',
  CUSTOMERS_READ: 'organization.customers.read',
  CUSTOMERS_MANAGE: 'organization.customers.manage',
  SERVICE_REQUESTS_READ: 'organization.service_requests.read',
  SERVICE_REQUESTS_CREATE: 'organization.service_requests.create',
  SERVICE_REQUESTS_MANAGE: 'organization.service_requests.manage',
  INVENTORY_READ: 'organization.inventory.read',
  INVENTORY_MANAGE: 'organization.inventory.manage',
  INVENTORY_CONSUME: 'organization.inventory.consume',
  PROCUREMENT_READ: 'organization.procurement.read',
  PROCUREMENT_MANAGE: 'organization.procurement.manage',
  MAINTENANCE_COST_READ: 'organization.maintenance_cost.read',
  MAINTENANCE_COST_MANAGE: 'organization.maintenance_cost.manage',
  MAINTENANCE_EXPORTS_READ: 'organization.maintenance_exports.read',
  MAINTENANCE_EXPORTS_MANAGE: 'organization.maintenance_exports.manage',
  MAINTENANCE_EXPORTS_CONFIRM: 'organization.maintenance_exports.confirm',
  EQUIPMENT_READ: 'organization.equipment.read',
  EQUIPMENT_WRITE: 'organization.equipment.write',
  INSPECTION_READ: 'organization.inspection.read',
  INSPECTION_WRITE: 'organization.inspection.write',
  /**
   * @description
   * Read access to intervention pages and intervention-linked resources.
   */
  INTERVENTIONS_READ: 'organization.interventions.read',
  /**
   * @description
   * Write access to intervention entities during preparation phase.
   */
  INTERVENTIONS_WRITE: 'organization.interventions.write',
  INTERVENTIONS_PLAN: 'organization.interventions.plan',
  INTERVENTIONS_EXECUTE: 'organization.interventions.execute',
  INTERVENTIONS_REVIEW: 'organization.interventions.review',
  /**
   * @description
   * Permission required to trigger intervention publication.
   */
  INTERVENTIONS_PUBLISH: 'organization.interventions.publish',
  /**
   * @description
   * Read access to conversations, channels, direct messages and their contents.
   */
  MESSAGING_READ: 'organization.messaging.read',
  /**
   * @description
   * Permission required to post, edit and delete own messages, replies and attachments.
   */
  MESSAGING_WRITE: 'organization.messaging.write',
  /**
   * @description
   * Permission required to create/archive channels, manage participants and moderate messages.
   */
  MESSAGING_MANAGE: 'organization.messaging.manage',
  /**
   * @description
   * Permission required to open an assistant thread and ask questions.
   */
  ASSISTANT_USE: 'organization.assistant.use',
  /**
   * @description
   * Permission required to manage organization settings (general, notifications, regional).
   */
  AUTOMATION_READ: 'organization.automation.read',
  AUTOMATION_MANAGE: 'organization.automation.manage',
  SETTINGS_WRITE: 'organization.settings.write',
  /**
   * @description
   * Read access to the compliance rollup, facility tree and per-facility summaries.
   */
  COMPLIANCE_READ: 'organization.compliance.read',
  /**
   * @description
   * Permission required to export the safety-register PDF (the backend additionally gates it on
   * plan tier).
   */
  COMPLIANCE_EXPORT: 'organization.compliance.export',
  /**
   * @description
   * Read access to the maintenance schedules.
   */
  MAINTENANCE_READ: 'organization.maintenance.read',
  /**
   * @description
   * Permission required to override maintenance intervals and generate campaigns.
   */
  MAINTENANCE_MANAGE: 'organization.maintenance.manage',
  /**
   * @description
   * Read access to teams and their membership.
   */
  TEAMS_READ: 'organization.teams.read',
  /**
   * @description
   * Permission required to create and edit teams.
   */
  TEAMS_WRITE: 'organization.teams.write',
  /**
   * @description
   * Permission required to manage team membership and deletion.
   */
  TEAMS_MANAGE: 'organization.teams.manage',
  /**
   * @description
   * Read access to the organization activity feed (audit events scoped to the organization).
   */
  AUDIT_READ: 'organization.audit.read',
  /**
   * @description
   * Read access to four-eyes approval requests.
   */
  APPROVALS_READ: 'organization.approvals.read',
  /**
   * @description
   * Permission required to submit an action for four-eyes approval.
   */
  APPROVALS_REQUEST: 'organization.approvals.request',
  /**
   * @description
   * Permission required to approve or reject a pending approval request.
   */
  APPROVALS_DECIDE: 'organization.approvals.decide',
  /**
   * @description
   * Read access to webhook subscriptions and their deliveries.
   */
  WEBHOOKS_READ: 'organization.webhooks.read',
  /**
   * @description
   * Permission required to manage webhook subscriptions.
   */
  WEBHOOKS_MANAGE: 'organization.webhooks.manage',
  /**
   * @description
   * Permission required to permanently delete the organization.
   */
  DELETE: 'organization.delete',
  ALL: 'organization.*',
} as const;

/**
 * Type OrganizationPermissionName
 *
 * @description
 * Union of all known organization-scoped permission names.
 *
 * @type {(typeof ORGANIZATION_PERMISSION)[keyof typeof ORGANIZATION_PERMISSION]}
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
