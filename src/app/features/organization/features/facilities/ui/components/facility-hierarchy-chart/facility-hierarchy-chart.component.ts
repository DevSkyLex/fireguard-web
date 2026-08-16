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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2 } from '@ng-icons/lucide';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityToTreeNode } from '@features/organization/features/facilities/utils';
import { Tree, type TreeNode } from '@shared/tree';
import { FacilityStatusTag } from '../facility-status-tag';

/**
 * Component FacilityHierarchyChart
 * @class FacilityHierarchyChart
 *
 * @description
 * Renders a facility and, beneath it, every descendant already resolved
 * into {@link childrenByParent} — the whole subtree loads at once
 * (`FacilityStore.ensureFacilityDescendantsLoaded`), so this component never
 * fetches — over the shared `shared/tree` primitive. Expansion is purely
 * local (every branch is already present), so `Tree`'s `expandRequested` is
 * a no-op and `loadingIds`/`failedIds` stay empty. Each row projects the
 * facility's icon, name and {@link FacilityStatusTag} through `Tree`'s
 * `nodeTemplate`; selecting a row asks the page to navigate rather than
 * navigating itself, keeping this component presentational
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-hierarchy-chart',
  imports: [NgIcon, Tree, FacilityStatusTag],
  providers: [provideIcons({ lucideBuilding2 })],
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

  /** No branch is ever loading — the whole subtree is fetched up front. */
  protected readonly emptyIds: ReadonlySet<string> = new Set<string>();
  //#endregion

  //#region Methods
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
