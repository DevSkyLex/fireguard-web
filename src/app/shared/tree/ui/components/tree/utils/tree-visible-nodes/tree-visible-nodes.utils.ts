import type { TreeNode } from '../../../../../models/tree-node.interface';

/**
 * Interface VisibleTreeNode
 * @interface VisibleTreeNode
 *
 * @description
 * One row of the flattened, currently-visible tree: the node itself, its
 * depth (1-based, for `aria-level`) and its parent's id (for `ArrowLeft`
 * moving focus up).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface VisibleTreeNode<T> {
  //#region Properties
  /** The node this row renders. */
  readonly node: TreeNode<T>;

  /** The node's depth, 1-based, mapped directly onto `aria-level`. */
  readonly level: number;

  /** The parent node's id, or `null` at the root. */
  readonly parentId: string | null;
  //#endregion
}

/**
 * Function buildVisibleTreeNodes
 *
 * @description
 * Flattens the roots and their loaded children into the ordered list of
 * rows the tree currently shows, expanding only the branches present in
 * `expandedIds`. A branch marked expanded whose children have not arrived
 * yet in `childrenByParent` simply contributes no rows of its own — the
 * component renders its loading or failed state from the node itself.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly TreeNode<T>[]} roots - The tree's top-level nodes.
 * @param {Readonly<Record<string, readonly TreeNode<T>[]>>} childrenByParent - Loaded children, keyed by parent id.
 * @param {ReadonlySet<string>} expandedIds - The ids currently expanded in the UI.
 *
 * @returns {readonly VisibleTreeNode<T>[]} The flattened, visible rows in display order.
 */
export function buildVisibleTreeNodes<T>(
  roots: readonly TreeNode<T>[],
  childrenByParent: Readonly<Record<string, readonly TreeNode<T>[]>>,
  expandedIds: ReadonlySet<string>,
): readonly VisibleTreeNode<T>[] {
  const rows: VisibleTreeNode<T>[] = [];

  const walk = (nodes: readonly TreeNode<T>[], level: number, parentId: string | null): void => {
    for (const node of nodes) {
      rows.push({ node, level, parentId });

      if (node.hasChildren && expandedIds.has(node.id)) {
        const children: readonly TreeNode<T>[] = childrenByParent[node.id] ?? [];
        walk(children, level + 1, node.id);
      }
    }
  };

  walk(roots, 1, null);

  return rows;
}
