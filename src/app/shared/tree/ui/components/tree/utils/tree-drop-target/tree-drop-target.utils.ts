import type { TreeNode } from '../../../../../models/tree-node.interface';

/**
 * Function isDescendantOf
 *
 * @description
 * Whether `nodeId` sits somewhere under `ancestorId` in the currently
 * **loaded** part of the tree. Only `childrenByParent` is consulted — a
 * branch that has never been expanded cannot be proven to contain `nodeId`,
 * so it is treated as not containing it. That is the drag-drop primitive's
 * client-side guard against dropping a node onto its own descendant; the
 * consumer still owns the authoritative check server-side.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} ancestorId - The candidate ancestor's id.
 * @param {string} nodeId - The id being searched for.
 * @param {Readonly<Record<string, readonly TreeNode<T>[]>>} childrenByParent - Loaded children, keyed by parent id.
 *
 * @returns {boolean} Whether `nodeId` is a loaded descendant of `ancestorId`.
 */
export function isDescendantOf<T>(
  ancestorId: string,
  nodeId: string,
  childrenByParent: Readonly<Record<string, readonly TreeNode<T>[]>>,
): boolean {
  const children: readonly TreeNode<T>[] = childrenByParent[ancestorId] ?? [];

  for (const child of children) {
    if (child.id === nodeId || isDescendantOf(child.id, nodeId, childrenByParent)) {
      return true;
    }
  }

  return false;
}
