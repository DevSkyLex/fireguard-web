import type {
  EquipmentPlanPosition,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';
import type { FacilityPlanCalibration } from '../facility-attachment/facility-plan-calibration.interface';
import type { FacilityPlanOverlayZone } from '../facility-plan-overlay/facility-plan-overlay-output.interface';
import type {
  FacilityCalibrationIssue,
  FacilityGeometryIssue,
  FacilityEquipmentPlacementIssue,
  FacilityHierarchyIssue,
} from '../facility-spatial-issue-tag/facility-spatial-issue.type';
import type { FacilityStatus } from '../facility/facility-output.interface';

/**
 * Interface FacilityBuildingModelPlan
 * @interface FacilityBuildingModelPlan
 *
 * @description
 * The primary floor plan and its optional physical calibration.
 */
export interface FacilityBuildingModelPlan {
  /**
   * Property attachmentId
   *
   * @description
   * Immutable plan attachment identifier.
   */
  readonly attachmentId: string;

  /**
   * Property imageWidth
   *
   * @description
   * Natural image width in pixels; null when unavailable.
   */
  readonly imageWidth: number | null;

  /**
   * Property imageHeight
   *
   * @description
   * Natural image height in pixels; null when unavailable.
   */
  readonly imageHeight: number | null;

  /**
   * Property calibration
   *
   * @description
   * Optional uniform physical scale and building-frame alignment.
   */
  readonly calibration: FacilityPlanCalibration | null;

  /**
   * Property calibrationBuildingId
   *
   * @description
   * Original building reference confirmed for the stored calibration.
   */
  readonly calibrationBuildingId?: string | null;

  /**
   * Property calibrationIssue
   *
   * @description
   * Current usability of the retained calibration in this building.
   */
  readonly calibrationIssue?: FacilityCalibrationIssue | null;
}

/**
 * Interface FacilityBuildingModelEquipment
 * @interface FacilityBuildingModelEquipment
 *
 * @description
 * Equipment assigned to this floor or a descendant, retaining source placement.
 */
export interface FacilityBuildingModelEquipment {
  /**
   * Property equipmentId
   *
   * @description
   * Equipment resource identifier.
   */
  readonly equipmentId: string;

  /**
   * Property facilityId
   *
   * @description
   * Facility to which this equipment is actually assigned.
   */
  readonly facilityId: string;

  /**
   * Property type
   *
   * @description
   * Equipment catalog type.
   */
  readonly type: string;

  /**
   * Property serialNumber
   *
   * @description
   * Optional identifying serial number.
   */
  readonly serialNumber: string | null;

  /**
   * Property locationLabel
   *
   * @description
   * Optional textual location.
   */
  readonly locationLabel: string | null;

  /**
   * Property status
   *
   * @description
   * Equipment business lifecycle status.
   */
  readonly status: EquipmentStatus;

  /**
   * Property position
   *
   * @description
   * Usable original normalized position, never synthesized.
   */
  readonly position: EquipmentPlanPosition | null;

  /**
   * Property placementIssue
   *
   * @description
   * Reason why no faithful marker can be rendered.
   */
  readonly placementIssue: FacilityEquipmentPlacementIssue | null;
}

/**
 * Type FacilityBuildingModelOutlineSource
 *
 * @description
 * Distinguishes a drawn footprint from estimated bounds.
 *
 * @type {FacilityBuildingModelOutlineSource}
 */
export type FacilityBuildingModelOutlineSource = 'plan_geometry' | 'rooms_bbox' | 'image_rect';

/**
 * Interface FacilityBuildingModelOutline
 * @interface FacilityBuildingModelOutline
 *
 * @description
 * A sanitized floor contour in normalized image coordinates.
 */
export interface FacilityBuildingModelOutline {
  /**
   * Property source
   *
   * @description
   * Source of the contour.
   */
  readonly source: FacilityBuildingModelOutlineSource;

  /**
   * Property points
   *
   * @description
   * Ordered normalized polygon vertices.
   */
  readonly points: ReadonlyArray<readonly [number, number]>;
}

/**
 * Interface FacilityBuildingModelFloor
 * @interface FacilityBuildingModelFloor
 *
 * @description
 * One floor in server render order, with rooms, equipment and explicit physical dimensions.
 */
export interface FacilityBuildingModelFloor {
  /**
   * Property facilityId
   *
   * @description
   * Floor facility identifier.
   */
  readonly facilityId: string;

  /**
   * Property name
   *
   * @description
   * Floor display name.
   */
  readonly name: string;

  /**
   * Property levelIndex
   *
   * @description
   * Ordering rank, never a physical elevation.
   */
  readonly levelIndex: number | null;

  /**
   * Property elevationMeters
   *
   * @description
   * Optional physical floor elevation.
   */
  readonly elevationMeters: number | null;

  /**
   * Property heightMeters
   *
   * @description
   * Optional physical floor height.
   */
  readonly heightMeters: number | null;

  /**
   * Property status
   *
   * @description
   * Facility business status.
   */
  readonly status: FacilityStatus;

  /**
   * Property hierarchyIssues
   *
   * @description
   * Retained structural diagnostics, including floors in an atypical legacy branch.
   */
  readonly hierarchyIssues: readonly FacilityHierarchyIssue[];

  /**
   * Property plan
   *
   * @description
   * Primary floor plan, or null when missing.
   */
  readonly plan: FacilityBuildingModelPlan | null;

  /**
   * Property outline
   *
   * @description
   * Sanitized drawn or estimated outline.
   */
  readonly outline: FacilityBuildingModelOutline | null;

  /**
   * Property rooms
   *
   * @description
   * Sanitized room contours on this primary plan.
   */
  readonly rooms: ReadonlyArray<FacilityPlanOverlayZone>;

  /**
   * Property equipment
   *
   * @description
   * Equipment of this floor and all its descendants.
   */
  readonly equipment: ReadonlyArray<FacilityBuildingModelEquipment>;

  /**
   * Property diagnostics
   *
   * @description
   * Counts of source geometry and equipment which cannot be faithfully rendered.
   */
  readonly diagnostics: {
    readonly invalidGeometryCount: number;
    readonly unpositionedEquipmentCount: number;
    readonly geometryIssues: readonly {
      readonly facilityId: string;
      readonly code: FacilityGeometryIssue;
    }[];
  };
}

/**
 * Interface FacilityBuildingModelOutput
 * @interface FacilityBuildingModelOutput
 *
 * @description
 * Organization-scoped building projection; floors retain server ordering.
 */
export interface FacilityBuildingModelOutput {
  /**
   * Property buildingId
   *
   * @description
   * Building facility identifier.
   */
  readonly buildingId: string;

  /**
   * Property buildingName
   *
   * @description
   * Building display name.
   */
  readonly buildingName: string;

  /**
   * Property floors
   *
   * @description
   * Floors in authoritative server render order.
   */
  readonly floors: ReadonlyArray<FacilityBuildingModelFloor>;
}
