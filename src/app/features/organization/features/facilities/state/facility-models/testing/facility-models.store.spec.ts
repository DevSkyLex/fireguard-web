import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { Group } from 'three';
import type { HydraCollection } from '@core/api/models';
import {
  FacilityModelService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  FacilityModelAsset,
  FacilityModelInput,
  FacilityModelOutput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import { FacilityModelAssetService } from '@features/organization/features/facilities/services';
import { FacilityModelsStore, type FacilityModelsStoreType } from '../facility-models.store';

const collection = (
  items: readonly FacilityModelOutput[],
): HydraCollection<FacilityModelOutput> => ({
  '@id': '',
  '@type': 'Collection',
  member: items,
  totalItems: items.length,
});
const building: FacilityOutput = {
  '@id': '',
  '@type': 'Facility',
  id: 'building-1',
  organizationId: 'org-1',
  parentFacilityId: null,
  hasChildren: true,
  type: 'building',
  name: 'HQ',
  code: null,
  status: 'active',
  address: null,
  latitude: null,
  longitude: null,
  metadata: {},
  path: [],
  equipmentCount: 0,
  createdAt: '',
  updatedAt: '',
};

describe('FacilityModelsStore', () => {
  let store: FacilityModelsStoreType;
  let service: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    activate: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let assets: { load: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> };
  let facilities: { get: ReturnType<typeof vi.fn>; listDescendants: ReturnType<typeof vi.fn> };
  const settings: FacilityModelInput = {
    transform: { scale: 1, rotationDegrees: 0, translation: { x: 0, y: 0, z: 0 } },
    bindings: [],
  };
  const model: FacilityModelOutput = {
    '@id': '/api/facility-models/model-1',
    '@type': 'FacilityModel',
    id: 'model-1',
    organizationId: 'org-1',
    buildingId: 'building-1',
    fileName: 'building.glb',
    mimeType: 'model/gltf-binary',
    fileSize: 100,
    nodeCount: 2,
    nodes: [
      { index: 0, name: 'Room' },
      { index: 1, name: 'Room' },
    ],
    revision: 1,
    active: true,
    ...settings,
    bindings: settings.bindings ?? [],
    bindingIssues: [],
    downloadUrl: '/api/facility-models/model-1/download',
    createdAt: '',
    updatedAt: '',
  };
  const asset: FacilityModelAsset = { scene: new Group(), nodes: [] };
  const context = { organizationId: 'org-1', buildingId: 'building-1' };

  beforeEach(() => {
    service = {
      list: vi.fn().mockReturnValue(of(collection([model]))),
      get: vi.fn().mockReturnValue(of(model)),
      download: vi.fn().mockReturnValue(of(new Blob())),
      upload: vi.fn(),
      update: vi.fn().mockReturnValue(of({ ...model, revision: 2 })),
      activate: vi.fn().mockReturnValue(of({ ...model, revision: 2, active: true })),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
    assets = { load: vi.fn().mockReturnValue(of(asset)), dispose: vi.fn() };
    facilities = {
      get: vi.fn().mockReturnValue(of(building)),
      listDescendants: vi.fn().mockReturnValue(
        of({
          member: [
            {
              ...building,
              id: 'room-without-outline',
              parentFacilityId: building.id,
              type: 'zone',
              name: 'Undrawn room',
            },
          ],
          totalItems: 1,
        }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        FacilityModelsStore,
        { provide: FacilityModelService, useValue: service },
        { provide: FacilityModelAssetService, useValue: assets },
        { provide: FacilityService, useValue: facilities },
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    store = TestBed.inject(FacilityModelsStore);
  });

  it('loads active model preview and includes undrawn descendants in association choices', () => {
    store.load(context);
    expect(store.selectedModel()?.id).toBe('model-1');
    expect(store.previewAsset()).toBe(asset);
    expect(store.listCallState().status).toBe('success');
    expect(store.previewCallState().status).toBe('success');
    expect(store.facilityOptions().map((option) => option.value)).toEqual([
      'building-1',
      'room-without-outline',
    ]);
    expect(facilities.listDescendants).toHaveBeenCalledWith('org-1', 'building-1', {
      includeArchived: true,
    });
  });

  it('cancels scope-specific reads and disposes the previous immutable asset', () => {
    store.load(context);
    const response = new Subject<HydraCollection<FacilityModelOutput>>();
    service.list.mockReturnValue(response);
    store.load({ organizationId: 'org-2', buildingId: 'building-2' });
    expect(assets.dispose).toHaveBeenCalledWith(asset);
    expect(store.previewAsset()).toBeNull();
    expect(store.selectedModelId()).toBeNull();
    store.load(context);
    response.next(collection([{ ...model, id: 'late-model' }]));
    expect(store.selectedModelId()).toBe('late-model');
    expect(store.scopeRevision()).toBe(3);
  });

  it('offers existing archived binding targets with their localized status while preserving their identifiers', () => {
    const archived: FacilityOutput = {
      ...building,
      id: 'archived-room',
      type: 'zone',
      name: 'Archive room',
      status: 'archived',
      parentFacilityId: building.id,
    };
    facilities.listDescendants.mockReturnValue(of({ member: [archived], totalItems: 1 }));
    service.list.mockReturnValue(
      of(collection([{ ...model, bindings: [{ nodeIndex: 0, facilityId: archived.id }] }])),
    );
    store.load(context);
    expect(facilities.listDescendants).toHaveBeenCalledWith('org-1', 'building-1', {
      includeArchived: true,
    });
    expect(store.facilityOptions().find((option) => option.value === archived.id)?.label).toBe(
      'Archive room (Archived)',
    );
    expect(store.selectedModel()?.bindings).toEqual([{ nodeIndex: 0, facilityId: archived.id }]);
    expect(store.settingsSavedToken()).toBe(0);
  });

  it('resolves undrawn non-leaf zones to their nearest floor and excludes nested building targets', () => {
    const floor: FacilityOutput = {
      ...building,
      id: 'floor-1',
      type: 'floor',
      parentFacilityId: building.id,
    };
    const zone: FacilityOutput = {
      ...building,
      id: 'zone-1',
      type: 'zone',
      parentFacilityId: floor.id,
    };
    const child: FacilityOutput = {
      ...zone,
      id: 'zone-child',
      hasChildren: false,
      parentFacilityId: zone.id,
    };
    const nested: FacilityOutput = {
      ...building,
      id: 'nested-building',
      parentFacilityId: floor.id,
    };
    const nestedFloor: FacilityOutput = {
      ...floor,
      id: 'nested-floor',
      parentFacilityId: nested.id,
    };
    const foreign: FacilityOutput = { ...zone, id: 'foreign-zone', organizationId: 'org-2' };
    const cyclic: FacilityOutput = { ...zone, id: 'cyclic-zone', parentFacilityId: 'cyclic-zone' };
    const descendants = [floor, zone, child, nested, nestedFloor, foreign, cyclic];
    facilities.listDescendants.mockReturnValue(
      of({ member: descendants, totalItems: descendants.length }),
    );
    store.load(context);

    expect(store.bindingFacilities()).toEqual([building, ...descendants]);
    expect(store.bindingFloorIds()).toEqual({
      [building.id]: null,
      [floor.id]: floor.id,
      [zone.id]: floor.id,
      [child.id]: floor.id,
    });
    expect(store.facilityOptions().map((option) => option.value)).toEqual([
      building.id,
      floor.id,
      zone.id,
      child.id,
    ]);
    expect(store.facilityOptions().find((option) => option.value === zone.id)?.type).toBe('zone');
  });

  it('clears binding hierarchy before a new building request resolves', () => {
    store.load(context);
    facilities.get.mockReturnValue(new Subject<FacilityOutput>());
    facilities.listDescendants.mockReturnValue(new Subject<HydraCollection<FacilityOutput>>());
    store.load({ organizationId: 'org-1', buildingId: 'building-2' });
    expect(store.bindingFacilities()).toEqual([]);
    expect(store.bindingFloorIds()).toEqual({});
    expect(store.facilityOptions()).toEqual([]);
  });

  it('requires the complete ancestry and retains the nearest floor in historical nested floors', () => {
    const floor: FacilityOutput = {
      ...building,
      id: 'floor-1',
      type: 'floor',
      parentFacilityId: building.id,
    };
    const nestedFloor: FacilityOutput = {
      ...floor,
      id: 'nested-floor',
      parentFacilityId: floor.id,
    };
    const zone: FacilityOutput = {
      ...building,
      id: 'zone-1',
      type: 'zone',
      parentFacilityId: nestedFloor.id,
    };
    const disconnected: FacilityOutput = {
      ...zone,
      id: 'disconnected',
      parentFacilityId: 'missing-parent',
    };
    const foreignParent: FacilityOutput = {
      ...zone,
      id: 'foreign-parent',
      organizationId: 'org-2',
      parentFacilityId: building.id,
    };
    const foreignDescendant: FacilityOutput = {
      ...zone,
      id: 'foreign-descendant',
      parentFacilityId: foreignParent.id,
    };
    const cycleA: FacilityOutput = { ...zone, id: 'cycle-a', parentFacilityId: 'cycle-b' };
    const cycleB: FacilityOutput = { ...zone, id: 'cycle-b', parentFacilityId: 'cycle-a' };
    const rootZone: FacilityOutput = { ...zone, id: 'root-zone', parentFacilityId: null };
    const descendants = [
      floor,
      nestedFloor,
      zone,
      disconnected,
      foreignParent,
      foreignDescendant,
      cycleA,
      cycleB,
      rootZone,
    ];
    facilities.listDescendants.mockReturnValue(
      of({ member: descendants, totalItems: descendants.length }),
    );
    store.load(context);

    expect(store.bindingFloorIds()).toEqual({
      [building.id]: null,
      [floor.id]: floor.id,
      [nestedFloor.id]: nestedFloor.id,
      [zone.id]: nestedFloor.id,
    });
    expect(store.facilityOptions().map((option) => option.value)).toEqual([
      building.id,
      floor.id,
      nestedFloor.id,
      zone.id,
    ]);
  });

  it('does not let an abandoned collection response settle an A-B-A context', () => {
    const abandoned = new Subject<HydraCollection<FacilityModelOutput>>();
    service.list.mockReturnValueOnce(abandoned);
    store.load(context);
    store.load({ organizationId: 'org-2', buildingId: 'building-2' });
    store.load(context);
    abandoned.next(collection([{ ...model, id: 'stale-model' }]));
    expect(store.selectedModel()?.id).toBe('model-1');
  });

  it('separates a failed GLB preview from model collection success', () => {
    assets.load.mockReturnValue(throwError(() => new Error('Invalid GLB bytes')));
    store.load(context);
    expect(store.listCallState().status).toBe('success');
    expect(store.previewCallState().status).toBe('error');
    expect(store.previewCallState().error?.message).toBe('Invalid GLB bytes');
    expect(store.previewAsset()).toBeNull();
  });

  it('selects duplicate-named nodes by immutable index and ignores foreign indices', () => {
    store.load(context);
    store.selectNode(1);
    expect(store.selectedNodeIndex()).toBe(1);
    store.selectNode(500);
    expect(store.selectedNodeIndex()).toBe(1);
  });

  it('clears imported node selection without clearing the immutable model or the settings draft token', () => {
    store.load(context);
    store.selectNode(1);
    store.clearNodeSelection();
    expect(store.selectedNodeIndex()).toBeNull();
    expect(store.selectedModelId()).toBe('model-1');
    expect(store.settingsSavedToken()).toBe(0);
  });

  it('retries a failed selected-model preview without discarding the selection or settings draft token', () => {
    assets.load.mockReturnValueOnce(throwError(() => new Error('Invalid GLB bytes')));
    store.load(context);
    expect(store.previewCallState().status).toBe('error');
    store.refresh();
    expect(store.previewCallState().status).toBe('success');
    expect(store.previewAsset()).toBe(asset);
    expect(store.selectedModelId()).toBe('model-1');
    expect(store.settingsSavedToken()).toBe(0);
  });

  it('keeps an active model with unavailable associations readable and prevents activation', () => {
    service.list.mockReturnValue(
      of(collection([{ ...model, bindingIssues: [{ nodeIndex: 1, code: 'target_unavailable' }] }])),
    );
    store.load({ organizationId: 'org-1', buildingId: 'building-1' });
    expect(store.selectedModel()?.active).toBe(true);
    expect(store.previewAsset()).not.toBeNull();
    store.activate('model-1');
    expect(service.activate).not.toHaveBeenCalled();
    store.update({ transform: model.transform });
    expect(service.update).toHaveBeenCalledWith('model-1', { transform: model.transform }, 1);
  });

  it('serializes settings writes and uses the confirmed revision for the next write', () => {
    store.load(context);
    const first = new Subject<FacilityModelOutput>();
    service.update.mockReturnValueOnce(first);
    store.update(settings);
    store.update({ ...settings, bindings: [{ nodeIndex: 1, facilityId: 'room-1' }] });
    expect(service.update).toHaveBeenCalledTimes(1);
    first.next({ ...model, revision: 5 });
    first.complete();
    expect(service.update).toHaveBeenLastCalledWith(
      'model-1',
      { ...settings, bindings: [{ nodeIndex: 1, facilityId: 'room-1' }] },
      5,
    );
    expect(store.settingsSavedToken()).toBe(2);
  });

  it('refreshes revision conflicts while retaining failure state and the draft reset token', () => {
    store.load(context);
    const error = {
      '@id': '',
      '@type': 'Error',
      type: 'about:blank',
      title: 'Conflict',
      detail: 'Model changed',
      status: 412,
    };
    service.update.mockReturnValue(throwError(() => error));
    service.list.mockReturnValue(of(collection([{ ...model, revision: 9 }])));
    store.update(settings);
    expect(store.updateCallState().status).toBe('error');
    expect(store.updateCallState().error?.code).toBe(412);
    expect(store.selectedModel()?.revision).toBe(9);
    expect(store.settingsSavedToken()).toBe(0);
  });

  it('does not settle an accepted write in a different building scope', () => {
    store.load(context);
    const write = new Subject<FacilityModelOutput>();
    service.update.mockReturnValue(write);
    store.update(settings);
    service.list.mockReturnValue(of(collection([])));
    store.load({ organizationId: 'org-2', buildingId: 'building-2' });
    write.next({ ...model, revision: 8 });
    write.complete();
    expect(store.modelEntities()).toEqual([]);
    expect(store.settingsSavedToken()).toBe(0);
    expect(store.updateCallState().status).toBe('idle');
  });

  it('rejects unsupported upload extensions before creating a resource', () => {
    store.load(context);
    store.upload({ file: new Blob(['not glb']), fileName: 'building.ifc' });
    expect(service.upload).not.toHaveBeenCalled();
    expect(store.uploadCallState().status).toBe('error');
  });

  it('completes already accepted queued writes in their original scope after building navigation', () => {
    store.load(context);
    const first = new Subject<FacilityModelOutput>();
    service.update.mockReturnValueOnce(first);
    store.update(settings);
    store.update({ ...settings, bindings: [{ nodeIndex: 1, facilityId: 'room-1' }] });
    service.list.mockReturnValue(of(collection([])));
    store.load({ organizationId: 'org-2', buildingId: 'building-2' });
    first.next({ ...model, revision: 5 });
    first.complete();
    expect(service.update).toHaveBeenCalledTimes(2);
    expect(service.update).toHaveBeenLastCalledWith(
      'model-1',
      { ...settings, bindings: [{ nodeIndex: 1, facilityId: 'room-1' }] },
      5,
    );
    expect(store.modelEntities()).toEqual([]);
    expect(store.settingsSavedToken()).toBe(0);
  });

  it('refreshes all model revisions after atomic activation', () => {
    store.load(context);
    store.activate('model-1');
    expect(service.activate).toHaveBeenCalledWith('model-1', 1);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('never starts model transport or browser parsing on the server', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FacilityModelsStore,
        { provide: FacilityModelService, useValue: service },
        { provide: FacilityModelAssetService, useValue: assets },
        { provide: FacilityService, useValue: facilities },
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const server = TestBed.inject(FacilityModelsStore);
    server.load(context);
    server.upload({ file: new Blob(), fileName: 'test.glb' });
    expect(service.list).not.toHaveBeenCalled();
    expect(assets.load).not.toHaveBeenCalled();
  });
});
