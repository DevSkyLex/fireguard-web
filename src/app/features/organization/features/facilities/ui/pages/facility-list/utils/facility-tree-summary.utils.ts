import type { FacilityTreeNode } from '@features/organization/features/facilities/models';

/**
 * Estate totals derived from the facility tree.
 *
 * @since 1.0.0
 */
export interface FacilityTreeSummary {
  /** Number of nodes in the tree, at every depth. */
  readonly sites: number;

  /** Equipment tracked across every node. */
  readonly equipment: number;

  /** Estate compliance, or null when no node reports a rate. */
  readonly complianceRate: number | null;
}

/**
 * Summarises a facility tree into estate-level totals.
 *
 * Compliance is **weighted by equipment count**, not averaged across sites. An
 * unweighted mean lets a depot with two extinguishers offset a plant with two
 * hundred, which would report an estate as compliant while most of its assets
 * are overdue. Nodes reporting no rate are excluded from both sides of the
 * ratio rather than counted as zero — no data is not a failure.
 *
 * Walks the whole tree rather than reusing the table's `countTreeNodes`: that
 * helper is private to the table component and answers a different question
 * (how many rows render), and reaching into another component's utils is
 * forbidden by ARCHITECTURE §3.8.
 *
 * @param nodes - Root nodes of the tree.
 * @returns Totals across every node at every depth.
 */
export function summariseFacilityTree(nodes: readonly FacilityTreeNode[]): FacilityTreeSummary {
  let sites: number = 0;
  let equipment: number = 0;
  let ratedEquipment: number = 0;
  let weightedRate: number = 0;

  const walk = (current: readonly FacilityTreeNode[]): void => {
    for (const node of current) {
      sites += 1;
      equipment += node.equipmentCount;

      if (node.complianceRate !== null && node.equipmentCount > 0) {
        ratedEquipment += node.equipmentCount;
        weightedRate += node.complianceRate * node.equipmentCount;
      }

      walk(node.children);
    }
  };

  walk(nodes);

  return {
    sites,
    equipment,
    complianceRate: ratedEquipment > 0 ? Math.round(weightedRate / ratedEquipment) : null,
  };
}
