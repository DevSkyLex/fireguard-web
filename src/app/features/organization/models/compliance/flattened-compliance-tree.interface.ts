import type { TreeNode } from '@shared/tree';
import type { ComplianceFacilityTreeNodeOutput } from './compliance-facility-tree-node-output.interface';

/**
 * Interface FlattenedComplianceTree
 * @interface FlattenedComplianceTree
 *
 * @description
 * The shared `Tree` primitive's eager input shape: top-level roots plus every
 * branch's children, keyed by parent id — the return type of
 * `utils/compliance-tree-to-tree-node`'s `flattenComplianceTree`.
 */
export interface FlattenedComplianceTree {
  //#region Properties
  /** The tree's root nodes. */
  readonly roots: ReadonlyArray<TreeNode<ComplianceFacilityTreeNodeOutput>>;

  /** Every node's direct children, keyed by parent id — populated for the whole tree. */
  readonly childrenByParent: Readonly<
    Record<string, ReadonlyArray<TreeNode<ComplianceFacilityTreeNodeOutput>>>
  >;
  //#endregion
}
