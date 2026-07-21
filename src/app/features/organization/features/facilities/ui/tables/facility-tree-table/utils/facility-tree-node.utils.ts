import type { TreeNode } from 'primeng/api';
import type { FacilityTreeNode } from '@features/organization/features/facilities/models';

/**
 * Function toTreeNodes
 *
 * @description
 * Maps the API's nested facility hierarchy onto PrimeNG's `TreeNode` shape.
 *
 * Roots arrive expanded, so a site's buildings read without a single click.
 * Deeper levels stay collapsed: opening every floor and zone of a large estate
 * on arrival would bury the sites the reader came for.
 *
 * `expandAll` overrides that for a filtered hierarchy. What survives a filter
 * is already the answer, and a match three levels down that stays collapsed is
 * indistinguishable from no match at all.
 *
 * @param {readonly FacilityTreeNode[]} nodes - The API hierarchy.
 * @param {boolean} [expandAll] - Open every level, whatever its depth.
 * @param {number} [depth] - Current depth, used to decide the expanded state.
 *
 * @returns {TreeNode<FacilityTreeNode>[]} The PrimeNG hierarchy.
 */
export function toTreeNodes(
  nodes: readonly FacilityTreeNode[],
  expandAll: boolean = false,
  depth: number = 0,
): TreeNode<FacilityTreeNode>[] {
  return nodes.map(
    (node: FacilityTreeNode): TreeNode<FacilityTreeNode> => ({
      key: node.id,
      data: node,
      expanded: expandAll || depth < 1,
      leaf: node.children.length === 0,
      children: toTreeNodes(node.children, expandAll, depth + 1),
    }),
  );
}

/**
 * Function countTreeNodes
 *
 * @description
 * Total number of facilities in the hierarchy, at every depth.
 *
 * @param {readonly FacilityTreeNode[]} nodes - The API hierarchy.
 *
 * @returns {number} The node count.
 */
export function countTreeNodes(nodes: readonly FacilityTreeNode[]): number {
  return nodes.reduce(
    (total: number, node: FacilityTreeNode): number => total + 1 + countTreeNodes(node.children),
    0,
  );
}
