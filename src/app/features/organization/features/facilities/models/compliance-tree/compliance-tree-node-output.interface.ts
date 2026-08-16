import type { HydraItem } from '@core/api/models';
import type { FacilityStatus, FacilityType } from '../facility/facility-output.interface';

/**
 * Interface ComplianceTreeNodeOutput
 * @interface ComplianceTreeNodeOutput
 *
 * @description
 * One node of the Compliance-owned facility tree
 * (`GET /api/organizations/{organizationId}/facility-tree`), recursively
 * carrying its own children. This feature only ever reads the tree flat
 * (`utils/facility-tree-flatten`) to join a facility id onto its compliance
 * rate for the map's compliance layer — it does not render the hierarchy
 * itself, so no other view model exists for this shape here.
 *
 * A sibling branch (`feat/compliance-explorer`) introduces its own
 * compliance transport for the explorer surface; this DTO is deliberately
 * scoped to the facilities map and is expected to be consolidated with that
 * branch's model at merge time (`FEATURE.md`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ComplianceTreeNodeOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   * @description Unique identifier of the facility this node represents.
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   * @description Human-readable facility name.
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   * @readonly
   * @description Type of the facility in the organization tree.
   * @type {FacilityType}
   */
  readonly type: FacilityType;

  /**
   * Property parentFacilityId
   * @readonly
   * @description Identifier of the parent facility, or `null` at the root.
   * @type {string | null}
   */
  readonly parentFacilityId: string | null;

  /**
   * Property equipmentCount
   * @readonly
   * @description Number of equipment items assigned to the facility.
   * @type {number}
   */
  readonly equipmentCount: number;

  /**
   * Property status
   * @readonly
   * @description Current lifecycle status of the facility.
   * @type {FacilityStatus}
   */
  readonly status: FacilityStatus;

  /**
   * Property complianceRate
   * @readonly
   * @description Whole-percentage compliance rate, or `null` when the facility has no compliance data yet.
   * @type {number | null}
   */
  readonly complianceRate: number | null;

  /**
   * Property children
   * @readonly
   * @description This node's direct children, recursively shaped the same way.
   * @type {readonly ComplianceTreeNodeOutput[]}
   */
  readonly children: readonly ComplianceTreeNodeOutput[];
  //#endregion
}
