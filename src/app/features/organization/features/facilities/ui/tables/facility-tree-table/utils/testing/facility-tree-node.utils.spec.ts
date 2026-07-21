import type { FacilityTreeNode } from '@features/organization/features/facilities/models';
import { countTreeNodes, toTreeNodes } from '../facility-tree-node.utils';

const node = (id: string, children: readonly FacilityTreeNode[] = []): FacilityTreeNode => ({
  id,
  name: id,
  type: 'site',
  parentFacilityId: null,
  equipmentCount: 0,
  status: 'active',
  complianceRate: null,
  children,
});

describe('toTreeNodes', () => {
  it('maps the hierarchy onto PrimeNG nodes keyed by facility id', () => {
    const [root] = toTreeNodes([node('a', [node('b')])]);

    expect(root?.key).toBe('a');
    expect(root?.data?.id).toBe('a');
    expect(root?.children?.[0]?.key).toBe('b');
  });

  // Roots open so a site's buildings are visible on arrival; anything deeper
  // stays shut so a large estate does not unfold into hundreds of rows.
  it('expands roots and nothing deeper', () => {
    const [root] = toTreeNodes([node('a', [node('b', [node('c')])])]);

    expect(root?.expanded).toBe(true);
    expect(root?.children?.[0]?.expanded).toBe(false);
  });

  // PrimeNG draws a toggler for any node it does not know is a leaf; without
  // this a childless facility gets a chevron that expands to nothing.
  it('marks childless nodes as leaves', () => {
    const [root] = toTreeNodes([node('a', [node('b')])]);

    expect(root?.leaf).toBe(false);
    expect(root?.children?.[0]?.leaf).toBe(true);
  });

  // What survives a filter is already the answer. A match three levels down
  // that arrives collapsed reads as no match at all — the search looks broken.
  it('expands every level when asked to', () => {
    const [root] = toTreeNodes([node('a', [node('b', [node('c')])])], true);

    expect(root?.expanded).toBe(true);
    expect(root?.children?.[0]?.expanded).toBe(true);
    expect(root?.children?.[0]?.children?.[0]?.expanded).toBe(true);
  });

  it('returns nothing for an empty hierarchy', () => {
    expect(toTreeNodes([])).toEqual([]);
  });
});

describe('countTreeNodes', () => {
  it('counts every facility at every depth, not just roots', () => {
    expect(countTreeNodes([node('a', [node('b', [node('c')])]), node('d')])).toBe(4);
  });

  it('counts an empty hierarchy as zero', () => {
    expect(countTreeNodes([])).toBe(0);
  });
});
