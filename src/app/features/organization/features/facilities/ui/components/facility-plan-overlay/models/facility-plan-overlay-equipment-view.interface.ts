import type { EquipmentStatusTagDescriptor } from '@features/organization/features/facilities/models';
import type { PlanPoint } from '@shared/plan-viewer';

/**
 * Interface FacilityPlanOverlayEquipmentView
 * @interface FacilityPlanOverlayEquipmentView
 *
 * @description
 * One equipment pin, pre-computed into the pixel-space shape
 * `FacilityPlanOverlay`'s template renders: its image-pixel position, its
 * status descriptor, the Tailwind class carrying that status's colour, and
 * its accessible name.
 *
 * @since 1.0.0
 */
export interface FacilityPlanOverlayEquipmentView {
  /** The pinned equipment's id — activating it navigates to this record. */
  readonly equipmentId: string;

  /** The pin's position, in image-pixel coordinates. */
  readonly position: PlanPoint;

  /** The equipment status's presentation descriptor (label, severity, icon). */
  readonly descriptor: EquipmentStatusTagDescriptor;

  /** The severity's icon colour class. */
  readonly iconClass: string;

  /** Localized "{name}, {status}", the pin button's `aria-label`. */
  readonly ariaLabel: string;
}
