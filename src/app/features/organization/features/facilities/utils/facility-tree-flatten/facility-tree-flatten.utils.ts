import type { ComplianceTreeNodeOutput } from '@features/organization/features/facilities/models';

/**
 * Function flattenComplianceTree
 *
 * @description
 * Flattens the Compliance-owned facility tree (recursive `children[]`) into
 * a flat `facilityId -> complianceRate` map, so the facilities map can join
 * it onto its own, already-flat facility list by id. A node with no
 * compliance data yet still gets an entry mapped to `null`, distinguishing
 * "known to have no data" from "not part of this tree at all" (absent from
 * the map).
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly ComplianceTreeNodeOutput[]} roots - The tree's root nodes.
 *
 * @returns {ReadonlyMap<string, number | null>} Every node's compliance rate, keyed by facility id.
 */
export function flattenComplianceTree(
  roots: readonly ComplianceTreeNodeOutput[],
): ReadonlyMap<string, number | null> {
  const rates = new Map<string, number | null>();

  const visit = (nodes: readonly ComplianceTreeNodeOutput[]): void => {
    for (const node of nodes) {
      rates.set(node.id, node.complianceRate);
      if (node.children.length > 0) visit(node.children);
    }
  };
  visit(roots);

  return rates;
}
