import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { InterventionChangeStatus } from '../intervention-change/intervention-change-status.type';
import type { InterventionWorkItemAction } from '../intervention-work-item/intervention-work-item-action.type';
import type { InterventionWorkItemStatus } from '../intervention-work-item/intervention-work-item-status.type';
import type { InterventionIssueSeverity } from '../intervention/intervention-issue-severity.type';
import type { InterventionPriority } from '../intervention/intervention-priority.type';
import type { InterventionStatus } from '../intervention/intervention-status.type';
import type { InterventionType } from '../intervention/intervention-type.type';
import type { InterventionTagDescriptor } from './intervention-tag-descriptor.interface';
import type { InterventionTagKind } from './intervention-tag-kind.type';

/** Priority descriptors (low → urgent). */
const PRIORITY: Record<InterventionPriority, InterventionTagDescriptor> = {
  low: { label: 'Low', severity: 'secondary', icon: 'pi pi-angle-down' },
  normal: { label: 'Normal', severity: 'info', icon: 'pi pi-minus' },
  high: { label: 'High', severity: 'warn', icon: 'pi pi-angle-up' },
  urgent: { label: 'Urgent', severity: 'danger', icon: 'pi pi-angle-double-up' },
};

/** Workflow status descriptors (draft → published). */
const STATUS: Record<InterventionStatus, InterventionTagDescriptor> = {
  draft: { label: 'Draft', severity: 'secondary', icon: 'pi pi-pencil' },
  planned: { label: 'Planned', severity: 'info', icon: 'pi pi-calendar' },
  in_progress: { label: 'In progress', severity: 'warn', icon: 'pi pi-hourglass' },
  submitted: { label: 'Submitted', severity: 'info', icon: 'pi pi-send' },
  changes_requested: { label: 'Changes requested', severity: 'warn', icon: 'pi pi-reply' },
  published: { label: 'Published', severity: 'success', icon: 'pi pi-check-circle' },
  abandoned: { label: 'Abandoned', severity: 'contrast', icon: 'pi pi-ban' },
};

/** Intervention objective descriptors. */
const TYPE: Record<InterventionType, InterventionTagDescriptor> = {
  site_setup: { label: 'Site setup', severity: 'info', icon: 'pi pi-sitemap' },
  inventory: { label: 'Inventory', severity: 'info', icon: 'pi pi-box' },
  inspection_campaign: { label: 'Inspection campaign', severity: 'info', icon: 'pi pi-clipboard' },
};

/** Work item action descriptors. */
const WORK_ITEM_ACTION: Record<InterventionWorkItemAction, InterventionTagDescriptor> = {
  site_setup: { label: 'Site setup', severity: 'info', icon: 'pi pi-sitemap' },
  inventory: { label: 'Inventory', severity: 'info', icon: 'pi pi-box' },
  inspection: { label: 'Inspection', severity: 'info', icon: 'pi pi-verified' },
};

/** Work item status descriptors. */
const WORK_ITEM_STATUS: Record<InterventionWorkItemStatus, InterventionTagDescriptor> = {
  planned: { label: 'Planned', severity: 'info', icon: 'pi pi-calendar' },
  in_progress: { label: 'In progress', severity: 'warn', icon: 'pi pi-hourglass' },
  completed: { label: 'Completed', severity: 'success', icon: 'pi pi-check' },
  skipped: { label: 'Skipped', severity: 'secondary', icon: 'pi pi-forward' },
};

/** Issue severity descriptors. */
const ISSUE_SEVERITY: Record<InterventionIssueSeverity, InterventionTagDescriptor> = {
  blocker: { label: 'Blocker', severity: 'danger', icon: 'pi pi-ban' },
  warning: { label: 'Warning', severity: 'warn', icon: 'pi pi-exclamation-triangle' },
  recommendation: { label: 'Recommendation', severity: 'info', icon: 'pi pi-info-circle' },
};

/** Proposed change status descriptors. */
const CHANGE_STATUS: Record<InterventionChangeStatus, InterventionTagDescriptor> = {
  proposed: { label: 'Proposed', severity: 'info', icon: 'pi pi-clock' },
  rejected: { label: 'Rejected', severity: 'danger', icon: 'pi pi-times' },
  applied: { label: 'Applied', severity: 'success', icon: 'pi pi-check' },
};

/** Inspection result descriptors. */
const INSPECTION_RESULT: Record<InspectionResult, InterventionTagDescriptor> = {
  pass: { label: 'Pass', severity: 'success', icon: 'pi pi-check-circle' },
  partial: { label: 'Partial', severity: 'warn', icon: 'pi pi-exclamation-circle' },
  fail: { label: 'Fail', severity: 'danger', icon: 'pi pi-times-circle' },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<InterventionTagKind, Record<string, InterventionTagDescriptor>> = {
  priority: PRIORITY,
  status: STATUS,
  type: TYPE,
  workItemAction: WORK_ITEM_ACTION,
  workItemStatus: WORK_ITEM_STATUS,
  issueSeverity: ISSUE_SEVERITY,
  changeStatus: CHANGE_STATUS,
  inspectionResult: INSPECTION_RESULT,
};

/**
 * Resolves the presentation descriptor for an intervention enum value.
 *
 * Falls back to a neutral, label-only descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw enum value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveInterventionTag(
  kind: InterventionTagKind,
  value: string,
): InterventionTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-tag',
    }
  );
}
