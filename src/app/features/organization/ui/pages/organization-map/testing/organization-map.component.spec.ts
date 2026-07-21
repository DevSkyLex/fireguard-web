import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ENV_CONFIG } from '@core/config/environment';
import { SHELL_PANEL_PORT } from '@core/shell-panel';
import { THEME_PORT } from '@core/theme';
import { MAP_FACILITIES_PANEL_ID } from '@features/organization/providers';
import { MapFacilitiesStore } from '@features/organization/state';
import { MapCanvas, type MapMarker } from '@shared/components';
import { OrganizationMapPage } from '../organization-map.component';

const MARKER: MapMarker = { id: 'f1', latitude: 48.85, longitude: 2.35, title: 'Acme HQ' };

describe('OrganizationMapPage', () => {
  let shellPanel: { open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let storeMock: {
    markers: ReturnType<typeof signal<readonly MapMarker[]>>;
    showAddForm: ReturnType<typeof signal<boolean>>;
    fitAllRequestId: ReturnType<typeof signal<number>>;
    selectFacility: ReturnType<typeof vi.fn>;
    dragMarker: ReturnType<typeof vi.fn>;
    setMapCenter: ReturnType<typeof vi.fn>;
  };

  const render = (): ComponentFixture<OrganizationMapPage> => {
    shellPanel = { open: vi.fn(), close: vi.fn() };
    storeMock = {
      markers: signal<readonly MapMarker[]>([MARKER]),
      showAddForm: signal(false),
      fitAllRequestId: signal(0),
      selectFacility: vi.fn(),
      dragMarker: vi.fn(),
      setMapCenter: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ENV_CONFIG, useValue: { mapStyleUrl: 'https://example.invalid/s' } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: SHELL_PANEL_PORT, useValue: shellPanel },
        { provide: MapFacilitiesStore, useValue: storeMock },
      ],
    });

    const fixture = TestBed.createComponent(OrganizationMapPage);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the map with the store’s markers', () => {
    const fixture = render();
    const mapCanvas = fixture.debugElement.query(By.directive(MapCanvas))
      .componentInstance as MapCanvas;

    expect(mapCanvas.markers()).toEqual([MARKER]);
  });

  it('opens the facilities panel on mount', () => {
    render();

    expect(shellPanel.open).toHaveBeenCalledWith(MAP_FACILITIES_PANEL_ID);
  });

  it('closes the facilities panel on destroy', () => {
    const fixture = render();

    fixture.destroy();

    expect(shellPanel.close).toHaveBeenCalledWith(MAP_FACILITIES_PANEL_ID);
  });

  it('selects the facility a pin represents through the shared store', () => {
    const fixture = render();
    const mapCanvas = fixture.debugElement.query(By.directive(MapCanvas))
      .componentInstance as MapCanvas;

    mapCanvas.markerSelect.emit(MARKER);

    expect(storeMock.selectFacility).toHaveBeenCalledWith('f1');
  });

  it('forwards a dragged pin to the shared store', () => {
    const fixture = render();
    const mapCanvas = fixture.debugElement.query(By.directive(MapCanvas))
      .componentInstance as MapCanvas;

    mapCanvas.markerDragEnd.emit({ id: 'f1', latitude: 40, longitude: 3 });

    expect(storeMock.dragMarker).toHaveBeenCalledWith({ id: 'f1', latitude: 40, longitude: 3 });
  });

  it('reads the map center on demand when the panel opens the add-facility form', () => {
    vi.spyOn(MapCanvas.prototype, 'getCenter').mockReturnValue({ latitude: 10, longitude: 20 });
    const fixture = render();

    storeMock.showAddForm.set(true);
    fixture.detectChanges();
    TestBed.tick();

    expect(storeMock.setMapCenter).toHaveBeenCalledWith({ latitude: 10, longitude: 20 });
  });

  it('does not read the map center before the add-facility form opens', () => {
    render();
    TestBed.tick();

    expect(storeMock.setMapCenter).not.toHaveBeenCalled();
  });

  it('re-frames the map when the panel requests a fit-all', () => {
    const fitAll = vi.spyOn(MapCanvas.prototype, 'fitAll');
    const fixture = render();

    storeMock.fitAllRequestId.set(1);
    fixture.detectChanges();
    TestBed.tick();

    expect(fitAll).toHaveBeenCalled();
  });

  it('never re-frames the map on initial mount, only on a real request', () => {
    const fitAll = vi.spyOn(MapCanvas.prototype, 'fitAll');
    render();
    TestBed.tick();

    expect(fitAll).not.toHaveBeenCalled();
  });
});
