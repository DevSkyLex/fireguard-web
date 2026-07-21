import type { FacilityTreeNode } from '@features/organization/features/facilities/models';
import type { FacilityMapStats } from '@features/organization/models';

/**
 * Indexes a facility tree into per-node map stats.
 *
 * Walks every node at every depth (not just roots), so a card for a
 * building-type facility that itself carries coordinates still resolves.
 *
 * @param nodes - Root nodes of the tree, as returned by `FacilityTreeStore`.
 * @returns Stats keyed by facility id.
 */
export function buildFacilityMapStats(
  nodes: readonly FacilityTreeNode[],
): ReadonlyMap<string, FacilityMapStats> {
  const stats = new Map<string, FacilityMapStats>();

  const countBuildings = (node: FacilityTreeNode): number =>
    node.children.reduce(
      (total: number, child: FacilityTreeNode): number =>
        total + (child.type === 'building' ? 1 : 0) + countBuildings(child),
      0,
    );

  const walk = (list: readonly FacilityTreeNode[]): void => {
    for (const node of list) {
      stats.set(node.id, {
        complianceRate: node.complianceRate,
        buildingsCount: countBuildings(node),
      });
      walk(node.children);
    }
  };

  walk(nodes);
  return stats;
}
