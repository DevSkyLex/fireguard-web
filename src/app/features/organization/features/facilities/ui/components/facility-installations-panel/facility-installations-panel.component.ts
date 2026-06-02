import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
import { FacilityStore } from '@features/organization/features/facilities/state';

/**
 * Component FacilityInstallationsPanel
 * @class FacilityInstallationsPanel
 *
 * @description
 * Presentational sidebar panel rendering a compact two-level installation
 * tree (root facility, direct children and grandchildren) for the detail
 * overview tab. Child rows are clickable and emit a navigation intent.
 *
 * The descendant data is sourced from {@link FacilityStore}, which is
 * populated browser-side by the page once the facility resolves.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-installations-panel',
  templateUrl: './facility-installations-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInstallationsPanel {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   *
   * @description
   * The root facility whose installation tree is displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();
  //#endregion

  //#region Outputs
  /**
   * Property navigate
   * @readonly
   *
   * @description
   * Emitted with the target facility when a descendant row is selected.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly navigate: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped facility store providing the descendant index.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  private readonly store: FacilityStore = inject<FacilityStore>(FacilityStore);

  /**
   * Property facilityTypeIcons
   * @readonly
   *
   * @description
   * Maps facility types to PrimeNG icon classes for tree rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<FacilityType, string>}
   */
  protected readonly facilityTypeIcons: Record<FacilityType, string> = {
    site: 'pi pi-globe',
    building: 'pi pi-building',
    floor: 'pi pi-th-large',
    zone: 'pi pi-map',
    area: 'pi pi-map-marker',
  };

  /**
   * Property installationCount
   * @readonly
   *
   * @description
   * Total number of unique facilities in the loaded installation tree,
   * including the root.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly installationCount: Signal<number> = computed<number>(() => {
    const seenIds: Set<string> = new Set<string>([this.facility().id]);
    for (const children of Object.values(this.store.childFacilitiesByParent())) {
      for (const child of children) {
        seenIds.add(child.id);
      }
    }
    return seenIds.size;
  });

  /**
   * Property directChildren
   * @readonly
   *
   * @description
   * Direct children of the root facility, sorted alphabetically.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<FacilityOutput>>}
   */
  protected readonly directChildren: Signal<ReadonlyArray<FacilityOutput>> = computed<
    ReadonlyArray<FacilityOutput>
  >(() => this.childrenOf(this.facility().id));
  //#endregion

  //#region Methods
  /**
   * Returns the sorted direct children of a facility from the store index.
   *
   * @param {string} facilityId - Parent facility identifier.
   * @returns {ReadonlyArray<FacilityOutput>} Sorted child facilities.
   */
  protected childrenOf(facilityId: string): ReadonlyArray<FacilityOutput> {
    return (this.store.childFacilitiesByParent()[facilityId] ?? []).toSorted((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  /**
   * Returns the Tailwind background token for the facility status dot.
   *
   * @param {FacilityOutput['status']} status - Facility lifecycle status.
   * @returns {string} Tailwind background color class.
   */
  protected getStatusDotClass(status: FacilityOutput['status']): string {
    return status === 'active' ? 'bg-green-500' : 'bg-orange-500';
  }
  //#endregion
}
