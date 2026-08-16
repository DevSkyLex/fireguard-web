/**
 * Interface ComplianceFacilityTreeNodeOutput
 * @interface ComplianceFacilityTreeNodeOutput
 *
 * @description
 * One node of the Compliance module's enriched facility hierarchy: the same
 * identity fields the plain facility tree carries, plus the equipment count
 * and compliance verdict/rate the compliance register exposes. Recursive —
 * `children` nests the same shape, eagerly, to the leaves.
 */
export interface ComplianceFacilityTreeNodeOutput {
  //#region Properties
  /** Facility identifier. */
  readonly id: string;

  /** Facility display name. */
  readonly name: string;

  /** Facility type in the organization tree (`site`, `building`, `floor`, `zone`, `area`). */
  readonly type: string;

  /** Identifier of the parent facility, or `null` at the root. */
  readonly parentFacilityId: string | null;

  /** Total equipment count at this node. */
  readonly equipmentCount: number;

  /** Facility lifecycle status. */
  readonly status: string;

  /**
   * Compliance rate as a percentage (0.0-100.0, 1 decimal), or `null` when
   * undefined (no tracked equipment) — never `0`.
   */
  readonly complianceRate: number | null;

  /** Direct children, nested eagerly in the same shape. */
  readonly children: ReadonlyArray<ComplianceFacilityTreeNodeOutput>;
  //#endregion
}
