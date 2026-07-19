import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FacilityService } from '@features/organization/features/facilities';
import type { FacilityOutput } from '@features/organization/features/facilities';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState, MapCanvas, type MapMarker } from '@shared/components';

/**
 * Component OrganizationMapPage
 * @class OrganizationMapPage
 *
 * @description
 * Every geolocated facility on one map.
 *
 * Owned by the organization parent, not the facilities subfeature: a route
 * outside `facilities/` would fall out of that feature's route tree and break
 * the URL-to-ownership correspondence the nested feature exists to keep. It
 * reads facilities through the feature's public API rather than reaching into
 * its store.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-map',
  imports: [MapCanvas, EmptyState],
  host: { class: 'flex min-h-0 flex-1' },
  templateUrl: './organization-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMapPage {
  //#region Properties
  /**
   * Property facilityService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FacilityService}
   */
  private readonly facilityService: FacilityService = inject<FacilityService>(FacilityService);

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
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property facilities
   *
   * @description
   * Every facility, loaded once. Held raw so the marker mapping and the
   * "nothing to place" check both read the same source.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly FacilityOutput[]>}
   */
  private readonly facilities: WritableSignal<readonly FacilityOutput[]> = signal<
    readonly FacilityOutput[]
  >([]);

  /**
   * Property markers
   * @readonly
   *
   * @description
   * Only facilities with both coordinates. One without is not an error — it
   * simply has no address on file — so it is dropped from the map, not flagged.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MapMarker[]>}
   */
  protected readonly markers: Signal<readonly MapMarker[]> = computed((): readonly MapMarker[] =>
    this.facilities()
      .filter(
        (facility: FacilityOutput): boolean =>
          typeof facility.latitude === 'number' && typeof facility.longitude === 'number',
      )
      .map(
        (facility: FacilityOutput): MapMarker => ({
          id: facility.id,
          latitude: facility.latitude as number,
          longitude: facility.longitude as number,
          title: facility.name,
          subtitle: facility.type,
        }),
      ),
  );

  /**
   * Property hasLoaded
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly hasLoaded: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isEmpty
   * @readonly
   *
   * @description
   * True once loaded with nothing to place — distinct from "still loading".
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed(
    (): boolean => this.hasLoaded() && this.markers().length === 0,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads every facility for the active organization.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | undefined =
        this.activeOrganizationStore.selectedOrganization()?.id;
      if (organizationId === undefined) return;

      untracked((): void => {
        this.hasLoaded.set(false);
        this.facilityService.listAll(organizationId).subscribe({
          next: (facilities: readonly FacilityOutput[]) => {
            this.facilities.set(facilities);
            this.hasLoaded.set(true);
          },
          error: () => this.hasLoaded.set(true),
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method openFacility
   *
   * @description
   * Opens the facility a marker stands for.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MapMarker} marker - The selected marker.
   *
   * @returns {void}
   */
  protected openFacility(marker: MapMarker): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId === undefined) return;

    void this.router.navigate(['/organizations', organizationId, 'facilities', marker.id]);
  }
  //#endregion
}
