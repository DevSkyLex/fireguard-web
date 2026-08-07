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

/**
 * Priority descriptors (low → urgent).
 *
 * One glyph family — a chevron trending from down to up, a flat minus for
 * "normal" (no direction, the baseline), and a double chevron for the one
 * level past "high" — so all four share the same stroke weight and
 * silhouette instead of mixing unrelated shapes.
 */
const PRIORITY: Record<InterventionPriority, InterventionTagDescriptor> = {
  low: {
    label: $localize`:@@interventionPriority.low:Low`,
    severity: 'neutral',
    icon: 'lucideChevronDown',
  },
  normal: {
    label: $localize`:@@interventionPriority.normal:Normal`,
    severity: 'info',
    icon: 'lucideMinus',
  },
  high: {
    label: $localize`:@@interventionPriority.high:High`,
    severity: 'warning',
    icon: 'lucideChevronUp',
  },
  urgent: {
    label: $localize`:@@interventionPriority.urgent:Urgent`,
    severity: 'danger',
    icon: 'lucideChevronsUp',
  },
};

/**
 * Workflow status descriptors (draft → published).
 *
 * Severity code: only the two end states carry colour — `success` for the
 * positive outcome (published), `danger` for the destructive one
 * (abandoned). Every in-between workflow step is `neutral`, so colour reads
 * as "this is done" rather than shading each intermediate step.
 */
const STATUS: Record<InterventionStatus, InterventionTagDescriptor> = {
  draft: {
    label: $localize`:@@interventionStatus.draft:Draft`,
    severity: 'neutral',
    icon: 'lucideCircleDotDashed',
  },
  planned: {
    label: $localize`:@@interventionStatus.planned:Planned`,
    severity: 'neutral',
    icon: 'lucideCalendar',
  },
  in_progress: {
    label: $localize`:@@interventionStatus.inProgress:In progress`,
    severity: 'neutral',
    icon: 'lucideLoader',
  },
  submitted: {
    label: $localize`:@@interventionStatus.submitted:Submitted`,
    severity: 'neutral',
    icon: 'lucideSend',
  },
  changes_requested: {
    label: $localize`:@@interventionStatus.changesRequested:Changes requested`,
    severity: 'neutral',
    icon: 'lucideRotateCcw',
  },
  published: {
    label: $localize`:@@interventionStatus.published:Published`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  abandoned: {
    label: $localize`:@@interventionStatus.abandoned:Abandoned`,
    severity: 'danger',
    icon: 'lucideBan',
  },
};

/**
 * Intervention objective descriptors.
 *
 * Each objective gets its own colour, not the shared `info` blue: the three
 * read as distinct categories rather than shades of one workflow state.
 */
const TYPE: Record<InterventionType, InterventionTagDescriptor> = {
  site_setup: {
    label: $localize`:@@intervention.action.siteSetup:Site setup`,
    severity: 'info',
    icon: 'lucideMapPin',
  },
  inventory: {
    label: $localize`:@@intervention.action.inventory:Inventory`,
    severity: 'success',
    icon: 'lucidePackage',
  },
  inspection_campaign: {
    label: $localize`:@@intervention.type.inspectionCampaign:Inspection campaign`,
    severity: 'warning',
    icon: 'lucideClipboardCheck',
  },
};

/** Work item action descriptors. */
const WORK_ITEM_ACTION: Record<InterventionWorkItemAction, InterventionTagDescriptor> = {
  site_setup: {
    label: $localize`:@@intervention.action.siteSetup:Site setup`,
    severity: 'info',
    icon: 'lucideNetwork',
  },
  inventory: {
    label: $localize`:@@intervention.action.inventory:Inventory`,
    severity: 'info',
    icon: 'lucidePackage',
  },
  inspection: {
    label: $localize`:@@intervention.action.inspection:Inspection`,
    severity: 'info',
    icon: 'lucideBadgeCheck',
  },
};

/** Work item status descriptors. */
const WORK_ITEM_STATUS: Record<InterventionWorkItemStatus, InterventionTagDescriptor> = {
  planned: {
    label: $localize`:@@workItemStatus.planned:Planned`,
    severity: 'info',
    icon: 'lucideCalendar',
  },
  in_progress: {
    label: $localize`:@@workItemStatus.inProgress:In progress`,
    severity: 'warning',
    icon: 'lucideHourglass',
  },
  completed: {
    label: $localize`:@@workItemStatus.completed:Completed`,
    severity: 'success',
    icon: 'lucideCheck',
  },
  skipped: {
    label: $localize`:@@workItemStatus.skipped:Skipped`,
    severity: 'neutral',
    icon: 'lucideFastForward',
  },
};

/** Issue severity descriptors. */
const ISSUE_SEVERITY: Record<InterventionIssueSeverity, InterventionTagDescriptor> = {
  blocker: {
    label: $localize`:@@issueSeverity.blocker:Blocker`,
    severity: 'danger',
    icon: 'lucideBan',
  },
  warning: {
    label: $localize`:@@issueSeverity.warning:Warning`,
    severity: 'warning',
    icon: 'lucideTriangleAlert',
  },
  recommendation: {
    label: $localize`:@@issueSeverity.recommendation:Recommendation`,
    severity: 'info',
    icon: 'lucideInfo',
  },
};

/** Proposed change status descriptors. */
const CHANGE_STATUS: Record<InterventionChangeStatus, InterventionTagDescriptor> = {
  proposed: {
    label: $localize`:@@changeStatus.proposed:Proposed`,
    severity: 'info',
    icon: 'lucideClock',
  },
  rejected: {
    label: $localize`:@@changeStatus.rejected:Rejected`,
    severity: 'danger',
    icon: 'lucideX',
  },
  applied: {
    label: $localize`:@@changeStatus.applied:Applied`,
    severity: 'success',
    icon: 'lucideCheck',
  },
};

/** Inspection result descriptors. */
const INSPECTION_RESULT: Record<InspectionResult, InterventionTagDescriptor> = {
  pass: {
    label: $localize`:@@inspectionResult.pass:Pass`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  partial: {
    label: $localize`:@@inspectionResult.partial:Partial`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  fail: {
    label: $localize`:@@inspectionResult.fail:Fail`,
    severity: 'danger',
    icon: 'lucideCircleX',
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
 * Function resolveInterventionTag
 *
 * @description
 * Resolves the presentation descriptor for an intervention enum value.
 *
 * Falls back to a neutral, humanised descriptor for unknown values so the UI
 * degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionTagKind} kind - Enum family to resolve against.
 * @param {string} value - Raw enum value.
 *
 * @returns {InterventionTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveInterventionTag(
  kind: InterventionTagKind,
  value: string,
): InterventionTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
