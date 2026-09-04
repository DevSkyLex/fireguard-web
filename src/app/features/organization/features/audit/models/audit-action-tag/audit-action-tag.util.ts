import type { AuditActionId } from '../audit-action/audit-action-id.type';
import type { AuditActionModule } from '../audit-action/audit-action-module.type';
import type { AuditActionTagDescriptor } from './audit-action-tag-descriptor.interface';

/** Every real backend module. */
const AUDIT_ACTION_MODULES: ReadonlySet<AuditActionModule> = new Set([
  'organization',
  'facility',
  'equipment',
  'inspection',
  'intervention',
  'maintenance',
  'calendar',
  'automation',
  'messaging',
  'import',
  'compliance',
  'webhook',
  'approval',
] satisfies AuditActionModule[]);

/** Localized label and registered icon per module, including the frontend-only `'other'` fallback. */
const AUDIT_ACTION_MODULE_DESCRIPTORS: Record<
  AuditActionModule,
  { readonly label: string; readonly icon: string }
> = {
  organization: {
    label: $localize`:@@audit.module.organization:Organization`,
    icon: 'lucideBuilding',
  },
  facility: { label: $localize`:@@audit.module.facility:Facilities`, icon: 'lucideBuilding2' },
  equipment: { label: $localize`:@@audit.module.equipment:Equipment`, icon: 'lucideBox' },
  inspection: {
    label: $localize`:@@audit.module.inspection:Inspections`,
    icon: 'lucideClipboardList',
  },
  intervention: {
    label: $localize`:@@audit.module.intervention:Interventions`,
    icon: 'lucideCompass',
  },
  maintenance: { label: $localize`:@@audit.module.maintenance:Maintenance`, icon: 'lucideWrench' },
  calendar: { label: $localize`:@@audit.module.calendar:Calendar`, icon: 'lucideCalendarDays' },
  automation: { label: $localize`:@@audit.module.automation:Automation`, icon: 'lucideBot' },
  messaging: { label: $localize`:@@audit.module.messaging:Messaging`, icon: 'lucideHash' },
  import: { label: $localize`:@@audit.module.import:Imports`, icon: 'lucideUpload' },
  compliance: {
    label: $localize`:@@audit.module.compliance:Compliance`,
    icon: 'lucideShieldCheck',
  },
  webhook: { label: $localize`:@@audit.module.webhook:Webhooks`, icon: 'lucideWebhook' },
  approval: { label: $localize`:@@audit.module.approval:Approvals`, icon: 'lucideGavel' },
  other: { label: $localize`:@@audit.module.other:Other`, icon: 'lucideTag' },
};

