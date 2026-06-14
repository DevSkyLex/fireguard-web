import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { MissionService } from '@features/organization/features/missions/data-access';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { MissionStore } from '../mission.store';

const mission = { id: 'mission-1', name: 'Site visit' } as MissionOutput;
const collection: HydraCollection<MissionOutput> = {
  '@id': '/api/missions',
  '@type': 'Collection',
  totalItems: 1,
  member: [mission],
};

describe('MissionStore', () => {
  let store: InstanceType<typeof MissionStore>;
  let mockMissionService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMissionService = {
      list: vi.fn().mockReturnValue(of(collection)),
      create: vi.fn().mockReturnValue(of(mission)),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MissionStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: MissionService, useValue: mockMissionService },
      ],
    });

    store = TestBed.inject(MissionStore);
  });

  it('should load missions for an organization', () => {
    store.load({ organizationId: 'org-1' });

    expect(mockMissionService.list).toHaveBeenCalledWith('org-1');
    expect(store.missionList()).toEqual([mission]);
    expect(store.totalMissions()).toBe(1);
    expect(store.isLoadingMissions()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('should create a mission and expose it for navigation handoff', () => {
    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(mockMissionService.create).toHaveBeenCalledWith('org-1', 'Site visit');
    expect(store.createdMission()).toEqual(mission);
    expect(store.missionList()).toEqual([mission]);
    expect(store.totalMissions()).toBe(1);
  });

  it('should clear the created mission handoff', () => {
    store.create({ organizationId: 'org-1', name: 'Site visit' });
    store.clearCreatedMission();

    expect(store.createdMission()).toBeNull();
  });

  it('should dispatch a failure event when loading fails', () => {
    mockMissionService.list.mockReturnValue(throwError(() => new Error('network')));

    store.load({ organizationId: 'org-1' });

    expect(store.listCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should dispatch a failure event when creation fails', () => {
    mockMissionService.create.mockReturnValue(throwError(() => new Error('network')));

    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(store.createCallState().status).toBe('error');
    expect(store.createdMission()).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
