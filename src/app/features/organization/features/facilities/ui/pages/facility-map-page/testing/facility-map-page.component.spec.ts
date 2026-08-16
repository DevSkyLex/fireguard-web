import {
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  FacilityMapStore,
  type WorstFacility,
} from '@features/organization/features/facilities/state';
import type { MapMarker } from '@shared/map';
import { Map as MapComponent } from '@shared/map';
import { FacilityMapPage } from '../facility-map-page.component';

/** Stands in for `@shared/map`'s `Map`, so no spec ever mounts MapLibre. */
@Component({
  selector: 'app-map',
  template: '',
})
class MapStub {
  public readonly markers: InputSignal<readonly MapMarker[]> = input<readonly MapMarker[]>([]);
  public readonly markerSelected: OutputEmitterRef<MapMarker> = output<MapMarker>();
}

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Headquarters',
    code: 'HQ-01',
    status: 'active',
    address: null,
    metadata: {},
    latitude: 48.85,
    longitude: 2.35,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

const createPage = async (): Promise<ComponentFixture<FacilityMapPage>> => {
  const created = TestBed.createComponent(FacilityMapPage);
  created.componentRef.setInput('organizationId', 'org-1');
  await created.whenStable();

  return created;
};

describe('FacilityMapPage', () => {
  let fixture: ComponentFixture<FacilityMapPage>;
  let loadMapped: ReturnType<typeof vi.fn>;
  let loadUnplacedCount: ReturnType<typeof vi.fn>;
  let setComplianceVisible: ReturnType<typeof vi.fn>;
  let loadCompliance: ReturnType<typeof vi.fn>;
  let mappedFacilities: WritableSignal<readonly FacilityOutput[]>;
  let isLoadingMapped: WritableSignal<boolean>;
  let unplacedCount: WritableSignal<number>;
  let complianceVisible: WritableSignal<boolean>;
  let complianceMap: WritableSignal<ReadonlyMap<string, number | null>>;
  let worstFacilities: WritableSignal<readonly WorstFacility[]>;
  let hasLoadedCompliance: WritableSignal<boolean>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadMapped = vi.fn();
    loadUnplacedCount = vi.fn();
    setComplianceVisible = vi.fn();
    loadCompliance = vi.fn();
    mappedFacilities = signal<readonly FacilityOutput[]>([]);
    isLoadingMapped = signal<boolean>(false);
    unplacedCount = signal<number>(0);
    complianceVisible = signal<boolean>(false);
    complianceMap = signal<ReadonlyMap<string, number | null>>(new Map());
    worstFacilities = signal<readonly WorstFacility[]>([]);
    hasLoadedCompliance = signal<boolean>(false);

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    TestBed.overrideComponent(FacilityMapPage, {
      remove: { imports: [MapComponent], providers: [FacilityMapStore] },
      add: {
        imports: [MapStub],
        providers: [
          {
            provide: FacilityMapStore,
            useValue: {
              mappedFacilities,
              isLoadingMapped,
              hasMappedError: signal(false),
              unplacedCount,
              loadMapped,
              loadUnplacedCount,
              complianceVisible,
              complianceMap,
              worstFacilities,
              hasLoadedCompliance,
              isLoadingCompliance: signal(false),
              hasComplianceError: signal(false),
              setComplianceVisible,
              loadCompliance,
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('loads the located facilities and the unplaced count on arrival', async () => {
    fixture = await createPage();

    expect(loadMapped).toHaveBeenCalledWith({ organizationId: 'org-1' });
    expect(loadUnplacedCount).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('shows the empty state when no facility has coordinates', async () => {
    fixture = await createPage();

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-map')).toBeNull();
  });

  it('renders a marker per located facility and hides the empty state', async () => {
    mappedFacilities.set([facility()]);
    fixture = await createPage();

    const map = fixture.debugElement.query((debug) => debug.componentInstance instanceof MapStub)
      .componentInstance as MapStub;

    expect(map.markers()).toEqual([
      {
        id: 'facility-1',
        latitude: 48.85,
        longitude: 2.35,
        statusKind: 'neutral',
        label: 'Headquarters',
      },
    ]);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('navigates to the facility record when a marker is selected', async () => {
    mappedFacilities.set([facility()]);
    fixture = await createPage();

    fixture.componentInstance['onMarkerSelected']({
      id: 'facility-1',
      latitude: 48.85,
      longitude: 2.35,
      statusKind: 'neutral',
      label: 'Headquarters',
    });

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'facility-1']);
  });

  it('shows the unplaced-facilities banner only when the count is positive', async () => {
    mappedFacilities.set([facility()]);
    unplacedCount.set(3);
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="facility-map-unplaced-banner"]'),
    ).not.toBeNull();
  });

  it('renders compliance-bucketed markers with the rate in the label while the layer is on', async () => {
    mappedFacilities.set([facility()]);
    complianceVisible.set(true);
    complianceMap.set(new Map([['facility-1', 70]]));
    fixture = await createPage();

    const map = fixture.debugElement.query((debug) => debug.componentInstance instanceof MapStub)
      .componentInstance as MapStub;

    expect(map.markers()).toEqual([
      {
        id: 'facility-1',
        latitude: 48.85,
        longitude: 2.35,
        statusKind: 'warning',
        label: 'Headquarters — 70% compliant',
      },
    ]);
  });

  it('loads compliance data the first time the layer is switched on', async () => {
    fixture = await createPage();

    fixture.componentInstance['onComplianceLayerToggled'](true);

    expect(setComplianceVisible).toHaveBeenCalledWith(true);
    expect(loadCompliance).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('does not reload compliance data on a later toggle-on', async () => {
    hasLoadedCompliance.set(true);
    fixture = await createPage();

    fixture.componentInstance['onComplianceLayerToggled'](true);

    expect(setComplianceVisible).toHaveBeenCalledWith(true);
    expect(loadCompliance).not.toHaveBeenCalled();
  });

  it('does not load compliance data when the layer is switched off', async () => {
    fixture = await createPage();

    fixture.componentInstance['onComplianceLayerToggled'](false);

    expect(setComplianceVisible).toHaveBeenCalledWith(false);
    expect(loadCompliance).not.toHaveBeenCalled();
  });

  it('shows the worst-sites ranking only while the compliance layer is on', async () => {
    mappedFacilities.set([facility()]);
    complianceVisible.set(true);
    worstFacilities.set([{ facility: facility(), complianceRate: 20 }]);
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('app-facility-compliance-worst-sites'),
    ).not.toBeNull();
  });

  it('hides the worst-sites ranking while the compliance layer is off', async () => {
    mappedFacilities.set([facility()]);
    fixture = await createPage();

    expect(fixture.nativeElement.querySelector('app-facility-compliance-worst-sites')).toBeNull();
  });

  it('navigates to the facility record when a worst-site entry is selected', async () => {
    fixture = await createPage();

    fixture.componentInstance['onWorstSiteSelected'](facility({ id: 'facility-9' }));

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'facility-9']);
  });
});
