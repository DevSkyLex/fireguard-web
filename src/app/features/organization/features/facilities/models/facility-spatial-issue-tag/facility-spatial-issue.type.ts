/**
 * Type FacilityGeometryIssue
 *
 * @description
 * Explains why a retained contour cannot be used in the current hierarchy.
 *
 * @type {FacilityGeometryIssue}
 */
export type FacilityGeometryIssue =
  | 'invalid_geometry'
  | 'plan_unavailable'
  | 'outside_ancestry'
  | 'other_plan';

/**
 * Type FacilityCalibrationIssue
 *
 * @description
 * Explains why a retained metric reference cannot be used in the current building.
 *
 * @type {FacilityCalibrationIssue}
 */
export type FacilityCalibrationIssue = 'building_changed' | 'unverified_frame';

/**
 * Type FacilityModelBindingIssueCode
 *
 * @description
 * Identifies a retained model association whose target is unavailable in the current building.
 *
 * @type {FacilityModelBindingIssueCode}
 */
export type FacilityModelBindingIssueCode = 'target_unavailable';

/**
 * Type FacilityHierarchyIssue
 *
 * @description
 * Describes an unusable structural relationship without exposing inaccessible ancestors.
 *
 * @type {FacilityHierarchyIssue}
 */
export type FacilityHierarchyIssue =
  | 'missing_parent'
  | 'invalid_parent_type'
  | 'unpublished_parent'
  | 'invalid_ancestor'
  | 'cycle'
  | 'depth_exceeded';

/**
 * Type FacilityEquipmentPlacementIssue
 *
 * @description
 * Describes why a retained equipment placement cannot be projected on this plan.
 *
 * @type {FacilityEquipmentPlacementIssue}
 */
export type FacilityEquipmentPlacementIssue =
  | 'missing_plan'
  | 'unplaced'
  | 'other_plan'
  | 'invalid_position'
  | 'outside_ancestry';
