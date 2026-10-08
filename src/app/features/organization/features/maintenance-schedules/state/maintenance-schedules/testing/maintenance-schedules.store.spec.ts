import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
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
  const otherOrgIri = '/api/organizations/org-2';

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

  const otherSchedule: MaintenanceScheduleOutput = {
    ...schedule,
    '@id': '/api/maintenance/schedules/schedule-2',
    id: 'schedule-2',
    organization: otherOrgIri,
  };

  const otherCollection: HydraCollection<MaintenanceScheduleOutput> = {
    ...collection,
    member: [otherSchedule],
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

    it('clears the previous organization rows before the next list response', () => {
      store.load({ organization: orgIri });
      const response = new Subject<HydraCollection<MaintenanceScheduleOutput>>();
      mockService.list.mockReturnValue(response);

      store.load({ organization: otherOrgIri });

      expect(store.organization()).toBe(otherOrgIri);
      expect(store.isLoading()).toBe(true);
      expect(store.schedules()).toEqual([]);
      expect(store.totalSchedules()).toBe(0);

      response.next(otherCollection);
      response.complete();

      expect(store.schedules()).toEqual([otherSchedule]);
      expect(store.isLoading()).toBe(false);
    });

    it('retains current organization rows during a same-organization refresh', () => {
      store.load({ organization: orgIri });
      const response = new Subject<HydraCollection<MaintenanceScheduleOutput>>();
      mockService.list.mockReturnValue(response);

      store.load({ organization: orgIri });

      expect(store.isLoading()).toBe(true);
      expect(store.schedules()).toEqual([schedule]);
      expect(store.totalSchedules()).toBe(1);

      response.next({ ...collection, member: [{ ...schedule, dueStatus: 'overdue' }] });
      response.complete();

      expect(store.schedules()).toEqual([{ ...schedule, dueStatus: 'overdue' }]);
    });
  });

  describe('setIntervalOverride', () => {
    it('should replace exactly the patched entity from the response, not refetch', async () => {
      store.load({ organization: orgIri });
      await flushEffects();

      store.setIntervalOverride({
        organization: orgIri,
        scheduleId: 'schedule-1',
        intervalOverride: 'P6M',
      });
      await flushEffects();

      expect(mockService.setIntervalOverride).toHaveBeenCalledWith('schedule-1', 'P6M');
      expect(mockService.list).toHaveBeenCalledTimes(1);
      expect(store.schedules()).toEqual([{ ...schedule, intervalOverride: 'P6M' }]);
      expect(store.isOverriding()).toBe(false);
    });

    it('should send an explicit null to clear the override', async () => {
      store.setIntervalOverride({
        organization: orgIri,
        scheduleId: 'schedule-1',
        intervalOverride: null,
      });
      await flushEffects();

      expect(mockService.setIntervalOverride).toHaveBeenCalledWith('schedule-1', null);
    });

    it('should dispatch overrideFailed on failure', async () => {
      mockService.setIntervalOverride.mockReturnValue(
        throwError(() => ({ status: 422, title: 'Unprocessable Entity' })),
      );

      store.setIntervalOverride({
        organization: orgIri,
        scheduleId: 'schedule-1',
        intervalOverride: 'P1D',
      });
      await flushEffects();

      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Maintenance Schedules Store] overrideFailed' }),
      );
    });

    it.each([false, true])(
      'ignores a late override after switching organization, including a return visit (%s)',
      (returnToOriginal) => {
        const response = new Subject<MaintenanceScheduleOutput>();
        mockService.setIntervalOverride.mockReturnValue(response);
        store.load({ organization: orgIri });
        store.setIntervalOverride({
          organization: orgIri,
          scheduleId: schedule.id,
          intervalOverride: 'P6M',
        });
        mockService.list.mockReturnValue(of(otherCollection));
        store.load({ organization: otherOrgIri });

        if (returnToOriginal) {
          mockService.list.mockReturnValue(of(collection));
          store.load({ organization: orgIri });
        }

        expect(response.observed).toBe(true);
        response.next({ ...schedule, intervalOverride: 'P6M' });
        response.complete();

        expect(store.schedules()).toEqual(returnToOriginal ? [schedule] : [otherSchedule]);
        expect(store.overrideCallState().status).toBe('idle');
        expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
      },
    );

    it('ignores a late override failure after switching organization', () => {
      const response = new Subject<MaintenanceScheduleOutput>();
      mockService.setIntervalOverride.mockReturnValue(response);
      store.load({ organization: orgIri });
      store.setIntervalOverride({
        organization: orgIri,
        scheduleId: schedule.id,
        intervalOverride: 'P6M',
      });
      mockService.list.mockReturnValue(of(otherCollection));
      store.load({ organization: otherOrgIri });

      response.error({ status: 422, title: 'Unprocessable Entity' });

      expect(store.schedules()).toEqual([otherSchedule]);
      expect(store.overrideCallState().status).toBe('idle');
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('rejects an override command for the previous organization', () => {
      store.setOrganization(otherOrgIri);

      store.setIntervalOverride({
        organization: orgIri,
        scheduleId: schedule.id,
        intervalOverride: 'P6M',
      });

      expect(mockService.setIntervalOverride).not.toHaveBeenCalled();
      expect(store.overrideCallState().status).toBe('idle');
      expect(store.schedules()).toEqual([]);
    });

    it.each([true, false])(
      'admits the new organization override while an accepted write remains in flight (old first: %s)',
      (oldFirst) => {
        const oldResponse = new Subject<MaintenanceScheduleOutput>();
        const currentResponse = new Subject<MaintenanceScheduleOutput>();
        const currentSchedule = { ...otherSchedule, intervalOverride: 'P3M' };
        mockService.setIntervalOverride
          .mockReturnValueOnce(oldResponse)
          .mockReturnValueOnce(currentResponse);
        store.load({ organization: orgIri });
        store.setIntervalOverride({
          organization: orgIri,
          scheduleId: schedule.id,
          intervalOverride: 'P6M',
        });
        mockService.list.mockReturnValue(of(otherCollection));
        store.load({ organization: otherOrgIri });
        expect(store.isOverriding()).toBe(false);

        store.setIntervalOverride({
          organization: otherOrgIri,
          scheduleId: otherSchedule.id,
          intervalOverride: 'P3M',
        });

        expect(mockService.setIntervalOverride).toHaveBeenCalledTimes(2);
        expect(mockService.setIntervalOverride).toHaveBeenLastCalledWith(otherSchedule.id, 'P3M');
        expect(oldResponse.observed).toBe(true);
        expect(currentResponse.observed).toBe(true);
        expect(store.isOverriding()).toBe(true);
        const finishOld = (): void => {
          oldResponse.next({ ...schedule, intervalOverride: 'P6M' });
          oldResponse.complete();
        };

        if (oldFirst) {
          finishOld();
          expect(store.isOverriding()).toBe(true);
          expect(store.schedules()).toEqual([otherSchedule]);
        }
        currentResponse.next(currentSchedule);
        currentResponse.complete();
        if (!oldFirst) finishOld();

        expect(store.schedules()).toEqual([currentSchedule]);
        expect(store.overrideCallState().data).toEqual(currentSchedule);
        expect(store.overrideCallState().status).toBe('success');
        expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
      },
    );

    it.each(['success', 'error'])(
      'blocks override duplicates across a return visit until the accepted write settles (%s)',
      (outcome) => {
        const response = new Subject<MaintenanceScheduleOutput>();
        const command = {
          organization: orgIri,
          scheduleId: schedule.id,
          intervalOverride: 'P6M',
        };
        mockService.setIntervalOverride.mockReturnValueOnce(response);
        store.load({ organization: orgIri });
        store.setIntervalOverride(command);
        store.setIntervalOverride(command);
        store.setOrganization(otherOrgIri);
        store.load({ organization: orgIri });
        store.resetOverrideOperation();
        store.setIntervalOverride(command);

        expect(mockService.setIntervalOverride).toHaveBeenCalledTimes(1);
        expect(response.observed).toBe(true);
        expect(store.isOverriding()).toBe(true);

        if (outcome === 'success') {
          response.next({ ...schedule, intervalOverride: 'P6M' });
          response.complete();
        } else {
          response.error({ status: 422, title: 'Unprocessable Entity' });
        }

        expect(store.schedules()).toEqual([schedule]);
        expect(store.overrideCallState().status).toBe('idle');
        expect(mockDispatcher.dispatch).not.toHaveBeenCalled();

        store.setIntervalOverride(command);

        expect(mockService.setIntervalOverride).toHaveBeenCalledTimes(2);
        expect(store.schedules()).toEqual([{ ...schedule, intervalOverride: 'P6M' }]);
        expect(store.overrideCallState().status).toBe('success');
      },
    );
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
      expect(store.campaignResultOrganization()).toBe(orgIri);
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

    it.each([false, true])(
      'ignores a late campaign after switching organization, including a return visit (%s)',
      (returnToOriginal) => {
        const response = new Subject<MaintenanceCampaignOutput>();
        mockService.generateCampaign.mockReturnValue(response);
        store.load({ organization: orgIri });
        store.generateCampaign(input);
        mockService.list.mockReturnValue(of(otherCollection));
        store.load({ organization: otherOrgIri });

        if (returnToOriginal) {
          mockService.list.mockReturnValue(of(collection));
          store.load({ organization: orgIri });
        }

        expect(response.observed).toBe(true);
        response.next(campaignResult);
        response.complete();

        expect(store.schedules()).toEqual(returnToOriginal ? [schedule] : [otherSchedule]);
        expect(store.campaignResult()).toBeNull();
        expect(store.campaignResultOrganization()).toBeNull();
        expect(store.campaignCallState().status).toBe('idle');
        expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
      },
    );

    it('ignores a late campaign failure after switching organization', () => {
      const response = new Subject<MaintenanceCampaignOutput>();
      mockService.generateCampaign.mockReturnValue(response);
      store.generateCampaign(input);
      store.setOrganization(otherOrgIri);

      response.error({ status: 422, title: 'Unprocessable Entity' });

      expect(store.campaignCallState().status).toBe('idle');
      expect(store.campaignError()).toBeNull();
      expect(store.campaignResultOrganization()).toBeNull();
    });

    it('rejects a campaign command for the previous organization', () => {
      store.setOrganization(otherOrgIri);

      store.generateCampaign(input);

      expect(mockService.generateCampaign).not.toHaveBeenCalled();
      expect(store.campaignCallState().status).toBe('idle');
      expect(store.campaignResultOrganization()).toBeNull();
    });

    it.each([true, false])(
      'admits the new organization campaign while an accepted write remains in flight (old first: %s)',
      (oldFirst) => {
        const oldResponse = new Subject<MaintenanceCampaignOutput>();
        const currentResponse = new Subject<MaintenanceCampaignOutput>();
        const currentInput = { ...input, organization: otherOrgIri };
        const currentResult = { ...campaignResult, interventionId: 'intervention-2', number: 43 };
        mockService.generateCampaign
          .mockReturnValueOnce(oldResponse)
          .mockReturnValueOnce(currentResponse);
        store.generateCampaign(input);
        store.setOrganization(otherOrgIri);
        expect(store.isGeneratingCampaign()).toBe(false);

        store.generateCampaign(currentInput);

        expect(mockService.generateCampaign).toHaveBeenCalledTimes(2);
        expect(mockService.generateCampaign).toHaveBeenLastCalledWith(currentInput);
        expect(oldResponse.observed).toBe(true);
        expect(currentResponse.observed).toBe(true);
        expect(store.isGeneratingCampaign()).toBe(true);
        const finishOld = (): void => {
          oldResponse.next(campaignResult);
          oldResponse.complete();
        };

        if (oldFirst) {
          finishOld();
          expect(store.isGeneratingCampaign()).toBe(true);
          expect(store.campaignResult()).toBeNull();
          expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
        }
        currentResponse.next(currentResult);
        currentResponse.complete();
        if (!oldFirst) finishOld();

        expect(store.campaignResult()).toEqual(currentResult);
        expect(store.campaignResultOrganization()).toBe(otherOrgIri);
        expect(store.campaignCallState().status).toBe('success');
        expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
      },
    );

    it.each(['success', 'error'])(
      'blocks campaign duplicates across a return visit until the accepted write settles (%s)',
      (outcome) => {
        const response = new Subject<MaintenanceCampaignOutput>();
        mockService.generateCampaign.mockReturnValueOnce(response);
        store.generateCampaign(input);
        store.generateCampaign(input);
        store.setOrganization(otherOrgIri);
        store.setOrganization(orgIri);
        store.resetCampaignOperation();
        store.generateCampaign(input);

        expect(mockService.generateCampaign).toHaveBeenCalledTimes(1);
        expect(response.observed).toBe(true);
        expect(store.isGeneratingCampaign()).toBe(true);

        if (outcome === 'success') {
          response.next(campaignResult);
          response.complete();
        } else {
          response.error({ status: 422, title: 'Unprocessable Entity' });
        }

        expect(store.campaignCallState().status).toBe('idle');
        expect(store.campaignResult()).toBeNull();
        expect(store.campaignResultOrganization()).toBeNull();
        expect(mockDispatcher.dispatch).not.toHaveBeenCalled();

        store.generateCampaign(input);

        expect(mockService.generateCampaign).toHaveBeenCalledTimes(2);
        expect(store.campaignResult()).toEqual(campaignResult);
        expect(store.campaignResultOrganization()).toBe(orgIri);
        expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('resetOverrideOperation / resetCampaignOperation', () => {
    it('keeps an accepted override pending through feedback reset until the request completes', () => {
      const response = new Subject<MaintenanceScheduleOutput>();
      mockService.setIntervalOverride.mockReturnValue(response);
      store.setIntervalOverride({
        organization: orgIri,
        scheduleId: schedule.id,
        intervalOverride: 'P6M',
      });
      store.resetOverrideOperation();
      expect(store.isOverriding()).toBe(true);

      response.next({ ...schedule, intervalOverride: 'P6M' });
      store.resetOverrideOperation();
      expect(store.isOverriding()).toBe(true);
      response.complete();

      expect(store.overrideCallState().status).toBe('idle');
      expect(store.schedules()).toEqual([{ ...schedule, intervalOverride: 'P6M' }]);
    });

    it('keeps an accepted campaign pending through feedback reset until the request completes', () => {
      const response = new Subject<MaintenanceCampaignOutput>();
      mockService.generateCampaign.mockReturnValue(response);
      store.generateCampaign({
        organization: orgIri,
        name: 'Q1 round',
        dueBefore: '2026-06-30T00:00:00+00:00',
      });
      store.resetCampaignOperation();
      expect(store.isGeneratingCampaign()).toBe(true);

      response.next(campaignResult);
      store.resetCampaignOperation();
      expect(store.isGeneratingCampaign()).toBe(true);
      response.complete();

      expect(store.campaignCallState().status).toBe('idle');
      expect(store.campaignResult()).toBeNull();
      expect(store.campaignResultOrganization()).toBeNull();
    });

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
      expect(store.campaignResultOrganization()).toBeNull();
      expect(store.isGeneratingCampaign()).toBe(false);
      expect(store.isOverriding()).toBe(false);
    });
  });

  it('clears rows and all operation results on an organization change', () => {
    store.load({ organization: orgIri });
    store.setIntervalOverride({
      organization: orgIri,
      scheduleId: schedule.id,
      intervalOverride: 'P6M',
    });
    store.generateCampaign({
      organization: orgIri,
      name: 'Q1 round',
      dueBefore: '2026-06-30T00:00:00+00:00',
    });

    store.setOrganization(otherOrgIri);

    expect(store.organization()).toBe(otherOrgIri);
    expect(store.schedules()).toEqual([]);
    expect(store.totalSchedules()).toBe(0);
    expect(store.listCallState().status).toBe('idle');
    expect(store.overrideCallState().status).toBe('idle');
    expect(store.campaignCallState().status).toBe('idle');
    expect(store.campaignResult()).toBeNull();
    expect(store.campaignResultOrganization()).toBeNull();
  });
});
