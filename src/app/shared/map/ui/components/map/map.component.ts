import type { BooleanInput } from '@angular/cdk/coercion';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  MapSourceDataEvent,
  Marker as MapLibreMarker,
} from 'maplibre-gl';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { MapClickEvent, MapCoordinates, MapMarker } from '../../../models';
import { buildClusterButton } from './utils/build-cluster-button/build-cluster-button.utils';
import { buildMarkerButton } from './utils/build-marker-button/build-marker-button.utils';
import { markersToGeoJson } from './utils/markers-to-geo-json/markers-to-geo-json.utils';

/**
 * Constant SOURCE_ID
 * @description The GeoJSON clustering source id, and the prefix for its anchor layer.
 * @since 1.0.0
 */
const SOURCE_ID: string = 'app-map-markers';

/**
 * Constant CLUSTER_RADIUS
 * @description Pixel radius maplibre groups points within, per clustering pass.
 * @since 1.0.0
 */
const CLUSTER_RADIUS: number = 50;

/**
 * Constant CLUSTER_MAX_ZOOM
 * @description The zoom level past which points stop clustering and render individually.
 * @since 1.0.0
 */
const CLUSTER_MAX_ZOOM: number = 14;

/**
 * Constant DEFAULT_CENTER
 * @description Fallback center when the host gives none — a low zoom over the globe rather than the ocean at (0, 0).
 * @since 1.0.0
 */
const DEFAULT_CENTER: MapCoordinates = { latitude: 20, longitude: 0 };

/**
 * Constant DEFAULT_ZOOM
 * @description Fallback zoom when the host gives none.
 * @since 1.0.0
 */
const DEFAULT_ZOOM: number = 2;

/**
 * Constant MAPLIBRE_STYLESHEET_ID
 * @description DOM id of the injected `<link>`, so the self-hosted MapLibre CSS is fetched at most once per document.
 * @since 1.0.0
 */
const MAPLIBRE_STYLESHEET_ID: string = 'app-maplibre-stylesheet';

/**
 * Function styleUrlFor
 * @description The self-hosted style JSON path for a resolved appearance.
 * @param {'light' | 'dark'} theme - The resolved appearance.
 * @returns {string} The style URL.
 */
function styleUrlFor(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '/map/style-dark.json' : '/map/style-light.json';
}

