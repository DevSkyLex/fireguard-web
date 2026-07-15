import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { ButtonModule } from 'primeng/button';
import { ENV_CONFIG, type EnvironmentConfig } from '@core/config/environment';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { ErrorState } from '../error-state';
import { Skeleton } from '../skeleton';
import type { MapMarker } from './models';

/** GeoJSON source id holding the marker points. */
const SOURCE_ID = 'markers';
/** Brand accent (orange) used for pins and clusters. */
const PIN_COLOR = '#f97316';

/**
 * Component MapCanvas
 * @class MapCanvas
 *
 * @description
 * Generic, domain-agnostic MapLibre GL map plotting {@link MapMarker} points as
 * clustered pins. MapLibre is imported dynamically inside `afterNextRender` so
 * its WebGL bundle never touches SSR or the initial client bundle, and every map
 * mutation is guarded so a MapLibre/WebGL failure surfaces on the console instead
 * of crashing the host. Clicking a cluster zooms in; clicking a pin emits
 * {@link markerSelect} so the parent owns navigation and any richer chrome. The
 * base style follows the application theme via {@link THEME_PORT} and fly-to
 * animation is suppressed under `prefers-reduced-motion`. It owns no business
 * state — the parent passes the markers to plot.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-map',
  imports: [ButtonModule, ErrorState, Skeleton],
  templateUrl: './map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapCanvas {
  //#region Inputs
  /**
   * Property markers
   * @readonly
   *
   * @description
   * Points to plot; only those carrying finite coordinates are drawn.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MapMarker[]>}
   */
  public readonly markers: InputSignal<readonly MapMarker[]> =
    input.required<readonly MapMarker[]>();

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible label for the map region, overridable per consumer context.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>($localize`:@@map.canvasAria:Map`);
  //#endregion

  //#region Outputs
  /**
   * Property markerSelect
   * @readonly
   *
   * @description
   * Emits the marker whose pin was clicked, so the parent can react (navigate,
   * open a panel, …).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<MapMarker>}
   */
  public readonly markerSelect: OutputEmitterRef<MapMarker> = output<MapMarker>();
  //#endregion

  //#region Properties
  /** Host element MapLibre renders into. */
  private readonly mapContainer: Signal<ElementRef<HTMLDivElement>> =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the map is still initializing — true from mount (covering the dynamic
   * MapLibre import) until the first successful `load` event, then never again.
   * Drives the loading overlay so the surface is not silently blank while the
   * WebGL bundle downloads and the map warms up.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Whether map initialization failed (WebGL/MapLibre threw). True when init
   * throws, reset to false on a successful `load` or a manual {@link retry}, so a
   * failure surfaces a recoverable error overlay instead of a blank container.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly error: WritableSignal<boolean> = signal<boolean>(false);

  /** Runtime MapLibre map instance (browser-only), or null before init. */
  private mapInstance: MapLibreMap | null = null;
  /** Guards against creating more than one map (and WebGL context). */
  private initStarted = false;
  /** Whether the map's current style is loaded and carries the marker layers. */
  private styleReady = false;
  /** Whether the (map-level, style-independent) interaction handlers are wired. */
  private interactionsWired = false;

  private readonly env: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);
  private readonly theme: ThemePort = inject<ThemePort>(THEME_PORT);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the map after first render (browser-only) and wires reactive
   * updates for marker changes and theme switches. All map access is guarded so
   * effects firing before the style is ready become no-ops.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender((): void => {
      void this.initMap();
    });

    // Push new marker data into the source whenever it changes and the map is
    // ready; the initial data is applied by initMap on first style load.
    effect((): void => {
      const markers: readonly MapMarker[] = this.markers();
      const map: MapLibreMap | null = this.mapInstance;
      if (map && this.styleReady) {
        this.applyMarkers(map, markers);
      }
    });

    // Swap the base style to match the resolved application theme.
    effect((): void => {
      const dark: boolean = this.theme.resolvedTheme() === 'dark';
      const map: MapLibreMap | null = this.mapInstance;
      if (!map || !this.styleReady) return;

      const nextStyle: string = dark ? this.env.mapStyleUrlDark : this.env.mapStyleUrl;
      this.styleReady = false;
      // Re-establish the marker layers once the new style finishes loading; the
      // map-level interaction handlers survive a style swap.
      map.once('style.load', (): void => {
        this.addMarkerLayers(map);
        this.styleReady = true;
        this.applyMarkers(map, this.markers());
      });
      this.runSafely((): void => {
        map.setStyle(nextStyle);
      });
    });

    this.destroyRef.onDestroy((): void => {
      this.styleReady = false;
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
   * Dynamically imports MapLibre once and creates the map, adding the marker
   * layers, wiring interactions and framing the pins on first load. Guards
   * against double initialization so at most one WebGL context is created.
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
      // A failed WebGL/map initialization surfaces a recoverable error overlay
      // instead of propagating and taking down the host. MapLibre logs its own
      // error; retry() lets the user attempt initialization again.
      this.error.set(true);
      return;
    }

    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
    this.mapInstance = map;

    map.once('load', (): void => {
      this.addMarkerLayers(map);
      this.wireInteractions(map);
      this.styleReady = true;
      this.error.set(false);
      this.loading.set(false);
      this.fitToMarkers(map, this.markers());
    });
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-attempts map initialization after a failure: clears the error, restores
   * the loading state, and re-runs {@link initMap} (the MapLibre import is already
   * cached, so only the map/WebGL context is recreated).
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.error.set(false);
    this.loading.set(true);
    this.initStarted = false;
    void this.initMap();
  }

  /**
   * Method addMarkerLayers
   * @method addMarkerLayers
   *
   * @description
   * Adds the clustered marker source and its cluster / count / point layers to
   * the current style. Idempotent — a no-op when the source already exists.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The initialized map.
   *
   * @returns {void}
   */
  private addMarkerLayers(map: MapLibreMap): void {
    this.runSafely((): void => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: this.toFeatureCollection(this.markers()),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: 'marker-clusters',
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
        id: 'marker-cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'marker-points',
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
   * Wires cluster-zoom, pin selection and hover cursors once. The handlers are
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

    for (const layer of ['marker-clusters', 'marker-points']) {
      map.on('mouseenter', layer, (): void => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, (): void => {
        map.getCanvas().style.cursor = '';
      });
    }

    map.on('click', 'marker-clusters', (event): void => {
      this.runSafely((): void => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: ['marker-clusters'],
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

    map.on('click', 'marker-points', (event): void => {
      const feature = event.features?.[0];
      if (!feature) return;
      const id = String(feature.properties?.['id'] ?? '');
      const marker: MapMarker | undefined = this.markers().find(
        (candidate: MapMarker): boolean => candidate.id === id,
      );
      if (marker) this.markerSelect.emit(marker);
    });
  }

  /**
   * Method applyMarkers
   * @method applyMarkers
   *
   * @description
   * Replaces the source data with the current markers and refits the view.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The initialized map.
   * @param {readonly MapMarker[]} markers - Markers to plot.
   *
   * @returns {void}
   */
  private applyMarkers(map: MapLibreMap, markers: readonly MapMarker[]): void {
    this.runSafely((): void => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;
      source.setData(this.toFeatureCollection(markers));
      this.fitToMarkers(map, markers);
    });
  }

  /**
   * Method fitToMarkers
   * @method fitToMarkers
   *
   * @description
   * Fits the viewport to every located marker, honoring reduced-motion. Skips
   * when there are no finite coordinates to frame.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The initialized map.
   * @param {readonly MapMarker[]} markers - Markers to frame.
   *
   * @returns {void}
   */
  private fitToMarkers(map: MapLibreMap, markers: readonly MapMarker[]): void {
    let minLng = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let count = 0;

    for (const marker of markers) {
      const lng: number = marker.longitude;
      const lat: number = marker.latitude;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
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
   * Builds a GeoJSON feature collection of located markers.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly MapMarker[]} markers - Markers to convert.
   *
   * @returns {FeatureCollection} GeoJSON point features.
   */
  private toFeatureCollection(markers: readonly MapMarker[]): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: markers
        .filter(
          (marker: MapMarker): boolean =>
            Number.isFinite(marker.longitude) && Number.isFinite(marker.latitude),
        )
        .map((marker: MapMarker) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [marker.longitude, marker.latitude],
          },
          properties: { id: marker.id, title: marker.title ?? '', subtitle: marker.subtitle ?? '' },
        })),
    };
  }

  /**
   * Method runSafely
   * @method runSafely
   *
   * @description
   * Runs a map operation, swallowing any MapLibre/WebGL failure so it never
   * propagates as an unhandled error.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {() => void} operation - The map operation to run.
   *
   * @returns {void}
   */
  private runSafely(operation: () => void): void {
    try {
      operation();
    } catch {
      // A map/WebGL operation failure must never crash the host.
    }
  }
  //#endregion
}
