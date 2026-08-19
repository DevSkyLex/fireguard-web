/**
 * Type AuditActionId
 *
 * @description
 * Every `module.snake_case` action id the backend's audit ledger currently
 * emits, verified at the source (there is no catalog endpoint). Used only
 * as the key type of `AUDIT_ACTION_DESCRIPTORS` in `resolveAuditActionTag`
 * — a raw `AuditEventOutput.action` string outside this union still renders,
 * through that resolver's fallback, since a backend addition always
 * precedes the frontend catching up.
 *
 * @since 1.0.0
 */
export type AuditActionId =
  // organization
  | 'organization.created'
  | 'organization.archived'
  | 'organization.restored'
  | 'organization.suspended'
  | 'organization.settings_updated'
  | 'organization.plan_changed'
  | 'organization.ownership_transferred'
  | 'organization.role_created'
  | 'organization.role_updated'
  | 'organization.role_deleted'
  | 'organization.role_assigned'
  | 'organization.role_unassigned'
  | 'organization.permission_grant_denied'
  | 'organization.last_admin_lockout_prevented'
  | 'organization.member_added'
  | 'organization.member_removed'
  | 'organization.invitation_sent'
  | 'organization.invitation_accepted'
  | 'organization.invitation_revoked'
  | 'organization.team_created'
  | 'organization.team_updated'
  | 'organization.team_deleted'
  | 'organization.team_member_added'
  | 'organization.team_member_removed'
  // facility
  | 'facility.created'
  | 'facility.archived'
  | 'facility.restored'
  | 'facility.moved'
  | 'facility.updated'
  | 'facility.subtree_duplicated'
  // equipment
  | 'equipment.commissioned'
  | 'equipment.under_maintenance'
  | 'equipment.returned_to_stock'
  | 'equipment.decommissioned'
  // inspection
  | 'inspection.submitted'
  | 'inspection.closed'
  | 'inspection.cancelled'
  | 'inspection.non_conformity_recorded'
  | 'inspection.non_conformity_status_changed'
  // intervention
  | 'intervention.published'
  | 'intervention.publication_failed'
  | 'intervention.status_transitioned'
  | 'intervention.recurrence_created'
  | 'intervention.recurrence_updated'
  | 'intervention.recurrence_deleted'
  | 'intervention.recurrence_materialized'
  // maintenance
  | 'maintenance.schedule_overridden'
  | 'maintenance.campaign_generated'
  // calendar
  | 'calendar.event_created'
  | 'calendar.event_updated'
  | 'calendar.event_deleted'
  // automation
  | 'automation.rule_executed'
  | 'automation.rule_failed'
  // messaging
  | 'messaging.conversation_archived'
  | 'messaging.message_moderated'
  | 'messaging.message_unpin_moderated'
  | 'messaging.channel_created'
  | 'messaging.channel_participant_added'
  | 'messaging.channel_participant_removed'
  | 'messaging.channel_team_binding_changed'
  | 'messaging.channel_parent_changed'
  // import
  | 'import.job_completed'
  | 'import.job_failed'
  // compliance
  | 'compliance.register_exported'
  // webhook
  | 'webhook.subscription_created'
  | 'webhook.subscription_deleted'
  // approval
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired'
  | 'approval.execution_failed';
