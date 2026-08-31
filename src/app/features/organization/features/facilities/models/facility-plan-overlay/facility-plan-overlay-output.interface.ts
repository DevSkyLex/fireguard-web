import type {
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import type { FacilityStatus, FacilityType } from '../facility/facility-output.interface';

/**
 * Interface FacilityPlanOverlayZone
 * @interface FacilityPlanOverlayZone
 *
 * @description
 * One facility rendered as a zone polygon on a floor plan — a child (or
 * further descendant) whose own `planGeometry` is drawn against this plan.
 * `points` are normalized 0–1 image coordinates, in polygon order.
 *
 * @since 1.0.0
 */
export interface FacilityPlanOverlayZone {
  /** The zone's own facility id — activating it navigates to this record. */
  readonly facilityId: string;

  /** The zone's display name. */
  readonly name: string;

  /** The zone's facility type. */
  readonly type: FacilityType;

  /** The zone's facility lifecycle status. */
  readonly status: FacilityStatus;

  /** The polygon's vertices, in order, each a normalized `[x, y]` pair. */
  readonly points: ReadonlyArray<readonly [number, number]>;
}

/**
 * Interface FacilityPlanOverlayEquipment
 * @interface FacilityPlanOverlayEquipment
 *
 * @description
 * One equipment item pinned on a floor plan. `x`/`y` are normalized 0–1
 * image coordinates.
 *
 * @since 1.0.0
 */
export interface FacilityPlanOverlayEquipment {
  /** The pinned equipment's id — activating it navigates to this record. */
  readonly equipmentId: string;

  /**
   * The equipment's type, as the backend's raw enum value.
   *
   * Equipment has no name field, so this endpoint once sent a label the
   * server had composed — `"gas_detector (SEED-GAS-003)"`, an untranslated
   * enum a client could only print verbatim. The identity now travels in
   * parts and the label is built here, against the translated
   * `EQUIPMENT_TYPE_OPTIONS` catalogue.
   */
  readonly type: EquipmentType;

  /** The equipment's serial number, when it carries one. */
  readonly serialNumber: string | null;

  /** Where the item sits, in the operator's own words — the most human of the three. */
  readonly locationLabel: string | null;

  /** The equipment's lifecycle status. */
  readonly status: EquipmentStatus;

  /** Normalized horizontal position, in `[0, 1]`. */
  readonly x: number;

  /** Normalized vertical position, in `[0, 1]`. */
  readonly y: number;
}

/**
 * Interface FacilityPlanOverlayOutput
 * @interface FacilityPlanOverlayOutput
 *
 * @description
 * The read-only overlay for one floor plan attachment — its zone polygons
 * and equipment pins, plus the image dimensions the normalized coordinates
 * are relative to. Returned by
 * `GET /api/organizations/{organizationId}/facilities/{facilityId}/plan-overlay`;
 * not a Hydra item (`FacilityService.getPlanOverlay` reads it directly
 * through `HttpClient`, like `FacilityAttachmentService.download`).
 *
 * @since 1.0.0
 */
export interface FacilityPlanOverlayOutput {
  /** The floor plan attachment this overlay was computed for. */
  readonly attachmentId: string;

  /** The plan image's natural pixel width — normalized coordinates are relative to this. */
  readonly imageWidth: number;

  /** The plan image's natural pixel height — normalized coordinates are relative to this. */
  readonly imageHeight: number;

  /** The plan's zone polygons. */
  readonly zones: ReadonlyArray<FacilityPlanOverlayZone>;

  /** The plan's equipment pins. */
  readonly equipment: ReadonlyArray<FacilityPlanOverlayEquipment>;
}
