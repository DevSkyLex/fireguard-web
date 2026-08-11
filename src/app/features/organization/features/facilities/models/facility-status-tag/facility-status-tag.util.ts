import type { FacilityStatus } from '../facility/facility-output.interface';
import type { FacilityStatusTagDescriptor } from './facility-status-tag-descriptor.interface';

/**
 * Descriptors for `FacilityOutput.status`. `active` is the desirable state and
 * carries success; `archived` is a reversible, inert state rather than a
 * failure, so it stays neutral rather than danger — it can still be restored
 * (`FEATURE.md` "Deletion").
 */
const STATUS: Record<FacilityStatus, FacilityStatusTagDescriptor> = {
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

/**
 * Function resolveFacilityStatusTag
 *
 * @description
 * Resolves the presentation descriptor for a facility status enum value.
 * Falls back to a neutral, humanised descriptor for an unknown value so the
 * UI degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw enum value.
 *
 * @returns {FacilityStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveFacilityStatusTag(value: string): FacilityStatusTagDescriptor {
  return (
    STATUS[value as FacilityStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
