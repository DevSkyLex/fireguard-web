import type { ComplianceTreeNodeOutput } from '@features/organization/features/facilities/models';
import { flattenComplianceTree } from '../facility-tree-flatten.utils';

function node(overrides: Partial<ComplianceTreeNodeOutput> = {}): ComplianceTreeNodeOutput {
  return {
    '@id': '/api/facilities/facility-1',
    '@type': 'Facility',
    id: 'facility-1',
    name: 'HQ',
    type: 'site',
    parentFacilityId: null,
    equipmentCount: 4,
    status: 'active',
    complianceRate: 92,
    children: [],
    ...overrides,
  };
}

describe('flattenComplianceTree', () => {
  it('returns an empty map for an empty tree', () => {
    expect(flattenComplianceTree([]).size).toBe(0);
  });

  it('maps a single root node by its facility id', () => {
    const rates = flattenComplianceTree([node()]);

    expect(rates.get('facility-1')).toBe(92);
    expect(rates.size).toBe(1);
  });

  it('recurses into every level of children', () => {
    const tree = node({
      id: 'root',
      complianceRate: 80,
      children: [
        node({
          id: 'child-1',
          complianceRate: 40,
          children: [node({ id: 'grandchild-1', complianceRate: 10, children: [] })],
        }),
        node({ id: 'child-2', complianceRate: null, children: [] }),
      ],
    });

    const rates = flattenComplianceTree([tree]);

    expect(rates.get('root')).toBe(80);
    expect(rates.get('child-1')).toBe(40);
    expect(rates.get('grandchild-1')).toBe(10);
    expect(rates.get('child-2')).toBeNull();
    expect(rates.size).toBe(4);
  });

  it('keeps a null compliance rate distinct from an absent entry', () => {
    const rates = flattenComplianceTree([node({ complianceRate: null })]);

    expect(rates.has('facility-1')).toBe(true);
    expect(rates.get('facility-1')).toBeNull();
    expect(rates.get('unknown-facility')).toBeUndefined();
  });
});
