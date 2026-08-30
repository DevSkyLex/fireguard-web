import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { FacilityStatus } from '@features/organization/features/facilities/models';
import type {
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
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
 * A category, not a state: all three stay neutral and the glyph alone tells
 * them apart, so chroma keeps meaning "something needs attention".
 */
const TYPE: Record<InterventionType, InterventionTagDescriptor> = {
  site_setup: {
    label: $localize`:@@intervention.action.siteSetup:Site setup`,
    severity: 'neutral',
    icon: 'lucideMapPin',
  },
  inventory: {
    label: $localize`:@@intervention.action.inventory:Inventory`,
    severity: 'neutral',
    icon: 'lucidePackage',
  },
  inspection_campaign: {
    label: $localize`:@@intervention.type.inspectionCampaign:Inspection campaign`,
    severity: 'neutral',
    icon: 'lucideClipboardCheck',
  },
};

/**
 * Work item action descriptors.
 *
 * A category like the objective above — neutral, told apart by its glyph.
 */
const WORK_ITEM_ACTION: Record<InterventionWorkItemAction, InterventionTagDescriptor> = {
  site_setup: {
    label: $localize`:@@intervention.action.siteSetup:Site setup`,
    severity: 'neutral',
    icon: 'lucideNetwork',
  },
  inventory: {
    label: $localize`:@@intervention.action.inventory:Inventory`,
    severity: 'neutral',
    icon: 'lucidePackage',
  },
  inspection: {
    label: $localize`:@@intervention.action.inspection:Inspection`,
    severity: 'neutral',
    icon: 'lucideBadgeCheck',
  },
};

/**
 * Work item status descriptors.
 *
 * Only the completed end carries colour; `skipped` is terminal but not an
 * outcome, and the two in-between steps stay neutral.
 */
const WORK_ITEM_STATUS: Record<InterventionWorkItemStatus, InterventionTagDescriptor> = {
  planned: {
    label: $localize`:@@workItemStatus.planned:Planned`,
    severity: 'neutral',
    icon: 'lucideCalendar',
  },
  in_progress: {
    label: $localize`:@@workItemStatus.inProgress:In progress`,
    severity: 'neutral',
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

/**
 * Proposed change status descriptors.
 *
 * Only the two terminal states carry colour; a proposal awaiting review is
 * neutral.
 */
const CHANGE_STATUS: Record<InterventionChangeStatus, InterventionTagDescriptor> = {
  proposed: {
    label: $localize`:@@changeStatus.proposed:Proposed`,
    severity: 'neutral',
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

/** Inspection status descriptors. */
const INSPECTION_STATUS: Record<InspectionStatus, InterventionTagDescriptor> = {
  draft: {
    label: $localize`:@@inspectionStatus.draft:Draft`,
    severity: 'neutral',
    icon: 'lucideCircleDotDashed',
  },
  submitted: {
    label: $localize`:@@inspectionStatus.submitted:Submitted`,
    severity: 'neutral',
    icon: 'lucideSend',
  },
  closed: {
    label: $localize`:@@inspectionStatus.closed:Closed`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  cancelled: {
    label: $localize`:@@inspectionStatus.cancelled:Cancelled`,
    severity: 'danger',
    icon: 'lucideX',
  },
};

/** Facility lifecycle status descriptors. */
const FACILITY_STATUS: Record<FacilityStatus, InterventionTagDescriptor> = {
  active: {
    label: $localize`:@@facilityStatus.active:Active`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  archived: {
    label: $localize`:@@facilityStatus.archived:Archived`,
    severity: 'neutral',
    icon: 'lucideArchive',
  },
};

/** Equipment lifecycle status descriptors. */
const EQUIPMENT_STATUS: Record<EquipmentStatus, InterventionTagDescriptor> = {
  in_stock: {
    label: $localize`:@@equipmentStatus.inStock:In stock`,
    severity: 'neutral',
    icon: 'lucidePackage',
  },
  operational: {
    label: $localize`:@@equipmentStatus.operational:Operational`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  decommissioned: {
    label: $localize`:@@equipmentStatus.decommissioned:Decommissioned`,
    severity: 'danger',
    icon: 'lucideBan',
  },
  under_maintenance: {
    label: $localize`:@@equipmentStatus.underMaintenance:Under maintenance`,
    severity: 'warning',
    icon: 'lucideWrench',
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
  inspectionStatus: INSPECTION_STATUS,
  facilityStatus: FACILITY_STATUS,
  equipmentStatus: EQUIPMENT_STATUS,
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
