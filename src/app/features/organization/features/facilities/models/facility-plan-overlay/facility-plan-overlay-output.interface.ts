import type {
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import type {
  FacilityGeometryIssue,
  FacilityEquipmentPlacementIssue,
} from '../facility-spatial-issue-tag/facility-spatial-issue.type';
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
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * The zone's own facility id — activating it navigates to this record.
   *
   * @type {string}
   */
  readonly facilityId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * The zone's display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * The zone's facility type.
   *
   * @type {FacilityType}
   */
  readonly type: FacilityType;

  /**
   * Property status
   * @readonly
   *
   * @description
   * The zone's facility lifecycle status.
   *
   * @type {FacilityStatus}
   */
  readonly status: FacilityStatus;

  /**
   * Property points
   * @readonly
   *
   * @description
   * The polygon's vertices, in order, each a normalized `[x, y]` pair.
   *
   * @type {ReadonlyArray<readonly [number, number]>}
   */
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
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * The pinned equipment's id — activating it navigates to this record.
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * The equipment's type, as the backend's raw enum value.
   * Equipment has no name field, so this endpoint once sent a label the
   * server had composed — `"gas_detector (SEED-GAS-003)"`, an untranslated
   * enum a client could only print verbatim. The identity now travels in
   * parts and the label is built here, against the translated
   * `EQUIPMENT_TYPE_OPTIONS` catalogue.
   *
   * @type {EquipmentType}
   */
  readonly type: EquipmentType;

  /**
   * Property serialNumber
   * @readonly
   *
   * @description
   * The equipment's serial number, when it carries one.
   *
   * @type {string | null}
   */
  readonly serialNumber: string | null;

  /**
   * Property locationLabel
   * @readonly
   *
   * @description
   * Where the item sits, in the operator's own words — the most human of the three.
   *
   * @type {string | null}
   */
  readonly locationLabel: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * The equipment's lifecycle status.
   *
   * @type {EquipmentStatus}
   */
  readonly status: EquipmentStatus;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Normalized horizontal position, in `[0, 1]`.
   *
   * @type {number}
   */
  readonly x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Normalized vertical position, in `[0, 1]`.
   *
   * @type {number}
   */
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
  /**
   * Property attachmentId
   * @readonly
   *
   * @description
   * The floor plan attachment this overlay was computed for.
   *
   * @type {string}
   */
  readonly attachmentId: string;

  /**
   * Property imageWidth
   * @readonly
   *
   * @description
   * The plan image's natural pixel width — normalized coordinates are relative to this.
   *
   * @type {number}
   */
  readonly imageWidth: number;

  /**
   * Property imageHeight
   * @readonly
   *
   * @description
   * The plan image's natural pixel height — normalized coordinates are relative to this.
   *
   * @type {number}
   */
  readonly imageHeight: number;

  /**
   * Property zones
   * @readonly
   *
   * @description
   * The plan's zone polygons.
   *
   * @type {ReadonlyArray<FacilityPlanOverlayZone>}
   */
  readonly zones: ReadonlyArray<FacilityPlanOverlayZone>;

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * The plan's equipment pins.
   *
   * @type {ReadonlyArray<FacilityPlanOverlayEquipment>}
   */
  readonly equipment: ReadonlyArray<FacilityPlanOverlayEquipment>;

  /**
   * Property geometryIssues
   * @readonly
   *
   * @description
   * Saved contour references which cannot be rendered faithfully on this plan.
   *
   * @type {readonly {
   *   readonly facilityId: string;
   *   readonly code: FacilityGeometryIssue;
   * }[]}
   */
  readonly geometryIssues: readonly {
    readonly facilityId: string;
    readonly code: FacilityGeometryIssue;
  }[];

  /**
   * Property equipmentIssues
   * @readonly
   *
   * @description
   * Saved equipment placements which cannot be rendered faithfully on this plan.
   *
   * @type {readonly {
   *   readonly equipmentId: string;
   *   readonly code: FacilityEquipmentPlacementIssue;
   * }[]}
   */
  readonly equipmentIssues: readonly {
    readonly equipmentId: string;
    readonly code: FacilityEquipmentPlacementIssue;
  }[];
}