/** Localized per-action label, keyed by the full `AuditActionId`. */
const AUDIT_ACTION_LABELS: Record<AuditActionId, string> = {
  'organization.created': $localize`:@@audit.action.organization.created:Organization created`,
  'organization.archived': $localize`:@@audit.action.organization.archived:Organization archived`,
  'organization.restored': $localize`:@@audit.action.organization.restored:Organization restored`,
  'organization.suspended': $localize`:@@audit.action.organization.suspended:Organization suspended`,
  'organization.settings_updated': $localize`:@@audit.action.organization.settings_updated:Settings updated`,
  'organization.plan_changed': $localize`:@@audit.action.organization.plan_changed:Plan changed`,
  'organization.ownership_transferred': $localize`:@@audit.action.organization.ownership_transferred:Ownership transferred`,
  'organization.role_created': $localize`:@@audit.action.organization.role_created:Role created`,
  'organization.role_updated': $localize`:@@audit.action.organization.role_updated:Role updated`,
  'organization.role_deleted': $localize`:@@audit.action.organization.role_deleted:Role deleted`,
  'organization.role_assigned': $localize`:@@audit.action.organization.role_assigned:Role assigned`,
  'organization.role_unassigned': $localize`:@@audit.action.organization.role_unassigned:Role unassigned`,
  'organization.permission_grant_denied': $localize`:@@audit.action.organization.permission_grant_denied:Permission grant denied`,
  'organization.last_admin_lockout_prevented': $localize`:@@audit.action.organization.last_admin_lockout_prevented:Last admin lockout prevented`,
  'organization.member_added': $localize`:@@audit.action.organization.member_added:Member added`,
  'organization.member_removed': $localize`:@@audit.action.organization.member_removed:Member removed`,
  'organization.invitation_sent': $localize`:@@audit.action.organization.invitation_sent:Invitation sent`,
  'organization.invitation_accepted': $localize`:@@audit.action.organization.invitation_accepted:Invitation accepted`,
  'organization.invitation_revoked': $localize`:@@audit.action.organization.invitation_revoked:Invitation revoked`,
  'organization.team_created': $localize`:@@audit.action.organization.team_created:Team created`,
  'organization.team_updated': $localize`:@@audit.action.organization.team_updated:Team updated`,
  'organization.team_deleted': $localize`:@@audit.action.organization.team_deleted:Team deleted`,
  'organization.team_member_added': $localize`:@@audit.action.organization.team_member_added:Team member added`,
  'organization.team_member_removed': $localize`:@@audit.action.organization.team_member_removed:Team member removed`,
  'facility.created': $localize`:@@audit.action.facility.created:Facility created`,
  'facility.archived': $localize`:@@audit.action.facility.archived:Facility archived`,
  'facility.restored': $localize`:@@audit.action.facility.restored:Facility restored`,
  'facility.moved': $localize`:@@audit.action.facility.moved:Facility moved`,
  'facility.updated': $localize`:@@audit.action.facility.updated:Facility updated`,
  'facility.subtree_duplicated': $localize`:@@audit.action.facility.subtree_duplicated:Facility subtree duplicated`,
  'equipment.commissioned': $localize`:@@audit.action.equipment.commissioned:Equipment commissioned`,
  'equipment.under_maintenance': $localize`:@@audit.action.equipment.under_maintenance:Equipment put under maintenance`,
  'equipment.returned_to_stock': $localize`:@@audit.action.equipment.returned_to_stock:Equipment returned to stock`,
  'equipment.decommissioned': $localize`:@@audit.action.equipment.decommissioned:Equipment decommissioned`,
  'inspection.submitted': $localize`:@@audit.action.inspection.submitted:Inspection submitted`,
  'inspection.closed': $localize`:@@audit.action.inspection.closed:Inspection closed`,
  'inspection.cancelled': $localize`:@@audit.action.inspection.cancelled:Inspection cancelled`,
  'inspection.non_conformity_recorded': $localize`:@@audit.action.inspection.non_conformity_recorded:Non-conformity recorded`,
  'inspection.non_conformity_status_changed': $localize`:@@audit.action.inspection.non_conformity_status_changed:Non-conformity status changed`,
  'intervention.published': $localize`:@@audit.action.intervention.published:Intervention published`,
  'intervention.publication_failed': $localize`:@@audit.action.intervention.publication_failed:Intervention publication failed`,
  'intervention.status_transitioned': $localize`:@@audit.action.intervention.status_transitioned:Intervention status changed`,
  'intervention.recurrence_created': $localize`:@@audit.action.intervention.recurrence_created:Recurrence created`,
  'intervention.recurrence_updated': $localize`:@@audit.action.intervention.recurrence_updated:Recurrence updated`,
  'intervention.recurrence_deleted': $localize`:@@audit.action.intervention.recurrence_deleted:Recurrence deleted`,
  'intervention.recurrence_materialized': $localize`:@@audit.action.intervention.recurrence_materialized:Recurrence materialized`,
  'intervention.report_exported': $localize`:@@audit.action.intervention.report_exported:Intervention report exported`,
  'maintenance.schedule_overridden': $localize`:@@audit.action.maintenance.schedule_overridden:Maintenance schedule overridden`,
  'maintenance.campaign_generated': $localize`:@@audit.action.maintenance.campaign_generated:Maintenance campaign generated`,
  'calendar.event_created': $localize`:@@audit.action.calendar.event_created:Calendar event created`,
  'calendar.event_updated': $localize`:@@audit.action.calendar.event_updated:Calendar event updated`,
  'calendar.event_deleted': $localize`:@@audit.action.calendar.event_deleted:Calendar event deleted`,
  'automation.rule_executed': $localize`:@@audit.action.automation.rule_executed:Automation rule executed`,
  'automation.rule_failed': $localize`:@@audit.action.automation.rule_failed:Automation rule failed`,
  'messaging.conversation_archived': $localize`:@@audit.action.messaging.conversation_archived:Conversation archived`,
  'messaging.message_moderated': $localize`:@@audit.action.messaging.message_moderated:Message moderated`,
  'messaging.message_unpin_moderated': $localize`:@@audit.action.messaging.message_unpin_moderated:Pinned message removed by moderation`,
  'messaging.channel_created': $localize`:@@audit.action.messaging.channel_created:Channel created`,
  'messaging.channel_participant_added': $localize`:@@audit.action.messaging.channel_participant_added:Channel participant added`,
  'messaging.channel_participant_removed': $localize`:@@audit.action.messaging.channel_participant_removed:Channel participant removed`,
  'messaging.channel_team_binding_changed': $localize`:@@audit.action.messaging.channel_team_binding_changed:Channel team binding changed`,
  'messaging.channel_parent_changed': $localize`:@@audit.action.messaging.channel_parent_changed:Channel parent changed`,
  'import.job_completed': $localize`:@@audit.action.import.job_completed:Import job completed`,
  'import.job_failed': $localize`:@@audit.action.import.job_failed:Import job failed`,
  'compliance.register_exported': $localize`:@@audit.action.compliance.register_exported:Safety register exported`,
  'webhook.subscription_created': $localize`:@@audit.action.webhook.subscription_created:Webhook subscription created`,
  'webhook.subscription_deleted': $localize`:@@audit.action.webhook.subscription_deleted:Webhook subscription deleted`,
  'approval.requested': $localize`:@@audit.action.approval.requested:Approval requested`,
  'approval.approved': $localize`:@@audit.action.approval.approved:Approval granted`,
  'approval.rejected': $localize`:@@audit.action.approval.rejected:Approval rejected`,
  'approval.expired': $localize`:@@audit.action.approval.expired:Approval request expired`,
  'approval.execution_failed': $localize`:@@audit.action.approval.execution_failed:Approved action failed to execute`,
};

