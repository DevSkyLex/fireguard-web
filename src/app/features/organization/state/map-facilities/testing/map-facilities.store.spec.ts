import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { MapFacilitiesStore } from '../map-facilities.store';

const facility = (id: string, overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id,
    organizationId: 'org-1',
    name: id,
    type: 'site',
    status: 'active',
    code: null,
    parentFacilityId: null,
    hasChildren: false,
    address: null,
    equipmentCount: 0,
    metadata: {},
    latitude: 48.85,
    longitude: 2.35,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  }) as unknown as FacilityOutput;

const ORG = { id: 'org-1', name: 'Acme', slug: 'acme' };

describe('MapFacilitiesStore', () => {
  let selectedOrganization: WritableSignal<typeof ORG | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let listAll: ReturnType<typeof vi.fn>;
  let getTree: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  const configure = (): void => {
    TestBed.configureTestingModule({
      providers: [
        MapFacilitiesStore,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization } },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
        { provide: FacilityService, useValue: { listAll, getTree, create, update } },
      ],
    });
  };

  beforeEach(() => {
    selectedOrganization = signal<typeof ORG | null>(ORG);
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.FACILITIES_READ]);
    listAll = vi.fn(() =>
      of([facility('f1', { name: 'Acme HQ' }), facility('f2', { name: 'North Depot' })]),
    );
    getTree = vi.fn(() => of({ id: '/tree', nodes: [] }));
    create = vi.fn((_org: string, input: unknown) =>
      of(facility('new-1', { name: (input as { name: string }).name })),
    );
    update = vi.fn(() => of(facility('f1')));
  });

  it('loads facilities on init when the member holds facilities.read', () => {
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    expect(listAll).toHaveBeenCalledWith('org-1');
    expect(store.facilities()).toHaveLength(2);
    expect(store.isEmpty()).toBe(false);
  });

  it('never fetches for a member without facilities.read', () => {
    permissions.set([]);
    configure();
    TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    expect(listAll).not.toHaveBeenCalled();
  });

  it('degrades gracefully when the compliance tree 403s, without failing the facility list', () => {
    getTree = vi.fn(() => throwError(() => new Error('forbidden')));
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    expect(store.facilities()).toHaveLength(2);
    expect(store.markers()).toHaveLength(2);
    expect(store.markers()[0]?.color).toBe('#94a3b8');
  });

  it('filters facilities by name or city', () => {
    listAll = vi.fn(() =>
      of([
        facility('f1', { name: 'Acme HQ', metadata: { city: 'Paris' } }),
        facility('f2', { name: 'North Depot', metadata: { city: 'Lyon' } }),
      ]),
    );
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    store.setSearch('lyon');
    expect(store.filteredFacilities()).toHaveLength(1);
    expect(store.isSearchEmpty()).toBe(false);

    store.setSearch('nothing matches');
    expect(store.isSearchEmpty()).toBe(true);
  });

  it('creates a facility at the stored map center and selects it', () => {
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    store.setMapCenter({ latitude: 10, longitude: 20 });
    store.submitAddFacility({ name: 'New Site', city: 'Lyon' });
    TestBed.tick();

    expect(create).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        type: 'site',
        name: 'New Site',
        latitude: 10,
        longitude: 20,
        metadata: { city: 'Lyon' },
      }),
    );
    expect(store.facilities()).toHaveLength(3);
    expect(store.selectedFacilityId()).toBe('new-1');
    expect(store.showAddForm()).toBe(false);
  });

  it('surfaces an error instead of creating when no map center is known', () => {
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    store.submitAddFacility({ name: 'New Site', city: '' });

    expect(create).not.toHaveBeenCalled();
    expect(store.actionError()).not.toBeNull();
  });

  it('patches a dragged pin optimistically', () => {
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    store.dragMarker({ id: 'f1', latitude: 40, longitude: 3 });

    expect(update).toHaveBeenCalledWith('org-1', 'f1', { latitude: 40, longitude: 3 });
    expect(store.facilities().find((f) => f.id === 'f1')?.latitude).toBe(40);
  });

  it('reverts a dragged pin and surfaces an error when the patch fails', () => {
    update = vi.fn(() => throwError(() => new Error('boom')));
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    store.dragMarker({ id: 'f1', latitude: 40, longitude: 3 });
    TestBed.tick();

    expect(store.facilities().find((f) => f.id === 'f1')?.latitude).toBe(48.85);
    expect(store.actionError()).not.toBeNull();
  });

  it('increments fitAllRequestId on every request, for the page to observe', () => {
    configure();
    const store = TestBed.inject(MapFacilitiesStore);
    TestBed.tick();

    const before = store.fitAllRequestId();
    store.requestFitAll();

    expect(store.fitAllRequestId()).toBe(before + 1);
  });
});
