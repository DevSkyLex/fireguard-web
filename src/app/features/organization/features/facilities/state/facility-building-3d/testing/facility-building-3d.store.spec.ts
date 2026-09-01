import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityBuildingModelOutput } from '@features/organization/features/facilities/models';
import {
  FacilityBuilding3dStore,
  type FacilityBuilding3dStoreType,
} from '../facility-building-3d.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

const apiError = (status: number, detail: string): ApiError => ({
  '@id': '',
  '@type': 'Error',
  status,
  type: 'about:blank',
  title: 'Error',
  detail,
});

const buildingModel: FacilityBuildingModelOutput = {
  buildingId: 'building-1',
  buildingName: 'HQ',
  floors: [
    {
      facilityId: 'floor-1',
      name: 'Ground floor',
      levelIndex: 0,
      status: 'active',
      plan: null,
      outline: null,
      rooms: [
        {
          facilityId: 'room-1',
          name: 'Lobby',
          type: 'zone',
          status: 'active',
          points: [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        },
      ],
    },
    {
      facilityId: 'floor-2',
      name: 'First floor',
      levelIndex: 1,
      status: 'active',
      plan: null,
      outline: null,
      rooms: [],
    },
  ],
};

describe('FacilityBuilding3dStore', () => {
  let store: FacilityBuilding3dStoreType;
  let mockFacilityService: { getBuildingModel: ReturnType<typeof vi.fn> };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockFacilityService = {
      getBuildingModel: vi.fn().mockReturnValue(of(buildingModel)),
    };
    mockDispatcher = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FacilityBuilding3dStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: FacilityService, useValue: mockFacilityService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(FacilityBuilding3dStore);
  });

  it('should transition from idle to pending to success on loadModel', async () => {
    const response$ = new Subject<FacilityBuildingModelOutput>();
    mockFacilityService.getBuildingModel.mockReturnValue(response$);

    expect(store.isQueryLoading()).toBe(false);

    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    expect(store.isQueryLoading()).toBe(true);

    response$.next(buildingModel);
    response$.complete();
    await flushEffects();

    expect(mockFacilityService.getBuildingModel).toHaveBeenCalledWith('org-1', 'building-1');
    expect(store.isQueryLoaded()).toBe(true);
    expect(store.floors()).toEqual(buildingModel.floors);
  });

  it('should transition to error and dispatch a failure event on loadModel failure', async () => {
    mockFacilityService.getBuildingModel.mockReturnValue(throwError(() => apiError(500, 'boom')));

    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    expect(store.queryHasError()).toBe(true);
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should not call the service on the server platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FacilityBuilding3dStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: FacilityService, useValue: mockFacilityService },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const serverStore = TestBed.inject(FacilityBuilding3dStore);

    serverStore.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    expect(mockFacilityService.getBuildingModel).not.toHaveBeenCalled();
    expect(serverStore.isQueryLoading()).toBe(false);
  });

  it("should select the model's first floor by default once loaded, so the room panel is reachable without a prior pointer selection", async () => {
    expect(store.selectedFloorId()).toBeNull();

    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    expect(store.selectedFloorId()).toBe('floor-1');
    expect(store.selectedRoomId()).toBeNull();
  });

  it('should not override an already-selected floor on a subsequent load', async () => {
    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    store.selectFloor('floor-2');
    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    expect(store.selectedFloorId()).toBe('floor-2');
  });

  it('should report isEmpty once loaded with no floors', async () => {
    mockFacilityService.getBuildingModel.mockReturnValue(
      of({ buildingId: 'building-2', buildingName: 'Empty', floors: [] }),
    );

    store.loadModel({ organizationId: 'org-1', facilityId: 'building-2' });
    await flushEffects();

    expect(store.isEmpty()).toBe(true);
  });

  it('should select a room and resolve its owning floor', async () => {
    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    store.selectRoom('room-1');

    expect(store.selectedRoom()?.facilityId).toBe('room-1');
    expect(store.selectedFloor()?.facilityId).toBe('floor-1');
  });

  it('should clear the room selection without touching the floor selection', async () => {
    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    store.selectRoom('room-1');
    store.selectRoom(null);

    expect(store.selectedRoom()).toBeNull();
    expect(store.selectedFloor()?.facilityId).toBe('floor-1');
  });

  it('should toggle floor isolation on and off', () => {
    store.toggleIsolation('floor-1');
    expect(store.isolatedFloorId()).toBe('floor-1');

    store.toggleIsolation('floor-1');
    expect(store.isolatedFloorId()).toBeNull();

    store.toggleIsolation('floor-2');
    expect(store.isolatedFloorId()).toBe('floor-2');
  });

  it('should toggle the exploded layout', () => {
    expect(store.exploded()).toBe(false);

    store.toggleExploded();
    expect(store.exploded()).toBe(true);

    store.toggleExploded();
    expect(store.exploded()).toBe(false);
  });

  it('should increment the camera reset token on each call', () => {
    expect(store.cameraResetToken()).toBe(0);

    store.resetCamera();
    expect(store.cameraResetToken()).toBe(1);

    store.resetCamera();
    expect(store.cameraResetToken()).toBe(2);
  });

  it('should clear the selection without touching isolation or the exploded layout', async () => {
    store.loadModel({ organizationId: 'org-1', facilityId: 'building-1' });
    await flushEffects();

    store.selectRoom('room-1');
    store.toggleIsolation('floor-1');
    store.toggleExploded();

    store.clearSelection();

    expect(store.selectedFloorId()).toBeNull();
    expect(store.selectedRoomId()).toBeNull();
    expect(store.isolatedFloorId()).toBe('floor-1');
    expect(store.exploded()).toBe(true);
  });
});
