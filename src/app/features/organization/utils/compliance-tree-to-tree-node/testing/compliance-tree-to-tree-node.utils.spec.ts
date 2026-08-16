import type { ComplianceFacilityTreeNodeOutput } from '@features/organization/models';
import { flattenComplianceTree } from '../compliance-tree-to-tree-node.utils';

const node = (
  overrides: Partial<ComplianceFacilityTreeNodeOutput> = {},
): ComplianceFacilityTreeNodeOutput => ({
  id: 'node-1',
  name: 'Headquarters',
  type: 'site',
  parentFacilityId: null,
  equipmentCount: 4,
  status: 'active',
  complianceRate: 95,
  children: [],
  ...overrides,
});

describe('flattenComplianceTree', () => {
  it('maps a leaf root onto a leaf TreeNode with no children entry', () => {
    const { roots, childrenByParent } = flattenComplianceTree([node()]);

    expect(roots).toEqual([
      { id: 'node-1', label: 'Headquarters', hasChildren: false, data: node() },
    ]);
    expect(childrenByParent).toEqual({});
  });

  it('populates childrenByParent for every branch, eagerly, to the leaves', () => {
    const grandchild = node({ id: 'node-3', name: 'Zone A', parentFacilityId: 'node-2' });
    const child = node({
      id: 'node-2',
      name: 'Floor 1',
      parentFacilityId: 'node-1',
      children: [grandchild],
    });
    const root = node({ children: [child] });

    const { roots, childrenByParent } = flattenComplianceTree([root]);

    expect(roots).toEqual([{ id: 'node-1', label: 'Headquarters', hasChildren: true, data: root }]);
    expect(childrenByParent['node-1']).toEqual([
      { id: 'node-2', label: 'Floor 1', hasChildren: true, data: child },
    ]);
    expect(childrenByParent['node-2']).toEqual([
      { id: 'node-3', label: 'Zone A', hasChildren: false, data: grandchild },
    ]);
    expect(childrenByParent['node-3']).toBeUndefined();
  });

  it('maps an empty tree onto no roots and no children entries', () => {
    expect(flattenComplianceTree([])).toEqual({ roots: [], childrenByParent: {} });
  });
});
