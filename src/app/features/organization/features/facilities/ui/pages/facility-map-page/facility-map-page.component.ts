import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMap, lucideNetwork } from '@ng-icons/lucide';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityMapStore } from '@features/organization/features/facilities/state';
import { facilityToMapMarker } from '@features/organization/features/facilities/utils';
import { EmptyState } from '@shared/empty-state';
import { Map, type MapMarker } from '@shared/map';
import { HlmButton } from '@shared/ui/button';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Component FacilityMapPage
 * @class FacilityMapPage
 *
 * @description
 * Route entry page for the organization's facility map
 * (`/organizations/:organizationId/facilities/map`): every facility with
 * both coordinates set, rendered through the domain-agnostic `@shared/map`
 * primitive. Selecting a marker navigates to that facility's record.
 *
 * A discreet banner names how many facilities still lack coordinates
 * (`FacilityMapStore.unplacedCount`) and links back to the list, where they
 * can be found and placed. When no facility has coordinates at all, the map
 * itself is replaced by an `app-empty-state` explaining that it fills in as
 * facilities get placed (`FEATURE.md` "Unplaced facilities affordance").
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-map-page',
  imports: [RouterLink, NgIcon, EmptyState, Map, HlmButton, ...HlmToggleGroupImports],
  providers: [FacilityMapStore, provideIcons({ lucideMap, lucideNetwork })],
  templateUrl: './facility-map-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMapPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose facilities are mapped, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The map dataset, provided by this route. */
  protected readonly store: FacilityMapStore = inject<FacilityMapStore>(FacilityMapStore);

  /** Router used to open the record a marker resolves to. */
  private readonly router: Router = inject(Router);

  /**
   * Property markers
   * @readonly
   * @description Every located facility, mapped onto the map primitive's generic shape.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly MapMarker[]>}
   */
  protected readonly markers: Signal<readonly MapMarker[]> = computed<readonly MapMarker[]>(() =>
    this.store
      .mappedFacilities()
      .map((facility: FacilityOutput): MapMarker | null => facilityToMapMarker(facility))
      .filter((marker): marker is MapMarker => marker !== null),
  );

  /** Where the "Back to list" link and the layout toggle's list/grid entries point. */
  protected readonly listRouteBase: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'facilities',
  ]);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Loads the located facilities and the unplaced count whenever the organization changes.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.store.loadMapped({ organizationId });
        this.store.loadUnplacedCount({ organizationId });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onMarkerSelected
   * @description Opens the record for the selected marker's facility.
   * @access protected
   * @since 1.0.0
   * @param {MapMarker} marker - The activated marker.
   * @returns {void}
   */
  protected onMarkerSelected(marker: MapMarker): void {
    void this.router.navigate([...this.listRouteBase(), marker.id]);
  }
  //#endregion
}
