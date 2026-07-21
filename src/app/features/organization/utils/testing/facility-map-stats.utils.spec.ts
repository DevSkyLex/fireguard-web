import type { FacilityTreeNode } from '@features/organization/features/facilities/models';
import { buildFacilityMapStats } from '../facility-map-stats.utils';

const node = (overrides: Partial<FacilityTreeNode>): FacilityTreeNode => ({
  id: 'n1',
  name: 'Node',
  type: 'site',
  parentFacilityId: null,
  equipmentCount: 0,
  status: 'active',
  complianceRate: null,
  children: [],
  ...overrides,
});

describe('buildFacilityMapStats', () => {
  it('carries each node’s own compliance rate', () => {
    const tree: readonly FacilityTreeNode[] = [node({ id: 'site-1', complianceRate: 92 })];

    const stats = buildFacilityMapStats(tree);

    expect(stats.get('site-1')?.complianceRate).toBe(92);
  });

  it('counts descendant buildings at every depth, not just direct children', () => {
    const tree: readonly FacilityTreeNode[] = [
      node({
        id: 'site-1',
        children: [
          node({
            id: 'building-1',
            type: 'building',
            children: [node({ id: 'floor-1', type: 'floor' })],
          }),
          node({
            id: 'building-2',
            type: 'building',
            children: [
              node({
                id: 'floor-2',
                type: 'floor',
                children: [node({ id: 'building-3', type: 'building' })],
              }),
            ],
          }),
        ],
      }),
    ];

    const stats = buildFacilityMapStats(tree);

    // building-1 and building-2 are direct children, building-3 is nested
    // three levels down under building-2 — all three must count.
    expect(stats.get('site-1')?.buildingsCount).toBe(3);
  });

  it('indexes every node in the tree, not just roots', () => {
    const tree: readonly FacilityTreeNode[] = [
      node({ id: 'site-1', children: [node({ id: 'building-1', type: 'building' })] }),
    ];

    const stats = buildFacilityMapStats(tree);

    expect(stats.has('building-1')).toBe(true);
    expect(stats.get('building-1')?.buildingsCount).toBe(0);
  });
});
