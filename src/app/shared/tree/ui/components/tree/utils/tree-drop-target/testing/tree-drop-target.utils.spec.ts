import type { TreeNode } from '../../../../../../models/tree-node.interface';
import { isDescendantOf } from '../tree-drop-target.utils';

const node = (id: string, hasChildren = false): TreeNode<null> => ({
  id,
  label: id,
  hasChildren,
  data: null,
});

describe('isDescendantOf', () => {
  it('should return false when the branch has never been loaded', () => {
    expect(isDescendantOf('a', 'a1', {})).toBe(false);
  });

  it('should return true for a direct child', () => {
    const childrenByParent = { a: [node('a1')] };

    expect(isDescendantOf('a', 'a1', childrenByParent)).toBe(true);
  });

  it('should return true for a grandchild', () => {
    const childrenByParent = { a: [node('a1', true)], a1: [node('a1a')] };

    expect(isDescendantOf('a', 'a1a', childrenByParent)).toBe(true);
  });

  it('should return false for a sibling or an unrelated node', () => {
    const childrenByParent = { a: [node('a1')], b: [node('b1')] };

    expect(isDescendantOf('a', 'b1', childrenByParent)).toBe(false);
    expect(isDescendantOf('a', 'b', childrenByParent)).toBe(false);
  });

  it('should return false for the node itself', () => {
    expect(isDescendantOf('a', 'a', {})).toBe(false);
  });
});
