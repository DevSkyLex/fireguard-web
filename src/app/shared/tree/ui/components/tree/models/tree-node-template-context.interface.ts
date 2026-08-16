import type { TreeNode } from '../../../../models/tree-node.interface';

/**
 * Interface TreeNodeTemplateContext
 * @interface TreeNodeTemplateContext
 *
 * @description
 * The context an `<ng-template>` passed to `Tree`'s `nodeTemplate` input
 * receives — `$implicit` for `let-node` and the same value again under
 * `node` for a self-documenting template.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TreeNodeTemplateContext<T> {
  //#region Properties
  /** The node being rendered, available as `let-node`. */
  readonly $implicit: TreeNode<T>;

  /** The same node, named, for a self-documenting template. */
  readonly node: TreeNode<T>;
  //#endregion
}
