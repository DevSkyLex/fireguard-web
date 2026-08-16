import type { TreeNode } from './tree-node.interface';

/**
 * Interface TreeDropEvent
 * @interface TreeDropEvent
 *
 * @description
 * Payload emitted by `Tree`'s `nodeDropped` output when a pointer drag ends
 * on a valid target: the dragged node, the row it was dropped on, and the
 * relationship requested. `'inside'` is the only position — the primitive
 * re-parents, it never reorders siblings (there is no ordering to preserve).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TreeDropEvent<T = unknown> {
  //#region Properties
  /** The node that was dragged. */
  readonly dragged: TreeNode<T>;

  /** The node it was dropped onto. */
  readonly target: TreeNode<T>;

  /** The requested relationship — always `'inside'` (re-parent). */
  readonly position: 'inside';
  //#endregion
}