/**
 * Component Map
 * @class Map
 *
 * @description
 * A domain-agnostic map primitive over MapLibre GL JS and OpenFreeMap's
 * public vector tiles — a bare-noun shared concept (`ARCHITECTURE.md` §2.7):
 * generic `MapMarker[]` in, `markerSelected`/`mapClicked` out, no feature
 * import. It renders and reports interaction; it never interprets a
 * business status beyond the generic `MapMarkerStatusKind` vocabulary a
 * caller already mapped its own status onto.
 *
 * MapLibre's JS and CSS are both loaded only once mounted in the browser,
 * mirroring the `qrcode` precedent (`ARCHITECTURE.md` §1.1): the library
 * never enters the server bundle or the eagerly-loaded stylesheet, and the
 * initial/SSR render shows an `hlm-skeleton` the same size the map will
 * occupy, so layout does not shift on hydration. The CSS is self-hosted
 * (`public/map/maplibre-gl.css`, copied from the package at build time) and
 * injected as a `<link>` rather than a TypeScript `import`, since a raw
 * `.css` import has no ambient module declaration in this project.
 *
 * Markers are rendered as real `<button>` elements (`buildMarkerButton`,
 * `buildClusterButton`) positioned by `maplibregl.Marker`, not as a
 * symbol/circle style layer: a canvas-painted symbol has no DOM node, so it
 * is unreachable by keyboard and invisible to assistive tech. A GeoJSON
 * source with `cluster: true` still backs the layout — an invisible,
 * zero-opacity circle layer is bound to it purely to make MapLibre fetch its
 * cluster tiles, since a source with no layer never loads — and
 * `querySourceFeatures` reads the already-computed clusters back out on
 * every `sourcedata`/`moveend` to place the DOM buttons.
 *
 * Pan and zoom are always live; `interactive` only gates the `mapClicked`
 * output, for a picker-style consumer that turns a background click into a
 * coordinate. Selecting a marker or a cluster never needs `interactive`.
 *
 * The style tracks `ThemePort.resolvedTheme` — the same port
 * `bar-chart`/`line-chart` read for their colour scheme — swapping the
 * whole style document on change rather than restyling individual layers,
 * since the light/dark style JSONs already diverge on every layer's colors.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-map [markers]="facilityMarkers()" (markerSelected)="openFacility($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-map',
  imports: [HlmSkeleton],
  templateUrl: './map.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Map {
  //#region Inputs
  /**
   * Property markers
   * @readonly
   * @description Every point to render, in the primitive's generic shape.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MapMarker[]>}
   */
  public readonly markers: InputSignal<readonly MapMarker[]> = input<readonly MapMarker[]>([]);

  /**
   * Property interactive
   * @readonly
   * @description Whether a background click emits {@link mapClicked}. Pan/zoom are always on.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly interactive: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property center
   * @readonly
   * @description The initial view center; falls back to a world-scale default when absent.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<MapCoordinates | undefined>}
   */
  public readonly center: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);

  /**
   * Property zoom
   * @readonly
   * @description The initial zoom level; falls back to a world-scale default when absent.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number | undefined>}
   */
  public readonly zoom: InputSignal<number | undefined> = input<number | undefined>(undefined);
  //#endregion

  //#region Outputs
  /**
   * Property markerSelected
   * @readonly
   * @description Emits the marker whose button was activated.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<MapMarker>}
   */
  public readonly markerSelected: OutputEmitterRef<MapMarker> = output<MapMarker>();

  /**
   * Property mapClicked
   * @readonly
   * @description Emits the clicked position, only while {@link interactive} is true.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<MapClickEvent>}
   */
  public readonly mapClicked: OutputEmitterRef<MapClickEvent> = output<MapClickEvent>();
  //#endregion

  //#region Properties
  /**
   * Property platformId
   * @readonly
   * @description Guards the browser-only mount.
   * @access private
   * @since 1.0.0
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property document
   * @readonly
   * @description Used only to inject the self-hosted MapLibre stylesheet once, in the browser.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property isBrowser
   * @readonly
   * @description Whether this instance runs on the browser platform.
   * @access protected
   * @since 1.0.0
   * @type {boolean}
   */
  protected readonly isBrowser: boolean = isPlatformBrowser(this.platformId);

  /**
   * Property animationsEnabled
   * @readonly
   * @description Whether camera moves may animate — same `prefers-reduced-motion`
   * guard as `bar-chart`/`line-chart`'s `animationsEnabled`.
   * @access private
   * @since 1.1.0
   * @type {boolean}
   */
  private readonly animationsEnabled: boolean =
    this.isBrowser &&
    !(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  /**
   * Property themePort
   * @readonly
   * @description The app-wide appearance contract driving the style swap.
   * @access private
   * @since 1.0.0
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

  /**
   * Property injector
   * @readonly
   * @description Injection context carried into the async mount, for the effects it creates there.
   * @access private
   * @since 1.0.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property destroyRef
   * @readonly
   * @description Tears the MapLibre instance down when this component is destroyed.
   * @access private
   * @since 1.0.0
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property containerRef
   * @readonly
   * @description The host element MapLibre mounts into, present only in the browser branch.
   * @access private
   * @since 1.0.0
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly containerRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  /**
   * Property instance
   * @description The live MapLibre map once mounted, or `null` before mount/on the server.
   * @access private
   * @since 1.0.0
   * @type {MapLibreMap | null}
   */
  private instance: MapLibreMap | null = null;

  /**
   * Property markerElements
   * @readonly
   * @description Live DOM markers for unclustered points, keyed by `MapMarker.id`.
   * @access private
   * @since 1.0.0
   * @type {Record<string, MapLibreMarker>}
   */
  private readonly markerElements: Record<string, MapLibreMarker> = {};

  /**
   * Property clusterElements
   * @readonly
   * @description Live DOM markers for clusters, keyed by MapLibre's cluster id.
   * @access private
   * @since 1.0.0
   * @type {Record<number, MapLibreMarker>}
   */
  private readonly clusterElements: Record<number, MapLibreMarker> = {};

  /**
   * Property regionLabel
   * @readonly
   * @description The accessible name of the map region.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly regionLabel: string = $localize`:@@map.region.label:Map`;

  /**
   * Property mapLocale
   * @readonly
   * @description Localized strings MapLibre applies to its own DOM — the canvas
   * region title and the built-in control labels — replacing its hardcoded
   * English defaults.
   * @access private
   * @since 1.1.0
   * @type {Record<string, string>}
   */
  private readonly mapLocale: Record<string, string> = {
    'Map.Title': this.regionLabel,
    'NavigationControl.ZoomIn': $localize`:@@map.control.zoomIn:Zoom in`,
    'NavigationControl.ZoomOut': $localize`:@@map.control.zoomOut:Zoom out`,
    'AttributionControl.ToggleAttribution': $localize`:@@map.control.toggleAttribution:Toggle attribution`,
  };

  /**
   * Property loaded
   * @readonly
   * @description Whether the mounted map has fired its `load` event; the template
   * overlays the skeleton until it does.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly loaded: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Kicks off the browser-only, dynamically-imported mount once the container renders.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    if (this.isBrowser) {
      effect(
        (onCleanup): void => {
          if (this.containerRef() === undefined) return;

          untracked((): void => void this.mount());
          onCleanup((): void => void this.instance?.remove());
        },
        { injector: this.injector },
      );
    }
  }
  //#endregion

  //#region Private methods
  /**
   * Method ensureStylesheet
   * @description Injects the self-hosted MapLibre stylesheet `<link>` once per document.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private ensureStylesheet(): void {
    if (this.document.getElementById(MAPLIBRE_STYLESHEET_ID)) return;

    const link: HTMLLinkElement = this.document.createElement('link');
    link.id = MAPLIBRE_STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = '/map/maplibre-gl.css';
    this.document.head.appendChild(link);
  }

  /**
   * Method mount
   * @description Dynamically imports MapLibre, creates the map, and wires the reactive effects.
   * @access private
   * @since 1.0.0
   * @returns {Promise<void>}
   */
  private async mount(): Promise<void> {
    const container: HTMLDivElement | undefined = this.containerRef()?.nativeElement;
    if (!container || this.instance) return;

    this.ensureStylesheet();
    const maplibregl = await import('maplibre-gl');
    const initialCenter: MapCoordinates = this.center() ?? DEFAULT_CENTER;

    const map: MapLibreMap = new maplibregl.Map({
      container,
      style: styleUrlFor(this.themePort.resolvedTheme()),
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: this.zoom() ?? DEFAULT_ZOOM,
      attributionControl: { compact: true },
      locale: this.mapLocale,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', (): void => this.onLoad(map, maplibregl.Marker));
    if (this.interactive()) {
      map.on('click', (event: MapMouseEvent): void => {
        if (event.originalEvent.defaultPrevented) return;
        this.mapClicked.emit({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
      });
    }
    this.instance = map;
    this.destroyRef.onDestroy((): void => void map.remove());

    effect(
      (): void => {
        const theme: 'light' | 'dark' = this.themePort.resolvedTheme();
        untracked((): void => {
          map.setStyle(styleUrlFor(theme));
        });
      },
      { injector: this.injector },
    );

    effect(
      (): void => {
        const markers: readonly MapMarker[] = this.markers();
        untracked((): void => {
          const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
          void source?.setData(markersToGeoJson(markers) as never);
        });
      },
      { injector: this.injector },
    );
  }

  /**
   * Method onLoad
   * @description Adds the clustering source and its tile-loading anchor layer, once the style is ready.
   * @access private
   * @since 1.0.0
   * @param {MapLibreMap} map - The mounted map.
   * @param {typeof import('maplibre-gl').Marker} markerCtor - MapLibre's `Marker` class, from the dynamic import.
   * @returns {void}
   */
  private onLoad(map: MapLibreMap, markerCtor: typeof import('maplibre-gl').Marker): void {
    this.loaded.set(true);
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      data: markersToGeoJson(this.markers()) as never,
    });
    map.addLayer({
      id: `${SOURCE_ID}-anchor`,
      type: 'circle',
      source: SOURCE_ID,
      paint: { 'circle-radius': 0, 'circle-opacity': 0 },
    });

    const refresh = (): void => this.renderMarkerElements(map, markerCtor);
    map.on('sourcedata', (event: MapSourceDataEvent): void => {
      if (event.sourceId === SOURCE_ID && map.isSourceLoaded(SOURCE_ID)) refresh();
    });
    map.on('moveend', refresh);
    refresh();
  }

  /**
   * Method renderMarkerElements
   *
   * @description
   * Diffs the currently rendered clusters/points against `markerElements` and
   * `clusterElements`, adding, updating, and removing DOM marker buttons so
   * they always match what MapLibre's clustering computed for the current
   * viewport and zoom.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MapLibreMap} map - The mounted map.
   * @param {typeof import('maplibre-gl').Marker} markerCtor - MapLibre's `Marker` class.
   *
   * @returns {void}
   */
  private renderMarkerElements(
    map: MapLibreMap,
    markerCtor: typeof import('maplibre-gl').Marker,
  ): void {
    if (!map.getSource(SOURCE_ID) || !map.isSourceLoaded(SOURCE_ID)) return;

    const markersById: Record<string, MapMarker> = {};
    for (const marker of this.markers()) markersById[marker.id] = marker;

    const features = map.querySourceFeatures(SOURCE_ID);
    const seenMarkerIds = new Set<string>();
    const seenClusterIds = new Set<number>();

    for (const feature of features) {
      const geometry = feature.geometry;
      if (geometry.type !== 'Point') continue;
      const [longitude, latitude] = geometry.coordinates;

      if (feature.properties?.['cluster']) {
        const clusterId: number = feature.properties['cluster_id'];
        const count: number = feature.properties['point_count'];
        seenClusterIds.add(clusterId);
        this.upsertCluster(map, markerCtor, clusterId, count, [longitude, latitude]);
        continue;
      }

      const markerId: string | undefined = feature.properties?.['markerId'];
      const marker: MapMarker | undefined = markerId ? markersById[markerId] : undefined;
      if (!marker) continue;

      seenMarkerIds.add(marker.id);
      this.upsertMarker(map, markerCtor, marker, [longitude, latitude]);
    }

    let removedFocusAt: [number, number] | null = null;
    for (const [id, marker] of Object.entries(this.markerElements)) {
      if (!seenMarkerIds.has(id)) {
        removedFocusAt ??= this.focusedPosition(marker);
        marker.remove();
        delete this.markerElements[id];
      }
    }
    for (const [id, marker] of Object.entries(this.clusterElements)) {
      if (!seenClusterIds.has(Number(id))) {
        removedFocusAt ??= this.focusedPosition(marker);
        marker.remove();
        delete this.clusterElements[Number(id)];
      }
    }
    if (removedFocusAt) this.restoreFocus(map, removedFocusAt);
  }

  /**
   * Method focusedPosition
   * @description The marker's `[longitude, latitude]` when its button currently
   * holds focus, `null` otherwise — captured before the button leaves the DOM.
   * @access private
   * @since 1.1.0
   * @param {MapLibreMarker} marker - The DOM marker about to be removed.
   * @returns {[number, number] | null} The focused marker's position, or `null`.
   */
  private focusedPosition(marker: MapLibreMarker): [number, number] | null {
    if (!marker.getElement().contains(this.document.activeElement)) return null;

    const { lng, lat } = marker.getLngLat();
    return [lng, lat];
  }

  /**
   * Method restoreFocus
   * @description Moves focus to the surviving marker/cluster button nearest the
   * removed, focused one — or the map canvas when none survives — so a keyboard
   * user is not dropped to `<body>` when clustering rerenders the buttons.
   * @access private
   * @since 1.1.0
   * @param {MapLibreMap} map - The mounted map.
   * @param {[number, number]} lngLat - Where the focused button was.
   * @returns {void}
   */
  private restoreFocus(map: MapLibreMap, [lng, lat]: [number, number]): void {
    let nearest: MapLibreMarker | null = null;
    let nearestDistance: number = Number.POSITIVE_INFINITY;

    const survivors: MapLibreMarker[] = [
      ...Object.values(this.markerElements),
      ...Object.values(this.clusterElements),
    ];
    for (const survivor of survivors) {
      const position = survivor.getLngLat();
      const distance: number = (position.lng - lng) ** 2 + (position.lat - lat) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = survivor;
      }
    }

    if (nearest) nearest.getElement().focus();
    else map.getCanvas().focus();
  }

  /**
   * Method upsertMarker
   * @description Creates or repositions the DOM marker for one unclustered point.
   * @access private
   * @since 1.0.0
   * @param {MapLibreMap} map - The mounted map.
   * @param {typeof import('maplibre-gl').Marker} markerCtor - MapLibre's `Marker` class.
   * @param {MapMarker} marker - The marker to place.
   * @param {[number, number]} lngLat - Its `[longitude, latitude]`.
   * @returns {void}
   */
  private upsertMarker(
    map: MapLibreMap,
    markerCtor: typeof import('maplibre-gl').Marker,
    marker: MapMarker,
    lngLat: [number, number],
  ): void {
    const existing = this.markerElements[marker.id];
    if (existing) {
      existing.setLngLat(lngLat);
      return;
    }

    const button = buildMarkerButton(marker);
    button.addEventListener('click', (event: MouseEvent): void => {
      event.preventDefault();
      this.markerSelected.emit(marker);
    });

    this.markerElements[marker.id] = new markerCtor({ element: button })
      .setLngLat(lngLat)
      .addTo(map);
  }

  /**
   * Method upsertCluster
   * @description Creates or repositions the DOM button for one cluster.
   * @access private
   * @since 1.0.0
   * @param {MapLibreMap} map - The mounted map.
   * @param {typeof import('maplibre-gl').Marker} markerCtor - MapLibre's `Marker` class.
   * @param {number} clusterId - MapLibre's cluster id.
   * @param {number} count - How many points the cluster groups.
   * @param {[number, number]} lngLat - Its `[longitude, latitude]`.
   * @returns {void}
   */
  private upsertCluster(
    map: MapLibreMap,
    markerCtor: typeof import('maplibre-gl').Marker,
    clusterId: number,
    count: number,
    lngLat: [number, number],
  ): void {
    const existing = this.clusterElements[clusterId];
    if (existing) {
      existing.setLngLat(lngLat);
      return;
    }

    const button = buildClusterButton(count);
    button.addEventListener('click', (event: MouseEvent): void => {
      event.preventDefault();
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      void source?.getClusterExpansionZoom(clusterId).then((zoom: number): void => {
        map.easeTo(
          this.animationsEnabled ? { center: lngLat, zoom } : { center: lngLat, zoom, duration: 0 },
        );
      });
    });

    this.clusterElements[clusterId] = new markerCtor({ element: button })
      .setLngLat(lngLat)
      .addTo(map);
  }
  //#endregion
}
