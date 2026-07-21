import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import {
  resolveFacilityTag,
  type FacilityTreeNode,
} from '@features/organization/features/facilities/models';
import { EmptyState, ErrorState, Tag, type TagDescriptor } from '@shared/components';
import { countTreeNodes, toTreeNodes } from './utils/facility-tree-node.utils';

/**
 * Component FacilityTreeTable
 * @class FacilityTreeTable
 *
 * @description
 * The facility hierarchy as an expandable grid, one row per facility at any
 * depth, showing each node's equipment count and compliance rate.
 *
 * Presentational: it takes the already-nested API hierarchy and emits a
 * selection. It does not paginate — the endpoint behind it returns the whole
 * tree in one response, so there is no page cursor to own.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-facility-tree-table [nodes]="tree.nodes()" (view)="open($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-tree-table',
  imports: [TreeTableModule, EmptyState, ErrorState, Tag],
  templateUrl: './facility-tree-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityTreeTable {
  //#region Inputs
  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Root facilities, each nesting its own children.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityTreeNode[]>}
   */
  public readonly nodes: InputSignal<readonly FacilityTreeNode[]> = input<
    readonly FacilityTreeNode[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property expandAll
   * @readonly
   *
   * @description
   * Opens every level instead of only the roots. Set while the hierarchy is
   * filtered: a match three levels down that stays collapsed reads as no match
   * at all.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly expandAll: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasError
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property view
   * @readonly
   *
   * @description
   * Emits the facility whose row was activated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityTreeNode>}
   */
  public readonly view: OutputEmitterRef<FacilityTreeNode> = output<FacilityTreeNode>();

  /**
   * Property retry
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retry: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property treeNodes
   * @readonly
   *
   * @description
   * The hierarchy in PrimeNG's `TreeNode` shape.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TreeNode<FacilityTreeNode>[]>}
   */
  protected readonly treeNodes: Signal<TreeNode<FacilityTreeNode>[]> = computed(() =>
    toTreeNodes(this.nodes(), this.expandAll()),
  );

  /**
   * Property total
   * @readonly
   *
   * @description
   * Facilities at every depth, not just roots.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed((): number => countTreeNodes(this.nodes()));
  //#endregion

  //#region Methods
  /**
   * Method typeDescriptor
   *
   * @description
   * Presentation for a facility type, from the feature's tag registry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} type - The raw facility type.
   *
   * @returns {TagDescriptor} The descriptor to render.
   */
  protected typeDescriptor(type: string): TagDescriptor {
    return resolveFacilityTag('type', type);
  }

  /**
   * Method complianceLabel
   *
   * @description
   * Formats a compliance rate, or an em dash when the node tracks nothing yet —
   * "0%" and "nothing tracked" are different facts and must not look alike.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   *
   * @returns {string} The label to render.
   */
  protected complianceLabel(rate: number | null): string {
    return rate === null ? '—' : `${Math.round(rate)}%`;
  }

  /**
   * Method complianceClass
   *
   * @description
   * Colour band for a compliance rate. Paired with the numeric label, never the
   * only carrier of the verdict (PRODUCT.md).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number | null} rate - The compliance percentage.
   *
   * @returns {string} The text colour class.
   */
  /**
   * Method complianceBarClass
   *
   * @description
   * Fill colour for the compliance bar, on the same thresholds as the figure's
   * text colour so the two can never disagree.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {number} rate - The compliance percentage.
   *
   * @returns {string} The fill colour class.
   */
  protected complianceBarClass(rate: number): string {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-amber-500';

    return 'bg-red-500';
  }

  protected complianceClass(rate: number | null): string {
    if (rate === null) return 'text-surface-400 dark:text-surface-500';
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }
  //#endregion
}
