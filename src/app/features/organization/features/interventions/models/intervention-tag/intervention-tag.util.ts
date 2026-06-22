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
  low: {
    label: $localize`:@@interventionPriority.low:Low`,
    severity: 'secondary',
    icon: 'pi pi-flag-fill',
  },
  normal: {
    label: $localize`:@@interventionPriority.normal:Normal`,
    severity: 'info',
    icon: 'pi pi-flag-fill',
  },
  high: {
    label: $localize`:@@interventionPriority.high:High`,
    severity: 'warn',
    icon: 'pi pi-flag-fill',
  },
  urgent: {
    label: $localize`:@@interventionPriority.urgent:Urgent`,
    severity: 'danger',
    icon: 'pi pi-flag-fill',
  },
};

/**
 * Workflow status descriptors (draft → published).
 *
 * Colour code: red (`danger`) only for the destructive end state (abandoned),
 * green (`success`) for the positive outcome (published), grey
 * (`secondary`) for neutral states, and informational blue/amber for the
 * in-between workflow steps.
 */
const STATUS: Record<InterventionStatus, InterventionTagDescriptor> = {
  draft: {
    label: $localize`:@@interventionStatus.draft:Draft`,
    severity: 'secondary',
    icon: 'pi pi-pencil',
  },
  planned: {
    label: $localize`:@@interventionStatus.planned:Planned`,
    severity: 'info',
    icon: 'pi pi-calendar',
  },
  in_progress: {
    label: $localize`:@@interventionStatus.inProgress:In progress`,
    severity: 'warn',
    icon: 'pi pi-hourglass',
  },
  submitted: {
    label: $localize`:@@interventionStatus.submitted:Submitted`,
    severity: 'info',
    icon: 'pi pi-send',
  },
  changes_requested: {
    label: $localize`:@@interventionStatus.changesRequested:Changes requested`,
    severity: 'warn',
    icon: 'pi pi-reply',
  },
  published: {
    label: $localize`:@@interventionStatus.published:Published`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  abandoned: {
    label: $localize`:@@interventionStatus.abandoned:Abandoned`,
    severity: 'danger',
    icon: 'pi pi-ban',
  },
};

/** Intervention objective descriptors. */
const TYPE: Record<InterventionType, InterventionTagDescriptor> = {
  site_setup: {
    label: $localize`:@@intervention.action.siteSetup:Site setup`,
    severity: 'info',
    icon: 'pi pi-sitemap',
  },
  inventory: {
    label: $localize`:@@intervention.action.inventory:Inventory`,
    severity: 'info',
    icon: 'pi pi-box',
  },
  inspection_campaign: {
    label: $localize`:@@intervention.type.inspectionCampaign:Inspection campaign`,
    severity: 'info',
    icon: 'pi pi-clipboard',
  },
};

/** Work item action descriptors. */
const WORK_ITEM_ACTION: Record<InterventionWorkItemAction, InterventionTagDescriptor> = {
  site_setup: {
    label: $localize`:@@intervention.action.siteSetup:Site setup`,
    severity: 'info',
    icon: 'pi pi-sitemap',
  },
  inventory: {
    label: $localize`:@@intervention.action.inventory:Inventory`,
    severity: 'info',
    icon: 'pi pi-box',
  },
  inspection: {
    label: $localize`:@@intervention.action.inspection:Inspection`,
    severity: 'info',
    icon: 'pi pi-verified',
  },
};

/** Work item status descriptors. */
const WORK_ITEM_STATUS: Record<InterventionWorkItemStatus, InterventionTagDescriptor> = {
  planned: {
    label: $localize`:@@workItemStatus.planned:Planned`,
    severity: 'info',
    icon: 'pi pi-calendar',
  },
  in_progress: {
    label: $localize`:@@workItemStatus.inProgress:In progress`,
    severity: 'warn',
    icon: 'pi pi-hourglass',
  },
  completed: {
    label: $localize`:@@workItemStatus.completed:Completed`,
    severity: 'success',
    icon: 'pi pi-check',
  },
  skipped: {
    label: $localize`:@@workItemStatus.skipped:Skipped`,
    severity: 'secondary',
    icon: 'pi pi-forward',
  },
};

/** Issue severity descriptors. */
const ISSUE_SEVERITY: Record<InterventionIssueSeverity, InterventionTagDescriptor> = {
  blocker: {
    label: $localize`:@@issueSeverity.blocker:Blocker`,
    severity: 'danger',
    icon: 'pi pi-ban',
  },
  warning: {
    label: $localize`:@@issueSeverity.warning:Warning`,
    severity: 'warn',
    icon: 'pi pi-exclamation-triangle',
  },
  recommendation: {
    label: $localize`:@@issueSeverity.recommendation:Recommendation`,
    severity: 'info',
    icon: 'pi pi-info-circle',
  },
};

/** Proposed change status descriptors. */
const CHANGE_STATUS: Record<InterventionChangeStatus, InterventionTagDescriptor> = {
  proposed: {
    label: $localize`:@@changeStatus.proposed:Proposed`,
    severity: 'info',
    icon: 'pi pi-clock',
  },
  rejected: {
    label: $localize`:@@changeStatus.rejected:Rejected`,
    severity: 'danger',
    icon: 'pi pi-times',
  },
  applied: {
    label: $localize`:@@changeStatus.applied:Applied`,
    severity: 'success',
    icon: 'pi pi-check',
  },
};

/** Inspection result descriptors. */
const INSPECTION_RESULT: Record<InspectionResult, InterventionTagDescriptor> = {
  pass: {
    label: $localize`:@@inspectionResult.pass:Pass`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  partial: {
    label: $localize`:@@inspectionResult.partial:Partial`,
    severity: 'warn',
    icon: 'pi pi-exclamation-circle',
  },
  fail: {
    label: $localize`:@@inspectionResult.fail:Fail`,
    severity: 'danger',
    icon: 'pi pi-times-circle',
  },
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
