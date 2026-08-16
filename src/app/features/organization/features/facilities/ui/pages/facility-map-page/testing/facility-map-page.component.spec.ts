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
import { FacilityMapStore } from '@features/organization/features/facilities/state';
import type { MapMarker } from '@shared/map';
import { Map } from '@shared/map';
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
  let mappedFacilities: WritableSignal<readonly FacilityOutput[]>;
  let isLoadingMapped: WritableSignal<boolean>;
  let unplacedCount: WritableSignal<number>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadMapped = vi.fn();
    loadUnplacedCount = vi.fn();
    mappedFacilities = signal<readonly FacilityOutput[]>([]);
    isLoadingMapped = signal<boolean>(false);
    unplacedCount = signal<number>(0);

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    TestBed.overrideComponent(FacilityMapPage, {
      remove: { imports: [Map], providers: [FacilityMapStore] },
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
});
