import type { PlanPoint } from '@shared/plan-viewer';

/**
 * Interface FacilityPlanOverlayZoneView
 * @interface FacilityPlanOverlayZoneView
 *
 * @description
 * One zone, pre-computed into the pixel-space shape `FacilityPlanOverlay`'s
 * template renders: an SVG `points` attribute value and the centroid its
 * name label sits at.
 *
 * @since 1.0.0
 */
export interface FacilityPlanOverlayZoneView {
  /** The zone's own facility id — activating it navigates to this record. */
  readonly facilityId: string;

  /** The zone's display name. */
  readonly name: string;

  /** The polygon's vertices in image-pixel coordinates, as an SVG `points` value. */
  readonly pointsAttr: string;

  /** The polygon's centroid, in image-pixel coordinates, where the name label is anchored. */
  readonly label: PlanPoint;
}
