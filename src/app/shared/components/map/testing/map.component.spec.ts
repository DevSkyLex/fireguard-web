import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment';
import { THEME_PORT } from '@core/theme';
import { MapCanvas } from '../map.component';
import type { MapMarker } from '../models';

/**
 * Internals the spec drives directly. `loading` and `error` are owned by the
 * map's own initialization, which cannot run in jsdom — there is no WebGL — so
 * the spec sets them to reach the states a real browser would.
 */
type MapCanvasTestApi = MapCanvas & {
  loading: { set(value: boolean): void };
  error: { set(value: boolean): void };
  canFitAll: () => boolean;
};

const MARKER: MapMarker = {
  id: 'facility-1',
  title: 'Acme HQ',
  longitude: 2.35,
  latitude: 48.85,
};

describe('MapCanvas', () => {
  let fixture: ComponentFixture<MapCanvas>;
  let api: MapCanvasTestApi;

  const render = (markers: readonly MapMarker[]): void => {
    TestBed.configureTestingModule({
      imports: [MapCanvas],
      providers: [
        { provide: ENV_CONFIG, useValue: { mapStyleUrl: 'https://example.invalid/s' } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
      ],
    });

    fixture = TestBed.createComponent(MapCanvas);
    fixture.componentRef.setInput('markers', markers);
    fixture.componentRef.setInput('ariaLabel', 'Facilities map');
    fixture.detectChanges();

    api = fixture.componentInstance as unknown as MapCanvasTestApi;
  };

  /**
   * The re-frame control is gated on signals rather than on the MapLibre
   * instance field: a plain field would not re-run the template under OnPush,
   * so the button could stay hidden after the map finished loading. That is
   * the failure this describe exists to catch.
   */
  describe('fit-all affordance', () => {
    it('offers the control once the map has rendered and a marker is placeable', () => {
      render([MARKER]);
      api.loading.set(false);
      api.error.set(false);

      expect(api.canFitAll()).toBe(true);
    });

    it('withholds it while the map is still loading', () => {
      render([MARKER]);
      api.loading.set(true);
      api.error.set(false);

      expect(api.canFitAll()).toBe(false);
    });

    it('withholds it when the map failed to load', () => {
      render([MARKER]);
      api.loading.set(false);
      api.error.set(true);

      expect(api.canFitAll()).toBe(false);
    });

    it('withholds it when no marker carries usable coordinates', () => {
      render([{ ...MARKER, longitude: Number.NaN, latitude: Number.NaN }]);
      api.loading.set(false);
      api.error.set(false);

      expect(api.canFitAll()).toBe(false);
    });

    it('withholds it when there is nothing to place', () => {
      render([]);
      api.loading.set(false);
      api.error.set(false);

      expect(api.canFitAll()).toBe(false);
    });
  });
});
