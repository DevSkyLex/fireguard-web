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
import { FacilityStatusTag } from '../facility-status-tag';

/**
 * Component FacilityHierarchyChart
 * @class FacilityHierarchyChart
 *
 * @description
 * Renders one facility and, recursively, every descendant already resolved
 * into {@link childrenByParent} — the whole subtree loads at once
 * (`FacilityStore.ensureFacilityDescendantsLoaded`), so this component never
 * fetches and never lazily expands a branch (`FEATURE.md` "Facility
 * Hierarchy (Detail Overview)").
 *
 * Hand-rolled: the catalog has no tree or org-chart primitive (checked
 * `@spartan-ng/brain` and `src/app/shared/ui`), and a full WAI-ARIA
 * `treeitem` widget needs roving-tabindex arrow-key navigation this feature
 * does not ask for — adding the role without that behaviour would be a false
 * accessibility promise. Each node is instead a plain, fully keyboard-usable
 * button; selecting one asks the page to navigate rather than navigating
 * itself, keeping this component presentational (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-hierarchy-chart',
  imports: [NgIcon, FacilityStatusTag, FacilityHierarchyChart],
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
   * @description The node this level of the chart renders.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();

  /**
   * Property childrenByParent
   * @readonly
   * @description The whole resolved subtree, grouped by parent id, shared unchanged down every recursion level.
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
   * @description A node was activated — this level's own facility, or one bubbled up from a descendant.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly selected: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /**
   * Property children
   * @readonly
   * @description This node's direct children, resolved from the shared subtree map.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<FacilityOutput>>}
   */
  protected readonly children: Signal<ReadonlyArray<FacilityOutput>> = computed<
    ReadonlyArray<FacilityOutput>
  >(() => this.childrenByParent()[this.facility().id] ?? []);

  /**
   * Property isActive
   * @readonly
   * @description Whether this node is the facility the record currently shows.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isActive: Signal<boolean> = computed<boolean>(
    () => this.facility().id === this.activeFacilityId(),
  );
  //#endregion

  //#region Methods
  /**
   * Method onChildSelected
   * @description Forwards a descendant's selection up unchanged, so only the page at the top ever navigates.
   * @access protected
   * @since 1.0.0
   * @param {FacilityOutput} facility - The selected descendant.
   * @returns {void}
   */
  protected onChildSelected(facility: FacilityOutput): void {
    this.selected.emit(facility);
  }
  //#endregion
}
