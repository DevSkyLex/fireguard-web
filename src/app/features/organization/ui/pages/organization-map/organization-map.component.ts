import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  untracked,
  viewChild,
  type Signal,
} from '@angular/core';
import { SHELL_PANEL_PORT, type ShellPanelPort } from '@core/shell-panel';
import { MAP_FACILITIES_PANEL_ID } from '@features/organization/providers';
import { MapFacilitiesStore, type MapFacilitiesStoreType } from '@features/organization/state';
import { MapCanvas, type MapMarker } from '@shared/components';
import { MapLegend } from './components/map-legend';

/**
 * Component OrganizationMapPage
 * @class OrganizationMapPage
 *
 * @description
 * The organization map: a full-bleed MapLibre canvas with its legend
 * overlay. The facilities browser (search, cards, the add-facility form)
 * used to live here as a page-local sidebar column; it now renders as the
 * shell's `MapFacilitiesPanel`, a sibling under the dashboard shell rather
 * than a child of this page — this page opens it on mount and closes it on
 * destroy, and the two surfaces coordinate only through the shared
 * `MapFacilitiesStore` (selection, search, the add-at-center flow, the
 * fit-all trigger).
 *
 * Owned by the organization parent, not the facilities subfeature: a route
 * outside `facilities/` would fall out of that feature's route tree and
 * break the URL-to-ownership correspondence the nested feature exists to
 * keep.
 *
 * Pin drag is mouse/touch-only by design; the keyboard-accessible
 * equivalent for repositioning a facility is the editable latitude and
 * longitude inputs on the facility edit form (`facility-form`).
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-map',
  imports: [MapCanvas, MapLegend],
  host: { class: 'flex min-h-0 flex-1' },
  templateUrl: './organization-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMapPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Shared map-facilities state — the same instance `MapFacilitiesPanel`
   * reads and writes.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {MapFacilitiesStoreType}
   */
  protected readonly store: MapFacilitiesStoreType =
    inject<MapFacilitiesStoreType>(MapFacilitiesStore);

  /**
   * Property shellPanel
   * @readonly
   *
   * @description
   * Shell panel port — how a routed page opens/closes the right-hand region
   * without importing the layout, which ARCHITECTURE §5 forbids.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {ShellPanelPort}
   */
  private readonly shellPanel: ShellPanelPort = inject<ShellPanelPort>(SHELL_PANEL_PORT);

  /**
   * Property mapCanvas
   * @readonly
   *
   * @description
   * Handle to the map surface, used to read its current viewport center when
   * the panel's add-facility form opens, and to re-frame on the panel's
   * fit-all request.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<MapCanvas | undefined>}
   */
  private readonly mapCanvas: Signal<MapCanvas | undefined> = viewChild(MapCanvas);
  //#endregion

  //#region Lifecycle
  /**
   * Opens the facilities panel on mount and closes it on destroy — this page
   * has nothing else to show beside the map, so the panel's lifecycle
   * follows the page's rather than needing a manual toggle. Also wires the
   * two effects that bridge the map's imperative surface (`MapCanvas`,
   * injected here) to the shared store the panel reads: the map center on
   * demand when the add-form opens, and the fit-all re-frame on request.
   *
   * @since 2.0.0
   */
  public constructor() {
    this.shellPanel.open(MAP_FACILITIES_PANEL_ID);
    inject(DestroyRef).onDestroy((): void => this.shellPanel.close(MAP_FACILITIES_PANEL_ID));

    // The map does not move while the add-form is open, so the center only
    // needs to be read once, on demand, rather than tracked continuously.
    effect((): void => {
      if (!this.store.showAddForm()) return;

      untracked((): void => {
        this.store.setMapCenter(this.mapCanvas()?.getCenter() ?? null);
      });
    });

    // `fitAllRequestId` starts at 0 (never requested); a real request from
    // the panel is always >= 1, so this never fires on initial mount.
    effect((): void => {
      const requestId: number = this.store.fitAllRequestId();
      if (requestId === 0) return;

      untracked((): void => {
        this.mapCanvas()?.fitAll();
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method selectMarker
   *
   * @description
   * Selects the facility a pin stands for, so the panel's card highlights
   * without leaving the map.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MapMarker} marker - The clicked marker.
   *
   * @returns {void}
   */
  protected selectMarker(marker: MapMarker): void {
    this.store.selectFacility(marker.id);
  }

  /**
   * Method onMarkerDragEnd
   *
   * @description
   * Forwards a dragged pin's new position to the store, which persists it
   * optimistically and reverts on failure.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Pick<MapMarker, 'id' | 'latitude' | 'longitude'>} position - The dragged marker's new position.
   *
   * @returns {void}
   */
  protected onMarkerDragEnd(position: Pick<MapMarker, 'id' | 'latitude' | 'longitude'>): void {
    this.store.dragMarker(position);
  }
  //#endregion
}
