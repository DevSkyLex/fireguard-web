import type {
  ComplianceFacilityTreeNodeOutput,
  FlattenedComplianceTree,
} from '@features/organization/models';
import type { TreeNode } from '@shared/tree';

/**
 * Function flattenComplianceTree
 *
 * @description
 * Maps the Compliance module's recursively-nested facility tree onto the
 * shared `Tree` primitive's eager shape: every node in the payload is
 * already present, so `childrenByParent` is fully populated up front and the
 * primitive's own lazy `expandRequested` never has anything to ask for.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ReadonlyArray<ComplianceFacilityTreeNodeOutput>} nodes - The tree's root-level nodes.
 *
 * @returns {FlattenedComplianceTree} The roots and the fully-populated children map.
 */
export function flattenComplianceTree(
  nodes: ReadonlyArray<ComplianceFacilityTreeNodeOutput>,
): FlattenedComplianceTree {
  const childrenByParent: Record<
    string,
    ReadonlyArray<TreeNode<ComplianceFacilityTreeNodeOutput>>
  > = {};

  const visit = (
    node: ComplianceFacilityTreeNodeOutput,
  ): TreeNode<ComplianceFacilityTreeNodeOutput> => {
    const children = node.children.map(visit);
    if (node.children.length > 0) {
      childrenByParent[node.id] = children;
    }

    return {
      id: node.id,
      label: node.name,
      hasChildren: node.children.length > 0,
      data: node,
    };
  };

  const roots = nodes.map(visit);

  return { roots, childrenByParent };
}
