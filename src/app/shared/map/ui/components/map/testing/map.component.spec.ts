import {
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import type { MapMarker } from '../../../../models';
import { Map as MapComponent } from '../map.component';

interface FakeHandlers {
  [event: string]: ((payload?: unknown) => void)[];
}

class FakeMap {
  public handlers: FakeHandlers = {};
  public sources: Record<string, FakeGeoJSONSource> = {};
  public setStyle = vi.fn();
  public remove = vi.fn();
  public addControl = vi.fn();
  public easeTo = vi.fn();
  public queriedFeatures: unknown[] = [];

  public constructor(public options: Record<string, unknown>) {}

  public on(event: string, handler: (payload?: unknown) => void): this {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  public addSource(id: string): void {
    this.sources[id] = new FakeGeoJSONSource();
  }

  public addLayer(): void {}

  public getSource(id: string): FakeGeoJSONSource | undefined {
    return this.sources[id];
  }

  public isSourceLoaded(): boolean {
    return true;
  }

  public querySourceFeatures(): unknown[] {
    return this.queriedFeatures;
  }

  public fire(event: string, payload?: unknown): void {
    for (const handler of this.handlers[event] ?? []) handler(payload);
  }
}

class FakeGeoJSONSource {
  public setData = vi.fn();
  public getClusterExpansionZoom = vi.fn().mockResolvedValue(10);
}

class FakeMarker {
  public element: HTMLElement;
  public lngLat: [number, number] | null = null;
  public removed = false;

  public constructor(options: { element: HTMLElement }) {
    this.element = options.element;
  }

  public setLngLat(lngLat: [number, number]): this {
    this.lngLat = lngLat;
    return this;
  }

  public addTo(map: FakeMap): this {
    (map.options['container'] as HTMLElement).appendChild(this.element);
    return this;
  }

  public remove(): this {
    this.removed = true;
    return this;
  }
}

let lastFakeMap: FakeMap | undefined;

/**
 * Function createFakeMap
 * @description Stands in for `new maplibregl.Map(options)`: a plain function that
 * returns a `FakeMap` instance, which JavaScript's `new` accepts in place of the
 * default `this`-bound instance — so no test code needs to alias `this`.
 * @param {Record<string, unknown>} options
 * @returns {FakeMap}
 */
function createFakeMap(options: Record<string, unknown>): FakeMap {
  const map = new FakeMap(options);
  lastFakeMap = map;
  return map;
}

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(createFakeMap),
  Marker: FakeMarker,
  NavigationControl: vi.fn(),
}));

const MARKERS: readonly MapMarker[] = [
  { id: 'a', latitude: 48.8566, longitude: 2.3522, statusKind: 'warning', label: 'Site A' },
];

/**
 * Function mountedFakeMap
 * @description Waits for the component's browser-only async mount to have run, and
 * returns the `FakeMap` it created.
 * @param {ComponentFixture<MapComponent>} fixture
 * @returns {Promise<FakeMap>}
 */
async function mountedFakeMap(fixture: ComponentFixture<MapComponent>): Promise<FakeMap> {
  return vi.waitFor(async () => {
    await fixture.whenStable();
    if (!lastFakeMap) throw new Error('map not mounted yet');
    return lastFakeMap;
  });
}

describe('Map', () => {
  let resolvedTheme: WritableSignal<'light' | 'dark'>;
  let themePortStub: ThemePort;

  function createFixture(platform: string): ComponentFixture<MapComponent> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: THEME_PORT, useValue: themePortStub },
      ],
    });

    return TestBed.createComponent(MapComponent);
  }

  beforeEach(() => {
    lastFakeMap = undefined;
    resolvedTheme = signal<'light' | 'dark'>('light');
    themePortStub = {
      theme: signal<ThemeMode>('light'),
      resolvedTheme,
      setTheme: vi.fn(),
    };
  });

  describe('server platform', () => {
    it('renders the skeleton and never imports maplibre', async () => {
      const fixture = createFixture('server');
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[role="region"]')).toBeNull();
      expect(lastFakeMap).toBeUndefined();
    });
  });

  describe('browser platform', () => {
    it('mounts the map and renders no skeleton', async () => {
      const fixture = createFixture('browser');
      fixture.componentRef.setInput('markers', MARKERS);
      await mountedFakeMap(fixture);

      expect(fixture.nativeElement.querySelector('hlm-skeleton')).toBeNull();
    });

    it('places a marker button carrying the marker label and emits markerSelected on click', async () => {
      const fixture = createFixture('browser');
      fixture.componentRef.setInput('markers', MARKERS);
      const map = await mountedFakeMap(fixture);

      map.queriedFeatures = [
        {
          geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
          properties: { markerId: 'a' },
        },
      ];
      map.fire('load');

      const selected = vi.fn();
      fixture.componentInstance.markerSelected.subscribe(selected);

      const button = fixture.nativeElement.querySelector('button[aria-label="Site A"]');
      expect(button).not.toBeNull();

      (button as HTMLButtonElement).click();
      expect(selected).toHaveBeenCalledWith(MARKERS[0]);
    });

    it('expands a cluster on click via getClusterExpansionZoom', async () => {
      const fixture = createFixture('browser');
      fixture.componentRef.setInput('markers', MARKERS);
      const map = await mountedFakeMap(fixture);

      map.queriedFeatures = [
        {
          geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
          properties: { cluster: true, cluster_id: 7, point_count: 3 },
        },
      ];
      map.fire('load');

      const button = fixture.nativeElement.querySelector('button[aria-label*="3"]');
      expect(button).not.toBeNull();

      (button as HTMLButtonElement).click();
      await vi.waitFor(() => {
        const source = map.getSource('app-map-markers');
        expect(source?.getClusterExpansionZoom).toHaveBeenCalledWith(7);
      });

      expect(map.easeTo).toHaveBeenCalledWith({ center: [2.3522, 48.8566], zoom: 10 });
    });

    it('emits mapClicked only when interactive', async () => {
      const fixture = createFixture('browser');
      fixture.componentRef.setInput('interactive', true);
      const map = await mountedFakeMap(fixture);

      const clicked = vi.fn();
      fixture.componentInstance.mapClicked.subscribe(clicked);

      map.fire('click', {
        lngLat: { lat: 45.1, lng: 5.2 },
        originalEvent: { defaultPrevented: false },
      });

      expect(clicked).toHaveBeenCalledWith({ latitude: 45.1, longitude: 5.2 });
    });

    it('swaps the style document when the resolved theme changes', async () => {
      const fixture = createFixture('browser');
      const map = await mountedFakeMap(fixture);

      resolvedTheme.set('dark');
      await fixture.whenStable();

      expect(map.setStyle).toHaveBeenCalledWith('/map/style-dark.json');
    });
  });
});
