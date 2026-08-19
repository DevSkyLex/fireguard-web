import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MaintenanceScheduleService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  GenerateMaintenanceCampaignInput,
  MaintenanceCampaignOutput,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceSchedulesStore } from '../maintenance-schedules.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('MaintenanceSchedulesStore', () => {
  let store: InstanceType<typeof MaintenanceSchedulesStore>;
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    setIntervalOverride: ReturnType<typeof vi.fn>;
    generateCampaign: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  const orgIri = '/api/organizations/org-1';

  const schedule: MaintenanceScheduleOutput = {
    '@id': '/api/maintenance/schedules/schedule-1',
    '@type': 'MaintenanceSchedule',
    id: 'schedule-1',
    organization: orgIri,
    equipment: '/api/equipment/equipment-1',
    equipmentType: 'fire_extinguisher',
    dueStatus: 'due_soon',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  const collection: HydraCollection<MaintenanceScheduleOutput> = {
    '@id': '/api/maintenance/schedules',
    '@type': 'Collection',
    totalItems: 1,
    member: [schedule],
  };

  const campaignResult: MaintenanceCampaignOutput = {
    '@id': '',
    '@type': 'MaintenanceCampaignResult',
    interventionId: 'intervention-1',
    number: 42,
    workItemsCount: 7,
  };

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockReturnValue(of(collection)),
      setIntervalOverride: vi.fn().mockReturnValue(of({ ...schedule, intervalOverride: 'P6M' })),
      generateCampaign: vi.fn().mockReturnValue(of(campaignResult)),
    };
    mockDispatcher = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        MaintenanceSchedulesStore,
        { provide: MaintenanceScheduleService, useValue: mockService },
        { provide: Dispatcher, useValue: mockDispatcher },
      ],
    });

    store = TestBed.inject(MaintenanceSchedulesStore);
  });

  describe('load', () => {
    it('should populate the schedule collection on success', async () => {
      store.load({ organization: orgIri });
      await flushEffects();

      expect(mockService.list).toHaveBeenCalledWith({ organization: orgIri });
      expect(store.schedules()).toEqual([schedule]);
      expect(store.isEmpty()).toBe(false);
      expect(store.hasListError()).toBe(false);
    });

    it('should record a normalized error and dispatch listFailed on failure', async () => {
      mockService.list.mockReturnValue(throwError(() => ({ status: 500, title: 'Server error' })));

      store.load({ organization: orgIri });
      await flushEffects();

      expect(store.hasListError()).toBe(true);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Maintenance Schedules Store] listFailed' }),
      );
    });
  });

  describe('setIntervalOverride', () => {
    it('should replace exactly the patched entity from the response, not refetch', async () => {
      store.load({ organization: orgIri });
      await flushEffects();

      store.setIntervalOverride({ scheduleId: 'schedule-1', intervalOverride: 'P6M' });
      await flushEffects();

      expect(mockService.setIntervalOverride).toHaveBeenCalledWith('schedule-1', 'P6M');
      expect(mockService.list).toHaveBeenCalledTimes(1);
      expect(store.schedules()).toEqual([{ ...schedule, intervalOverride: 'P6M' }]);
      expect(store.isOverriding()).toBe(false);
    });

    it('should send an explicit null to clear the override', async () => {
      store.setIntervalOverride({ scheduleId: 'schedule-1', intervalOverride: null });
      await flushEffects();

      expect(mockService.setIntervalOverride).toHaveBeenCalledWith('schedule-1', null);
    });

    it('should dispatch overrideFailed on failure', async () => {
      mockService.setIntervalOverride.mockReturnValue(
        throwError(() => ({ status: 422, title: 'Unprocessable Entity' })),
      );

      store.setIntervalOverride({ scheduleId: 'schedule-1', intervalOverride: 'P1D' });
      await flushEffects();

      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Maintenance Schedules Store] overrideFailed' }),
      );
    });
  });

  describe('generateCampaign', () => {
    const input: GenerateMaintenanceCampaignInput = {
      organization: orgIri,
      name: 'Q1 round',
      dueBefore: '2026-06-30T00:00:00+00:00',
    };

    it('should record the created intervention summary and dispatch a success toast', async () => {
      store.generateCampaign(input);
      await flushEffects();

      expect(store.campaignResult()).toEqual(campaignResult);
      expect(store.campaignError()).toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Maintenance Schedules Store] campaignSucceeded' }),
      );
    });

    it('should surface a 422 no-match error through campaignError without dispatching an event', async () => {
      const apiError = {
        '@id': '',
        '@type': 'Error',
        status: 422,
        type: 'about:blank',
        title: 'Unprocessable Entity',
        detail: 'No due maintenance schedules match the given filters.',
      };
      mockService.generateCampaign.mockReturnValue(throwError(() => apiError));
      mockDispatcher.dispatch.mockClear();

      store.generateCampaign(input);
      await flushEffects();

      expect(store.campaignResult()).toBeNull();
      expect(store.campaignError()?.message).toBe(
        'No due maintenance schedules match the given filters.',
      );
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('resetOverrideOperation / resetCampaignOperation', () => {
    it('should return both operations to idle', async () => {
      store.generateCampaign({
        organization: orgIri,
        name: 'Q1 round',
        dueBefore: '2026-06-30T00:00:00+00:00',
      });
      await flushEffects();

      store.resetCampaignOperation();
      store.resetOverrideOperation();

      expect(store.campaignResult()).toBeNull();
      expect(store.isGeneratingCampaign()).toBe(false);
      expect(store.isOverriding()).toBe(false);
    });
  });
});
