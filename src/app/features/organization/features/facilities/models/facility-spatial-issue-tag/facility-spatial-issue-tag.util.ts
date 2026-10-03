import type {
  FacilityCalibrationIssue,
  FacilityGeometryIssue,
  FacilityModelBindingIssueCode,
  FacilityEquipmentPlacementIssue,
  FacilityHierarchyIssue,
} from './facility-spatial-issue.type';

/**
 * Constant HIERARCHY_ISSUE_LABELS
 *
 * @description
 * Shared corrective explanations for retained structural relationships.
 *
 * @constant HIERARCHY_ISSUE_LABELS
 */
const HIERARCHY_ISSUE_LABELS: Readonly<Record<FacilityHierarchyIssue, string>> = {
  missing_parent: $localize`:@@facility.hierarchy.missingParent:This place needs a parent. Use Move to choose one.`,
  invalid_parent_type: $localize`:@@facility.hierarchy.invalidParentType:The parent type is incompatible. Use Move to choose an admissible parent.`,
  unpublished_parent: $localize`:@@facility.hierarchy.unpublishedParent:The parent is unpublished. Publish it or move this place.`,
  cycle: $localize`:@@facility.hierarchy.cycle:The ancestor chain contains a cycle. Move this place to a valid branch.`,
  depth_exceeded: $localize`:@@facility.hierarchy.depthExceeded:The hierarchy is too deep. Move this place to a shorter branch.`,
  invalid_ancestor: $localize`:@@facility.hierarchy.invalidAncestor:An ancestor is invalid. Correct that ancestor or move this place to a valid branch.`,
};

/**
 * Function resolveFacilityHierarchyIssueLabel
 *
 * @description
 * Reuses the same structural remediation on facility records and projected floors.
 *
 * @param {string} code - Public hierarchy diagnostic code.
 *
 * @returns {string} Localized corrective explanation.
 */
export function resolveFacilityHierarchyIssueLabel(code: string): string {
  return (
    HIERARCHY_ISSUE_LABELS[code as FacilityHierarchyIssue] ??
    HIERARCHY_ISSUE_LABELS.invalid_ancestor
  );
}

/**
 * Constant SPATIAL_ISSUE_LABELS
 *
 * @description
 * Shared localized explanations for retained spatial data which cannot be used faithfully.
 *
 * @constant SPATIAL_ISSUE_LABELS
 */
const SPATIAL_ISSUE_LABELS: Readonly<
  Record<FacilityGeometryIssue | FacilityCalibrationIssue | FacilityModelBindingIssueCode, string>
> = {
  invalid_geometry: $localize`:@@facility.spatial.invalidGeometry:This saved contour is invalid. Redraw it on the floor plan.`,
  plan_unavailable: $localize`:@@facility.spatial.planUnavailable:The saved contour refers to a plan that is unavailable.`,
  outside_ancestry: $localize`:@@facility.spatial.outsideAncestry:The saved contour belongs to a plan outside this facility's current hierarchy.`,
  other_plan: $localize`:@@facility.spatial.otherPlan:The saved contour belongs to another plan.`,
  building_changed: $localize`:@@facility.spatial.buildingChanged:This calibration belongs to another building. Recalibrate the floor plan.`,
  unverified_frame: $localize`:@@facility.spatial.unverifiedFrame:The building reference for this calibration could not be verified. Recalibrate the floor plan.`,
  target_unavailable: $localize`:@@facility.spatial.targetUnavailable:The associated facility is unavailable in this building. Reassign or remove this association.`,
};

/**
 * Function resolveFacilitySpatialIssueLabel
 *
 * @description
 * Resolves API diagnostics through a shared presentation registry without exposing raw codes.
 *
 * @param {string} code - Spatial issue code.
 *
 * @returns {string} Localized explanation.
 */
export function resolveFacilitySpatialIssueLabel(code: string): string {
  return (
    SPATIAL_ISSUE_LABELS[code as keyof typeof SPATIAL_ISSUE_LABELS] ??
    $localize`:@@facility.spatial.unavailable:This spatial reference is unavailable. Review the facility's plan and associations.`
  );
}

/**
 * Constant EQUIPMENT_PLACEMENT_ISSUE_LABELS
 *
 * @description
 * Shared equipment-specific placement explanations for plan and 3D panels.
 *
 * @constant EQUIPMENT_PLACEMENT_ISSUE_LABELS
 */
const EQUIPMENT_PLACEMENT_ISSUE_LABELS: Readonly<Record<FacilityEquipmentPlacementIssue, string>> =
  {
    missing_plan: $localize`:@@facility.building3d.placement.missingPlan:No floor plan`,
    unplaced: $localize`:@@facility.building3d.placement.unplaced:Not placed`,
    other_plan: $localize`:@@facility.building3d.placement.otherPlan:Placed on another plan`,
    invalid_position: $localize`:@@facility.building3d.placement.invalid:Invalid placement`,
    outside_ancestry: $localize`:@@facility.spatial.placementOutsideAncestry:The saved placement belongs to a plan outside this equipment's current facility hierarchy.`,
  };

/**
 * Function resolveFacilityEquipmentPlacementIssueLabel
 *
 * @description
 * Resolves unusable equipment placements without synthesizing fallback coordinates.
 *
 * @param {FacilityEquipmentPlacementIssue} code - Equipment diagnostic code.
 *
 * @returns {string} Localized placement explanation.
 */
export function resolveFacilityEquipmentPlacementIssueLabel(
  code: FacilityEquipmentPlacementIssue,
): string {
  return EQUIPMENT_PLACEMENT_ISSUE_LABELS[code];
}
