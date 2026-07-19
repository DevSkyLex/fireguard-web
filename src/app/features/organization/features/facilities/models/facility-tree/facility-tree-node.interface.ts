/**
 * One node of the enriched facility hierarchy.
 *
 * Returned by `GET /organizations/{organizationId}/facility-tree`, which nests
 * the whole hierarchy in a single non-paginated response and enriches each node
 * with its equipment count and compliance verdict. It is a **different shape**
 * from {@link FacilityOutput}: it carries no audit fields, no address, and no
 * `hasChildren` flag — children are simply present.
 *
 * @since 1.0.0
 */
export interface FacilityTreeNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly parentFacilityId: string | null;
  readonly equipmentCount: number;
  readonly status: string;
  /** Percentage, 0–100 with one decimal; `null` when nothing is tracked yet. */
  readonly complianceRate: number | null;
  readonly children: readonly FacilityTreeNode[];
}
