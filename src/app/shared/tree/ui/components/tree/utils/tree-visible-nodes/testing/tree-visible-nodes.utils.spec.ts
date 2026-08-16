import type { TreeNode } from '../../../../../../models/tree-node.interface';
import { buildVisibleTreeNodes } from '../tree-visible-nodes.utils';

const node = (id: string, hasChildren = false): TreeNode<null> => ({
  id,
  label: id,
  hasChildren,
  data: null,
});

describe('buildVisibleTreeNodes', () => {
  it('should return only the roots when nothing is expanded', () => {
    const roots = [node('a', true), node('b')];

    const rows = buildVisibleTreeNodes(roots, {}, new Set());

    expect(rows).toEqual([
      { node: roots[0], level: 1, parentId: null, setSize: 2, posInSet: 1 },
      { node: roots[1], level: 1, parentId: null, setSize: 2, posInSet: 2 },
    ]);
  });

  it('should splice in loaded children right after their expanded parent', () => {
    const roots = [node('a', true), node('b')];
    const childrenByParent = { a: [node('a1'), node('a2')] };

    const rows = buildVisibleTreeNodes(roots, childrenByParent, new Set(['a']));

    expect(rows.map((row) => row.node.id)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(rows[1]).toEqual({
      node: childrenByParent.a[0],
      level: 2,
      parentId: 'a',
      setSize: 2,
      posInSet: 1,
    });
  });

  it('should size each sibling group independently', () => {
    const roots = [node('a', true), node('b')];
    const childrenByParent = { a: [node('a1'), node('a2'), node('a3')] };

    const rows = buildVisibleTreeNodes(roots, childrenByParent, new Set(['a']));

    expect(rows.map((row) => [row.node.id, row.setSize, row.posInSet])).toEqual([
      ['a', 2, 1],
      ['a1', 3, 1],
      ['a2', 3, 2],
      ['a3', 3, 3],
      ['b', 2, 2],
    ]);
  });

  it('should contribute no rows for an expanded branch with no loaded children yet', () => {
    const roots = [node('a', true)];

    const rows = buildVisibleTreeNodes(roots, {}, new Set(['a']));

    expect(rows.map((row) => row.node.id)).toEqual(['a']);
  });

  it('should recurse through nested expanded branches', () => {
    const roots = [node('a', true)];
    const childrenByParent = { a: [node('a1', true)], a1: [node('a1a')] };

    const rows = buildVisibleTreeNodes(roots, childrenByParent, new Set(['a', 'a1']));

    expect(rows.map((row) => [row.node.id, row.level, row.parentId])).toEqual([
      ['a', 1, null],
      ['a1', 2, 'a'],
      ['a1a', 3, 'a1'],
    ]);
  });

  it('should not descend into a branch that is not expanded, even when children are loaded', () => {
    const roots = [node('a', true)];
    const childrenByParent = { a: [node('a1')] };

    const rows = buildVisibleTreeNodes(roots, childrenByParent, new Set());

    expect(rows.map((row) => row.node.id)).toEqual(['a']);
  });
});
