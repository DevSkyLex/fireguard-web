import type { FacilityTreeNode } from '@features/organization/features/facilities/models';

/**
 * Estate totals derived from the facility tree.
 *
 * @since 1.0.0
 */
export interface FacilityTreeSummary {
  /**
   * Facilities in the tree, at every depth.
   *
   * Not "sites": a building and a floor are facilities too, and labelling the
   * node count as sites overstates the estate by every level below the top.
   */
  readonly facilities: number;

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
/**
 * Filters a facility tree by name or type, keeping the path to every match.
 *
 * A node survives when it matches **or when any descendant does**: dropping an
 * unmatched parent would orphan its matching children and hide the very rows
 * the reader searched for. The kept ancestors are the address of the match —
 * "Boiler room" means nothing without the site above it.
 *
 * Children of a matching node are kept whole rather than filtered further: once
 * a site matches, the reader is looking at that site, and pruning inside it
 * would answer a question they did not ask.
 *
 * @param nodes - Root nodes of the tree.
 * @param term - Raw search text; blank returns the tree untouched.
 * @returns A new tree containing only matching branches.
 */
export function filterFacilityTree(
  nodes: readonly FacilityTreeNode[],
  term: string,
): readonly FacilityTreeNode[] {
  const needle: string = term.trim().toLowerCase();
  if (needle === '') return nodes;

  const keep = (node: FacilityTreeNode): FacilityTreeNode | null => {
    const matches: boolean = `${node.name} ${node.type}`.toLowerCase().includes(needle);
    if (matches) return node;

    const children: readonly FacilityTreeNode[] = node.children
      .map(keep)
      .filter((child): child is FacilityTreeNode => child !== null);

    return children.length > 0 ? { ...node, children } : null;
  };

  return nodes.map(keep).filter((node): node is FacilityTreeNode => node !== null);
}

export function summariseFacilityTree(nodes: readonly FacilityTreeNode[]): FacilityTreeSummary {
  let facilities: number = 0;
  let equipment: number = 0;
  let ratedEquipment: number = 0;
  let weightedRate: number = 0;

  const walk = (current: readonly FacilityTreeNode[]): void => {
    for (const node of current) {
      facilities += 1;
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
    facilities,
    equipment,
    complianceRate: ratedEquipment > 0 ? Math.round(weightedRate / ratedEquipment) : null,
  };
}
