import type { FacilityTreeNode } from '@features/organization/features/facilities/models';
import { summariseFacilityTree } from '../facility-tree-summary.utils';

const node = (
  id: string,
  equipmentCount: number,
  complianceRate: number | null,
  children: readonly FacilityTreeNode[] = [],
): FacilityTreeNode =>
  ({ id, name: id, type: 'site', equipmentCount, complianceRate, children }) as FacilityTreeNode;

/**
 * This strip states an estate-wide compliance figure. The weighting is the
 * whole point: it must not let a tiny site speak for a large one.
 */
describe('summariseFacilityTree', () => {
  it('counts nodes at every depth, not just roots', () => {
    const tree = [
      node('a', 0, null, [node('a1', 0, null), node('a2', 0, null)]),
      node('b', 0, null),
    ];

    expect(summariseFacilityTree(tree).sites).toBe(4);
  });

  it('sums equipment across the whole tree', () => {
    const tree = [node('a', 10, null, [node('a1', 5, null)]), node('b', 2, null)];

    expect(summariseFacilityTree(tree).equipment).toBe(17);
  });

  it('weights compliance by equipment rather than averaging sites', () => {
    // 200 assets at 50% and 2 assets at 100%: the honest figure is ~50%,
    // not the 75% an unweighted mean of the two sites would report.
    const tree = [node('plant', 200, 50), node('depot', 2, 100)];

    expect(summariseFacilityTree(tree).complianceRate).toBe(50);
  });

  it('excludes unrated nodes from both sides of the ratio', () => {
    // The unrated site must not count as 0% and drag the estate down.
    const tree = [node('rated', 10, 80), node('unrated', 90, null)];

    expect(summariseFacilityTree(tree).complianceRate).toBe(80);
  });

  it('reports no rate when nothing is rated', () => {
    expect(summariseFacilityTree([node('a', 5, null)]).complianceRate).toBeNull();
  });

  it('ignores a rated node holding no equipment', () => {
    // A rate over zero assets carries no weight and would divide by nothing.
    const tree = [node('empty', 0, 100), node('real', 10, 40)];

    expect(summariseFacilityTree(tree).complianceRate).toBe(40);
  });

  it('summarises an empty tree without inventing figures', () => {
    expect(summariseFacilityTree([])).toEqual({ sites: 0, equipment: 0, complianceRate: null });
  });
});
