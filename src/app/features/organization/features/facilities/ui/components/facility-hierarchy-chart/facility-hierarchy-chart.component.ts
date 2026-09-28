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
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import {
  facilityToTreeNode,
  facilityTypeLabel,
} from '@features/organization/features/facilities/utils';
import { Tree, type TreeNode } from '@shared/tree';
import { FacilityStatusTag } from '../facility-status-tag';

/**
 * Component FacilityHierarchyChart
 * @class FacilityHierarchyChart
 *
 * @description
 * Renders a facility and, beneath it, every descendant already resolved
 * into {@link childrenByParent} over the shared `shared/tree` primitive.
 * Expansion is purely local (every branch already present is rendered at
 * once), so `Tree`'s `expandRequested` is a no-op and `failedIds` stays
 * empty; {@link loadingIds}, fed from the page's own
 * `FacilityStore.loadingParentIds`, lets a branch still being fetched
 * (`FacilityStore.ensureFacilityDescendantsLoaded`) draw its own per-node
 * loading state. Each row projects the facility's name, type and — only for
 * an archived facility — {@link FacilityStatusTag} through `Tree`'s
 * `nodeTemplate`; an active status is the overwhelming common case in a
 * tree and repeating it on every row is noise, not information. Selecting a
 * row asks the page to navigate rather than navigating itself, keeping this
 * component presentational (`ARCHITECTURE.md` §10.3).
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-hierarchy-chart',
  imports: [Tree, FacilityStatusTag],
  templateUrl: './facility-hierarchy-chart.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityHierarchyChart {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   * @description The root this chart renders.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();

  /**
   * Property childrenByParent
   * @readonly
   * @description The whole resolved subtree, grouped by parent id.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Readonly<Record<string, ReadonlyArray<FacilityOutput>>>>}
   */
  public readonly childrenByParent: InputSignal<
    Readonly<Record<string, ReadonlyArray<FacilityOutput>>>
  > = input.required<Readonly<Record<string, ReadonlyArray<FacilityOutput>>>>();

  /**
   * Property activeFacilityId
   * @readonly
   * @description The facility the record currently shows, marked so the operator can see where they are in the tree.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly activeFacilityId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property loadingIds
   * @readonly
   * @description Facility ids whose descendants are currently being fetched — forwarded to `app-tree` so each node draws its own per-branch loading state. Defaults to none, since a caller that never lazily loads (the common case, since {@link childrenByParent} is usually resolved up front) has nothing to report.
   * @access public
   * @since 2.1.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly loadingIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );
  //#endregion

  //#region Outputs
  /**
   * Property selected
   * @readonly
   * @description A node was activated.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly selected: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /** The chart's single root, mapped onto `Tree`'s generic node shape. */
  protected readonly nodes: Signal<readonly TreeNode<FacilityOutput>[]> = computed(() => [
    facilityToTreeNode(this.facility()),
  ]);

  /** The already-loaded subtree, mapped onto `Tree`'s generic node shape. */
  protected readonly treeChildrenByParent: Signal<
    Readonly<Record<string, readonly TreeNode<FacilityOutput>[]>>
  > = computed(() => {
    const result: Record<string, readonly TreeNode<FacilityOutput>[]> = {};
    const entries: ReadonlyArray<[string, ReadonlyArray<FacilityOutput>]> = Object.entries(
      this.childrenByParent(),
    );
    for (const [parentId, children] of entries) {
      result[parentId] = children.map(facilityToTreeNode);
    }
    return result;
  });

  /** No branch ever fails to lazily expand — this chart never lazily loads a failed branch. */
  protected readonly emptyIds: ReadonlySet<string> = new Set<string>();
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   * @description A node's type, humanized through the shared type catalog.
   * @access protected
   * @since 2.1.0
   * @param {FacilityType} type - The node's raw type.
   * @returns {string} The localized label, or a localized "Unknown type" fallback.
   */
  protected typeLabelOf(type: FacilityType): string {
    return facilityTypeLabel(type);
  }

  /**
   * Method isArchived
   * @description Whether a node's facility is archived — the only status this chart marks, since active is the overwhelming common case.
   * @access protected
   * @since 2.2.0
   * @param {TreeNode<FacilityOutput>['data']} data - The node's facility.
   * @returns {boolean} `true` for an archived facility.
   */
  protected isArchived(data: FacilityOutput): boolean {
    return data.status === 'archived';
  }

  /**
   * Method onNodeSelected
   * @description Unwraps the tree node's facility and forwards it as selected.
   * @access protected
   * @since 1.0.0
   * @param {TreeNode<FacilityOutput>} node - The selected tree node.
   * @returns {void}
   */
  protected onNodeSelected(node: TreeNode<FacilityOutput>): void {
    this.selected.emit(node.data);
  }

  /**
   * Method onExpandRequested
   * @description No-op: {@link childrenByParent} already holds the whole subtree, so `Tree` never actually needs to fetch a branch.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onExpandRequested(): void {}
  //#endregion
}
