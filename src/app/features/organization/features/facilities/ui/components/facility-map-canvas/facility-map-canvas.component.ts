import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  viewChild,
  type ElementRef,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap, Popup as MapLibrePopup } from 'maplibre-gl';
import { ENV_CONFIG, type EnvironmentConfig } from '@core/config/environment';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/** GeoJSON source id holding the facility points. */
const SOURCE_ID = 'facilities';
/** Brand accent (orange) used for pins and clusters. */
const PIN_COLOR = '#f97316';

/**
 * Component FacilityMapCanvas
 * @class FacilityMapCanvas
 *
 * @description
 * Deferred, browser-only MapLibre GL map plotting the organization's located
 * facilities as clustered pins. MapLibre is dynamically imported inside an
 * `afterNextRender` hook so its WebGL bundle never touches SSR or the initial
 * client bundle. Every map mutation is guarded (single init, style-loaded checks,
 * try/catch) so a MapLibre or WebGL failure surfaces on the console instead of
 * spiralling. Pins cluster by proximity; clicking a cluster zooms in and clicking
 * a pin opens a popup that links to the facility detail. The base style follows
 * the application theme (light/dark) via {@link THEME_PORT}, and fly-to animation
 * is suppressed under `prefers-reduced-motion`. It owns no business state — the
 * parent passes the facilities to plot.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-map-canvas',
  templateUrl: './facility-map-canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMapCanvas {
  //#region Inputs
  /**
   * Property facilities
   * @readonly
   *
   * @description
   * Facilities to plot; only those carrying coordinates are drawn.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly facilities: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Active organization id, used to build facility-detail navigation links.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property mapContainer
   * @readonly
   *
   * @description
   * Host element MapLibre renders into.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLDivElement>>}
   */
  private readonly mapContainer: Signal<ElementRef<HTMLDivElement>> =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  /** Runtime MapLibre map instance (browser-only), or null before init. */
  private mapInstance: MapLibreMap | null = null;
  /** Shared popup reused across pin clicks. */
  private popupInstance: MapLibrePopup | null = null;
  /** Guards against creating more than one map (and WebGL context). */
  private initStarted = false;
  /** Whether the map's current style is loaded and carries the facility layers. */
  private styleReady = false;
  /** Whether the (map-level, style-independent) interaction handlers are wired. */
  private interactionsWired = false;

  private readonly env: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);
  private readonly theme: ThemePort = inject<ThemePort>(THEME_PORT);
  private readonly router: Router = inject<Router>(Router);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the map after first render (browser-only) and wires reactive
   * updates for facility changes and theme switches. All map access is guarded so
   * effects that fire before the style is ready become no-ops.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender((): void => {
      void this.initMap();
    });

    // Push new facility data into the source whenever it changes and the map is
    // ready; the initial data is applied by initMap on first style load.
    effect((): void => {
      const facilities: readonly FacilityOutput[] = this.facilities();
      const map: MapLibreMap | null = this.mapInstance;
      if (map && this.styleReady) {
        this.applyFacilities(map, facilities);
      }
    });

    // Swap the base style to match the resolved application theme.
    effect((): void => {
      const dark: boolean = this.theme.resolvedTheme() === 'dark';
      const map: MapLibreMap | null = this.mapInstance;
      if (!map || !this.styleReady) return;

      const nextStyle: string = dark ? this.env.mapStyleUrlDark : this.env.mapStyleUrl;
      this.styleReady = false;
      // Re-establish the facility layers once the new style finishes loading;
      // the map-level interaction handlers survive a style swap.
      map.once('style.load', (): void => {
        this.addFacilityLayers(map);
        this.styleReady = true;
        this.applyFacilities(map, this.facilities());
      });
      this.runSafely((): void => {
        map.setStyle(nextStyle);
      });
    });

    this.destroyRef.onDestroy((): void => {
      this.styleReady = false;
      this.popupInstance?.remove();
      this.mapInstance?.remove();
      this.mapInstance = null;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method initMap
   * @method initMap
   *
   * @description
   * Dynamically imports MapLibre once and creates the map. On the first `load`
   * event it adds the facility layers, wires interactions and frames the pins.
   * Guards against double initialization so at most one WebGL context is created.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {Promise<void>}
   */
  private async initMap(): Promise<void> {
    if (this.initStarted) return;
    this.initStarted = true;

    const gl = await import('maplibre-gl');
    const dark: boolean = this.theme.resolvedTheme() === 'dark';

    let map: MapLibreMap;
    try {
      map = new gl.Map({
        container: this.mapContainer().nativeElement,
        style: dark ? this.env.mapStyleUrlDark : this.env.mapStyleUrl,
        center: [2.3522, 48.8566],
        zoom: 4,
        attributionControl: { compact: true },
      });
    } catch {
      // A failed WebGL/map initialization leaves the surface blank instead of
      // propagating and taking down the workspace. MapLibre logs its own error.
      return;
    }

    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
    this.popupInstance = new gl.Popup({ closeButton: true, closeOnClick: true, offset: 12 });
    this.mapInstance = map;

    map.once('load', (): void => {
      this.addFacilityLayers(map);
      this.wireInteractions(map);
      this.styleReady = true;
      this.fitToFacilities(map, this.facilities());
    });
  }

  /**
   * Method addFacilityLayers
   * @method addFacilityLayers
   *
   * @description
   * Adds the clustered facility source and its cluster / count / point layers to
   * the current style. Idempotent — a no-op when the source already exists.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {MapLibreMap} map - The initialized map.
   *
   * @returns {void}
   */
  private addFacilityLayers(map: MapLibreMap): void {
    this.runSafely((): void => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: this.toFeatureCollection(this.facilities()),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: 'facility-clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': PIN_COLOR,
          'circle-opacity': 0.85,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
        },
      });
      map.addLayer({
        id: 'facility-cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'facility-points',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': PIN_COLOR,
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    });
  }

  /**
   * Method wireInteractions
   * @method wireInteractions
   *
   * @description
   * Wires cluster-zoom, pin popups and hover cursors once. The handlers are
   * registered on the map (keyed by layer id) so they survive a style swap.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The initialized map.
   *
   * @returns {void}
   */
  private wireInteractions(map: MapLibreMap): void {
    if (this.interactionsWired) return;
    this.interactionsWired = true;

    for (const layer of ['facility-clusters', 'facility-points']) {
      map.on('mouseenter', layer, (): void => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, (): void => {
        map.getCanvas().style.cursor = '';
      });
    }

    map.on('click', 'facility-clusters', (event): void => {
      this.runSafely((): void => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: ['facility-clusters'],
        })[0];
        const clusterId: unknown = feature?.properties?.['cluster_id'];
        if (typeof clusterId !== 'number') return;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (!source) return;
        void source.getClusterExpansionZoom(clusterId).then((zoom: number): void => {
          this.runSafely((): void => {
            map.easeTo({
              center: (feature.geometry as Point).coordinates as [number, number],
              zoom,
            });
          });
        });
      });
    });

    map.on('click', 'facility-points', (event): void => {
      const feature = event.features?.[0];
      if (!feature) return;
      const coordinates = (feature.geometry as Point).coordinates.slice() as [number, number];
      const id = String(feature.properties?.['id'] ?? '');

      const container: HTMLDivElement = document.createElement('div');
      container.className = 'flex flex-col gap-1';
      const title: HTMLParagraphElement = document.createElement('p');
      title.className = 'font-semibold';
      title.textContent = String(feature.properties?.['name'] ?? '');
      const subtitle: HTMLParagraphElement = document.createElement('p');
      subtitle.className = 'text-xs capitalize opacity-70';
      subtitle.textContent = String(feature.properties?.['type'] ?? '');
      const link: HTMLButtonElement = document.createElement('button');
      link.type = 'button';
      link.className = 'mt-1 text-left text-xs font-medium text-primary-600 underline';
      link.textContent = $localize`:@@facility.map.viewFacility:View facility`;
      link.addEventListener('click', (): void => {
        void this.router.navigate(['/organizations', this.organizationId(), 'facilities', id]);
      });
      container.append(title, subtitle, link);

      this.runSafely((): void => {
        this.popupInstance?.setLngLat(coordinates).setDOMContent(container).addTo(map);
      });
    });
  }

  /**
   * Method applyFacilities
   * @method applyFacilities
   *
   * @description
   * Replaces the source data with the current facilities and refits the view.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The initialized map.
   * @param {readonly FacilityOutput[]} facilities - Facilities to plot.
   *
   * @returns {void}
   */
  private applyFacilities(map: MapLibreMap, facilities: readonly FacilityOutput[]): void {
    this.runSafely((): void => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;
      source.setData(this.toFeatureCollection(facilities));
      this.fitToFacilities(map, facilities);
    });
  }

  /**
   * Method fitToFacilities
   * @method fitToFacilities
   *
   * @description
   * Fits the viewport to every located facility, honoring reduced-motion. Skips
   * when there are no finite coordinates to frame.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The initialized map.
   * @param {readonly FacilityOutput[]} facilities - Facilities to frame.
   *
   * @returns {void}
   */
  private fitToFacilities(map: MapLibreMap, facilities: readonly FacilityOutput[]): void {
    let minLng = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let count = 0;

    for (const facility of facilities) {
      const lng: number | null | undefined = facility.longitude;
      const lat: number | null | undefined = facility.latitude;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      minLng = Math.min(minLng, lng as number);
      maxLng = Math.max(maxLng, lng as number);
      minLat = Math.min(minLat, lat as number);
      maxLat = Math.max(maxLat, lat as number);
      count += 1;
    }

    if (count === 0) return;

    const reduceMotion: boolean =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.runSafely((): void => {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 56, maxZoom: 15, animate: !reduceMotion, duration: reduceMotion ? 0 : 600 },
      );
    });
  }

  /**
   * Method toFeatureCollection
   * @method toFeatureCollection
   *
   * @description
   * Builds a GeoJSON feature collection of located facilities.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly FacilityOutput[]} facilities - Facilities to convert.
   *
   * @returns {FeatureCollection} GeoJSON point features.
   */
  private toFeatureCollection(facilities: readonly FacilityOutput[]): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: facilities
        .filter(
          (facility: FacilityOutput): boolean =>
            Number.isFinite(facility.longitude) && Number.isFinite(facility.latitude),
        )
        .map((facility: FacilityOutput) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [facility.longitude as number, facility.latitude as number],
          },
          properties: { id: facility.id, name: facility.name, type: facility.type },
        })),
    };
  }

  /**
   * Method runSafely
   * @method runSafely
   *
   * @description
   * Runs a map operation, catching and logging any MapLibre/WebGL failure so it
   * never propagates as an unhandled error.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {() => void} operation - The map operation to run.
   *
   * @returns {void}
   */
  private runSafely(operation: () => void): void {
    try {
      operation();
    } catch {
      // A map/WebGL operation failure must never crash the workspace.
    }
  }
  //#endregion
}
