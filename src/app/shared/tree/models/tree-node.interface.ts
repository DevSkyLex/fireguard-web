/**
 * Interface TreeNode
 * @interface TreeNode
 *
 * @description
 * One row of the shared lazy tree, in the generic display shape the
 * component renders: a stable id, a label, whether it can be expanded, and
 * the caller's own record carried along untouched. Deliberately domain-free
 * (ARCHITECTURE.md §2.7) — a feature maps its own entities onto this before
 * handing them to `Tree`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TreeNode<T = unknown> {
  //#region Properties
  /** Stable identity, used for tracking, `childrenByParent` lookup and selection. */
  readonly id: string;

  /** The row's display label. */
  readonly label: string;

  /** Whether this node can be expanded — a leaf never renders a disclosure control. */
  readonly hasChildren: boolean;

  /** The caller's own record, passed through unchanged. */
  readonly data: T;
  //#endregion
}
