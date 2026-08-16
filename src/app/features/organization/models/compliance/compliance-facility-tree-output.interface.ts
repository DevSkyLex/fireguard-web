import type { HydraItem } from '@core/api/models';
import type { ComplianceFacilityTreeNodeOutput } from './compliance-facility-tree-node-output.interface';

/**
 * Interface ComplianceFacilityTreeOutput
 * @interface ComplianceFacilityTreeOutput
 *
 * @description
 * The Compliance module's enriched facility hierarchy for one organization
 * (`GET /organizations/{organizationId}/facility-tree`) — nested Site ->
 * Building -> Floor -> Zone/Area nodes, each carrying the same compliance
 * verdict/rate the compliance register exposes. A live read, eagerly nested
 * to the leaves; never a lazily-loaded branch.
 */
export interface ComplianceFacilityTreeOutput extends HydraItem {
  //#region Properties
  /** The organization this tree snapshot belongs to. */
  readonly organizationId: string;

  /** ISO 8601 datetime the tree snapshot was generated at. */
  readonly generatedAt: string;

  /** Root-level facility nodes, each nesting its own subtree under `children`. */
  readonly nodes: ReadonlyArray<ComplianceFacilityTreeNodeOutput>;
  //#endregion
}
