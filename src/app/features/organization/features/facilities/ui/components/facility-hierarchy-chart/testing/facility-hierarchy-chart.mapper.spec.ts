import type { TreeNode } from 'primeng/api';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  toFacilityTreeNode,
  toFacilityTreeNodes,
  type FacilityHierarchyContext,
} from '../facility-hierarchy-chart.mapper';
import type { FacilityHierarchyNodeData } from '../models';

const facility = (overrides: Partial<FacilityOutput>): FacilityOutput =>
  ({
    id: 'fac-1',
    name: 'Facility 1',
    type: 'site',
    status: 'active',
    code: null,
    hasChildren: false,
    parentFacilityId: null,
    ...overrides,
  }) as unknown as FacilityOutput;

const emptyContext = (
  overrides: Partial<FacilityHierarchyContext> = {},
): FacilityHierarchyContext => ({
  childrenByParent: {},
  loadedParentIds: [],
  loadingParentIds: [],
  expandedIds: [],
  ...overrides,
});

describe('facility-hierarchy-chart.mapper', () => {
  it('should return an empty tree when there is no root', () => {
    expect(toFacilityTreeNodes(null, emptyContext())).toEqual([]);
  });

  it('should map a leaf facility without children', () => {
    const root = facility({ hasChildren: false });

    const nodes = toFacilityTreeNodes(root, emptyContext());

    expect(nodes).toHaveLength(1);
    expect(nodes[0].key).toBe('fac-1');
    expect(nodes[0].expanded).toBe(true);
    expect(nodes[0].children).toBeUndefined();
    expect(nodes[0].data?.facility).toBe(root);
  });

  it('should add a placeholder child when children are not loaded yet', () => {
    const root = facility({ hasChildren: true });

    const node = toFacilityTreeNode(root, emptyContext(), true);

    expect(node.children).toHaveLength(1);
    expect(node.children?.[0].data?.placeholder).toBe(true);
    expect(node.children?.[0].key).toBe('fac-1::placeholder');
  });

  it('should map loaded children recursively', () => {
    const root = facility({ id: 'root', hasChildren: true });
    const child = facility({ id: 'child', hasChildren: false, name: 'Child' });

    const node = toFacilityTreeNode(
      root,
      emptyContext({
        loadedParentIds: ['root'],
        childrenByParent: { root: [child] },
      }),
      true,
    );

    expect(node.children).toHaveLength(1);
    const childNode: TreeNode<FacilityHierarchyNodeData> | undefined = node.children?.[0];
    expect(childNode?.key).toBe('child');
    expect(childNode?.data?.placeholder).toBe(false);
    expect(childNode?.data?.facility).toBe(child);
  });

  it('should mark non-root nodes as expanded only when present in expandedIds', () => {
    const root = facility({ id: 'root', hasChildren: true });
    const child = facility({ id: 'child', hasChildren: true, name: 'Child' });

    const collapsed = toFacilityTreeNode(
      root,
      emptyContext({ loadedParentIds: ['root'], childrenByParent: { root: [child] } }),
      true,
    );
    expect(collapsed.children?.[0].expanded).toBe(false);

    const expanded = toFacilityTreeNode(
      root,
      emptyContext({
        loadedParentIds: ['root'],
        childrenByParent: { root: [child] },
        expandedIds: ['child'],
      }),
      true,
    );
    expect(expanded.children?.[0].expanded).toBe(true);
  });

  it('should flag a node as loading while its children are being fetched', () => {
    const root = facility({ id: 'root', hasChildren: true });

    const node = toFacilityTreeNode(root, emptyContext({ loadingParentIds: ['root'] }), true);

    expect(node.data?.loading).toBe(true);
  });
});