/**
 * Function humanizeAuditActionId
 * @function humanizeAuditActionId
 *
 * @description
 * Turns an unrecognized raw action id into a sentence-cased fallback label,
 * normalizing every transport separator so newly introduced backend actions
 * remain visually consistent with registered labels.
 *
 * @access private
 * @since 1.1.0
 *
 * @param {string} value - The raw action id.
 *
 * @returns {string} A sentence-cased label with normalized spacing.
 */
function humanizeAuditActionId(value: string): string {
  const words: string = value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return words.length === 0
    ? $localize`:@@audit.action.unknown:Unknown action`
    : words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Function resolveAuditActionTag
 *
 * @description
 * Resolves the presentation descriptor for a raw `AuditEventOutput.action`
 * value. An id outside {@link AuditActionId} still resolves a correct
 * {@link AuditActionTagDescriptor.module} whenever its `module.` prefix
 * matches a known module — only the label degrades to a humanized version
 * of the raw string. An id with no recognizable prefix falls all the way
 * back to the `'other'` module.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw action id.
 *
 * @returns {AuditActionTagDescriptor} The matching descriptor, or a humanized fallback.
 */
export function resolveAuditActionTag(value: string): AuditActionTagDescriptor {
  const known: string | undefined = AUDIT_ACTION_LABELS[value as AuditActionId];
  const dotIndex: number = value.indexOf('.');
  const prefix: string = dotIndex === -1 ? value : value.slice(0, dotIndex);
  const module: AuditActionModule = AUDIT_ACTION_MODULES.has(prefix as AuditActionModule)
    ? (prefix as AuditActionModule)
    : 'other';
  const moduleDescriptor = AUDIT_ACTION_MODULE_DESCRIPTORS[module];

  return {
    label: known ?? humanizeAuditActionId(value),
    module,
    moduleLabel: moduleDescriptor.label,
    icon: moduleDescriptor.icon,
  };
}

/**
 * Function listAuditActionOptions
 *
 * @description
 * The full, module-grouped action catalog for the filter combobox — every
 * {@link AuditActionId} resolved through {@link resolveAuditActionTag}, in
 * declaration order (module order, then action order within a module).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {ReadonlyArray<{ value: AuditActionId; descriptor: AuditActionTagDescriptor }>} Every known action, with its resolved descriptor.
 */
export function listAuditActionOptions(): ReadonlyArray<{
  readonly value: AuditActionId;
  readonly descriptor: AuditActionTagDescriptor;
}> {
  return (Object.keys(AUDIT_ACTION_LABELS) as AuditActionId[]).map((value) => ({
    value,
    descriptor: resolveAuditActionTag(value),
  }));
}
