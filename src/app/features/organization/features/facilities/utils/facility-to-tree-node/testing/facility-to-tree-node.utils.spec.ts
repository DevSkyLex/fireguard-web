import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityToTreeNode } from '../facility-to-tree-node.utils';

describe('facilityToTreeNode', () => {
  it('maps id, name, and hasChildren onto the tree node shape', () => {
    const facility = {
      id: 'facility-1',
      name: 'HQ',
      hasChildren: true,
    } as unknown as FacilityOutput;

    expect(facilityToTreeNode(facility)).toEqual({
      id: 'facility-1',
      label: 'HQ',
      hasChildren: true,
      data: facility,
    });
  });

  it('carries hasChildren: false through for a leaf facility', () => {
    const facility = {
      id: 'facility-2',
      name: 'Floor 3',
      hasChildren: false,
    } as unknown as FacilityOutput;

    expect(facilityToTreeNode(facility).hasChildren).toBe(false);
  });
});
