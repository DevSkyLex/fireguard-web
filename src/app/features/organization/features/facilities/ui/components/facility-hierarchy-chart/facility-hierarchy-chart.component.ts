import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { TreeNode } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { toFacilityTreeNodes } from './facility-hierarchy-chart.mapper';
import type { FacilityHierarchyNodeData } from './models';

/**
 * Component FacilityHierarchyChart
 * @class FacilityHierarchyChart
 *
 * @description
 * Presentational organization chart that renders a facility and its descendants
 * using PrimeNG's OrganizationChart. Descendants are loaded lazily: each node
 * flagged with children renders an expand toggle, and expanding it emits
 * {@link expandRequest} so the host can fetch the next level. The component owns
 * no data fetching — it derives its tree from the inputs and tracks which nodes
 * the user expanded so the open state survives rebuilds.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-hierarchy-chart',
  imports: [OrganizationChartModule, AvatarModule, TagModule, SkeletonModule],
  templateUrl: './facility-hierarchy-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityHierarchyChart {
  //#region Inputs
  /**
   * Property root
   * @readonly
   *
   * @description
   * Root facility displayed at the top of the chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput | null>}
   */
  public readonly root: InputSignal<FacilityOutput | null> = input<FacilityOutput | null>(null);

  /**
   * Property childrenByParent
   * @readonly
   *
   * @description
   * Map of parent facility id to its already-loaded direct children.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, readonly FacilityOutput[]>>>}
   */
  public readonly childrenByParent: InputSignal<
    Readonly<Record<string, readonly FacilityOutput[]>>
  > = input<Readonly<Record<string, readonly FacilityOutput[]>>>({});

  /**
   * Property loadedParentIds
   * @readonly
   *
   * @description
   * Ids of parents whose children have already been fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly loadedParentIds: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property loadingParentIds
   * @readonly
   *
   * @description
   * Ids of parents whose children are currently being fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly loadingParentIds: InputSignal<readonly string[]> = input<readonly string[]>([]);
  //#endregion

  //#region Outputs
  /**
   * Property expandRequest
   * @readonly
   *
   * @description
   * Emits the id of a facility whose children should be loaded when its node is
   * expanded for the first time.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly expandRequest: OutputEmitterRef<string> = output<string>();

  /**
   * Property navigate
   * @readonly
   *
   * @description
   * Emits the facility the user chose to navigate to from a chart node.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly navigate: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region State
  /**
   * Property expandedIds
   *
   * @description
   * Ids of nodes the user has expanded. Tracked locally so the open state is
   * preserved when the tree is rebuilt after a lazy load.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly expandedIds: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Tree consumed by the organization chart, derived from the root facility and
   * the current hierarchy state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TreeNode<FacilityHierarchyNodeData>[]>}
   */
  protected readonly nodes: Signal<TreeNode<FacilityHierarchyNodeData>[]> = computed<
    TreeNode<FacilityHierarchyNodeData>[]
  >(() =>
    toFacilityTreeNodes(this.root(), {
      childrenByParent: this.childrenByParent(),
      loadedParentIds: this.loadedParentIds(),
      loadingParentIds: this.loadingParentIds(),
      expandedIds: this.expandedIds(),
    }),
  );

  /**
   * Property facilityTypeIcons
   * @readonly
   *
   * @description
   * Maps facility types to PrimeNG icon classes used in node avatars and tags.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<string, string>}
   */
  protected readonly facilityTypeIcons: Record<string, string> = {
    site: 'pi pi-globe',
    building: 'pi pi-building',
    floor: 'pi pi-th-large',
    zone: 'pi pi-map',
    area: 'pi pi-map-marker',
  };
  //#endregion

  //#region Methods
  /**
   * Method onNodeExpand
   * @method onNodeExpand
   *
   * @description
   * Records the expanded node and requests its children when it represents a
   * facility. Placeholder nodes are ignored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{ node: TreeNode<FacilityHierarchyNodeData> }} event - PrimeNG expand event.
   *
   * @returns {void}
   */
  protected onNodeExpand(event: { node: TreeNode<FacilityHierarchyNodeData> }): void {
    const facility: FacilityOutput | null | undefined = event.node.data?.facility;
    if (!facility) {
      return;
    }

    this.expandedIds.update((ids) => [...new Set([...ids, facility.id])]);
    this.expandRequest.emit(facility.id);
  }

  /**
   * Method onNodeCollapse
   * @method onNodeCollapse
   *
   * @description
   * Removes the collapsed node from the expanded set so the tree rebuilds with
   * the branch closed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{ node: TreeNode<FacilityHierarchyNodeData> }} event - PrimeNG collapse event.
   *
   * @returns {void}
   */
  protected onNodeCollapse(event: { node: TreeNode<FacilityHierarchyNodeData> }): void {
    const facility: FacilityOutput | null | undefined = event.node.data?.facility;
    if (!facility) {
      return;
    }

    this.expandedIds.update((ids) => ids.filter((id) => id !== facility.id));
  }

  /**
   * Method onNavigate
   * @method onNavigate
   *
   * @description
   * Emits a navigation request for the given facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - Facility to navigate to.
   *
   * @returns {void}
   */
  protected onNavigate(facility: FacilityOutput): void {
    this.navigate.emit(facility);
  }
  //#endregion
}
