import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { isCallPending } from '@core/request-state';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { MapFacilitiesStore, type MapFacilitiesStoreType } from '@features/organization/state';
import { EmptyState } from '@shared/components';
import {
  MapAddFacilityForm,
  type MapAddFacilityFormValues,
} from './components/map-add-facility-form';
import { MapFacilityCard } from './components/map-facility-card';

/**
 * Component MapFacilitiesPanel
 * @class MapFacilitiesPanel
 *
 * @description
 * The organization map's right-hand shell panel: browse, search and add
 * located facilities beside the map. Contributed to the dashboard shell's
 * panel slot by `withMapFacilitiesPanel()` rather than laid out as a page
 * column — it renders as a sibling of `OrganizationMapPage`, not a child, so
 * every piece of state it needs (the facility list, selection, search, the
 * add-form flow, the map's center) comes from the shared `MapFacilitiesStore`
 * rather than a parent input.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-map-facilities-panel',
  imports: [
    ButtonModule,
    FormsModule,
    InputTextModule,
    EmptyState,
    MapFacilityCard,
    MapAddFacilityForm,
  ],
  host: { class: 'flex h-full min-h-0 flex-1 flex-col' },
  templateUrl: './map-facilities-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFacilitiesPanel {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Shared map-facilities state — the same instance `OrganizationMapPage`
   * reads and writes, so a pin dragged on the map and a card selected here
   * stay in sync.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MapFacilitiesStoreType}
   */
  protected readonly store: MapFacilitiesStoreType =
    inject<MapFacilitiesStoreType>(MapFacilitiesStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property organizationContext
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);
  //#endregion

  //#region Properties (derived)
  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * True while the facility list request is in flight and nothing has ever
   * loaded, so the list shows placeholders instead of a silently blank panel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed((): boolean =>
    isCallPending(this.store.listCallState()),
  );

  /**
   * Property loadingPlaceholders
   * @readonly
   *
   * @description
   * Fixed-length array driving the number of skeleton rows shown while
   * `isLoading` is true.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly loadingPlaceholders: readonly number[] = [0, 1, 2];
  //#endregion

  //#region Methods
  /**
   * Method openFacility
   *
   * @description
   * Opens a facility's record. An explicit action from the panel, not a
   * side effect of selecting it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} facilityId - Identifier of the facility to open.
   *
   * @returns {void}
   */
  protected openFacility(facilityId: string): void {
    const organizationId: string | undefined = this.organizationContext.selectedOrganization()?.id;
    if (organizationId === undefined) return;

    void this.router.navigate(['/organizations', organizationId, 'facilities', facilityId]);
  }

  /**
   * Method submitAddFacility
   *
   * @description
   * Forwards the add-form's values to the store, which combines them with
   * the map's last-known center.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MapAddFacilityFormValues} values - The submitted name and city.
   *
   * @returns {void}
   */
  protected submitAddFacility(values: MapAddFacilityFormValues): void {
    this.store.submitAddFacility(values);
  }
  //#endregion
}
