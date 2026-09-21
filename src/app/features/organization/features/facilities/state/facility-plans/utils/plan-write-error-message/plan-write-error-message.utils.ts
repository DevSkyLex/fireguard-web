import { isApiError } from '@core/api/utils';
import type { StoreError } from '@core/request-state';

/**
 * Function planWriteErrorMessage
 *
 * @description Maps stable plan mutation codes to recovery guidance without guessing from HTTP status.
 * @access public
 * @since 1.0.0
 * @param {StoreError} error - The normalized mutation failure.
 * @param {string} fallback - The operation-specific fallback.
 * @returns {string} A localized recovery message.
 */
export function planWriteErrorMessage(error: StoreError, fallback: string): string {
  const code: string | undefined = isApiError(error.error) ? error.error.code : undefined;
  switch (code) {
    case 'floor_plan_outside_ancestry':
      return $localize`:@@facility.plans.editor.error.zoneConflict:This floor plan is not part of this zone's facility ancestry.`;
    case 'equipment_facility_required':
      return $localize`:@@facility.plans.editor.error.pinConflict:This equipment is not assigned to a facility.`;
    case 'equipment_decommissioned':
      return $localize`:@@facility.plans.editor.error.decommissioned:Decommissioned equipment cannot be placed on a plan.`;
    case 'attachment_not_floor_plan':
      return $localize`:@@facility.plans.editor.error.notFloorPlan:Choose a floor plan to save these coordinates.`;
    case 'resource_revision_conflict':
      return $localize`:@@facility.plans.editor.error.revisionConflict:The resource changed. Check the refreshed plan before saving again. Your coordinates have been kept.`;
    default:
      return error.code === 412
        ? $localize`:@@facility.plans.editor.error.revisionConflict:The resource changed. Check the refreshed plan before saving again. Your coordinates have been kept.`
        : (error.message ?? fallback);
  }
}
