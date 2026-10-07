import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { MaintenancePlanService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  MaintenancePlanOutput,
  MaintenancePlanPreviewOutput,
  MaintenancePlanGenerationOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenancePlansStore } from '../maintenance-plans.store';

describe('MaintenancePlansStore', () => {
  let store: InstanceType<typeof MaintenancePlansStore>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    engine: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    preview: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
    prepareLegacy: ReturnType<typeof vi.fn>;
    activateEngine: ReturnType<typeof vi.fn>;
  };
  const plan: MaintenancePlanOutput = {
    '@id': '/api/organizations/org-1/maintenance/plans/plan-1',
    '@type': 'MaintenancePlan',
    id: 'plan-1',
    organizationId: 'org-1',
    equipmentId: 'equipment-1',
    facilityId: 'facility-1',
    equipmentType: 'fire_extinguisher',
    name: 'Annual control',
    operationKind: 'control',
    interval: 'P1Y',
    cadenceMode: 'fixed',
    anchorAt: '2026-01-31T00:00:00Z',
    nextDueAt: '2027-01-31T00:00:00Z',
    active: false,
    legacyScheduleId: null,
    lastCompletedAt: null,
    openOccurrence: null,
  };
  const collection: HydraCollection<MaintenancePlanOutput> = {
    '@id': '/api/plans',
    '@type': 'Collection',
    member: [plan],
    totalItems: 1,
  };
  const work: MaintenancePlanGenerationOutput = {
    occurrenceId: 'occurrence-1',
    interventionId: 'work-1',
    number: 1,
    workItemsCount: 1,
    replayed: false,
  };

  beforeEach(() => {
    service = {
      list: vi.fn().mockReturnValue(of(collection)),
      engine: vi.fn().mockReturnValue(of({ mode: 'legacy', preparedCount: 0 })),
      create: vi.fn().mockReturnValue(of(plan)),
      update: vi.fn().mockReturnValue(of({ ...plan, active: true })),
      preview: vi.fn().mockReturnValue(of({ dates: ['2027-01-31', '2028-01-31', '2029-01-31'] })),
      generate: vi.fn().mockReturnValue(of(work)),
      prepareLegacy: vi.fn().mockReturnValue(of({ mode: 'legacy', preparedCount: 3 })),
      activateEngine: vi.fn().mockReturnValue(of({ mode: 'plans', preparedCount: 3 })),
    };
    TestBed.configureTestingModule({
      providers: [
        MaintenancePlansStore,
        { provide: MaintenancePlanService, useValue: service },
        {
          provide: EquipmentService,
          useValue: { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) },
        },
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
      ],
    });
    store = TestBed.inject(MaintenancePlansStore);
    store.setScope('org-1');
  });

  it('retains server totals and cancels an obsolete operation-kind query', () => {
    const obsolete = new Subject<HydraCollection<MaintenancePlanOutput>>();
    service.list.mockReturnValueOnce(obsolete);
    store.load({ organizationId: 'org-1', options: { params: { operationKind: 'control' } } });
    store.load({ organizationId: 'org-1', options: { params: { operationKind: 'maintenance' } } });
    obsolete.next({ ...collection, member: [{ ...plan, name: 'Obsolete' }], totalItems: 20 });
    expect(store.planEntities()[0].name).toBe('Annual control');
    expect(store.totalPlans()).toBe(1);
  });

  it('never lets the preview of an old selection replace the current calendar', () => {
    const obsolete = new Subject<MaintenancePlanPreviewOutput>();
    service.preview.mockReturnValueOnce(obsolete);
    store.preview(plan);
    store.preview({ ...plan, id: 'plan-2' });
    obsolete.next({ dates: ['1900-01-01'] });
    expect(store.selectedPlan()?.id).toBe('plan-2');
    expect(store.previewCallState().data?.dates).toEqual([
      '2027-01-31',
      '2028-01-31',
      '2029-01-31',
    ]);
  });

  it('keeps a rejected activation inline and does not claim completion', () => {
    service.update.mockReturnValue(
      throwError(() => ({ status: 422, title: 'Conflict', detail: 'Set the first due date.' })),
    );
    store.preview(plan);
    store.update({ organizationId: 'org-1', planId: 'plan-1', input: { active: true } });
    expect(store.updateCallState().status).toBe('error');
    expect(store.selectedPlan()?.active).toBe(false);
    expect(store.selectedPlan()?.lastCompletedAt).toBeNull();
  });

  it('does not cancel accepted work generation on a double click', () => {
    const accepted = new Subject<MaintenancePlanGenerationOutput>();
    service.generate.mockReturnValue(accepted);
    store.generate({ organizationId: 'org-1', planId: 'plan-1', retry: false });
    store.generate({ organizationId: 'org-1', planId: 'plan-1', retry: true });
    expect(service.generate).toHaveBeenCalledTimes(1);
    expect(store.generationCallState().status).toBe('pending');
    accepted.next(work);
    accepted.complete();
    expect(store.generationCallState().data?.occurrenceId).toBe('occurrence-1');
  });

  it('preserves an accepted write but ignores its late response after organization changes', () => {
    const accepted = new Subject<MaintenancePlanOutput>();
    service.update.mockReturnValue(accepted);
    store.update({ organizationId: 'org-1', planId: 'plan-1', input: { active: true } });
    store.setScope('org-2');
    accepted.next({ ...plan, active: true });
    expect(store.organizationId()).toBe('org-2');
    expect(store.planEntities()).toEqual([]);
    expect(store.updateCallState().status).toBe('idle');
  });

  it('keeps legacy authority after preparation or a failed switch', () => {
    store.loadEngine('org-1');
    store.migrate({ organizationId: 'org-1', activate: false });
    expect(store.engineCallState().data?.mode).toBe('legacy');
    service.activateEngine.mockReturnValue(
      throwError(() => ({ status: 409, title: 'Conflict', detail: 'Ambiguous historical work.' })),
    );
    store.migrate({ organizationId: 'org-1', activate: true });
    expect(store.engineCallState().data?.mode).toBe('legacy');
    expect(store.migrationCallState().status).toBe('error');
  });
});
