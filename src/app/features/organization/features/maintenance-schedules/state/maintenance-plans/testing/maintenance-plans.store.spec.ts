import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { MaintenancePlanService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  CreateMaintenancePlanInput,
  MaintenanceEngineOutput,
  MaintenancePlanOutput,
  MaintenancePlanPreviewOutput,
  MaintenancePlanGenerationOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { maintenancePlansStoreEvents } from '../events/events';
import { MaintenancePlansStore } from '../maintenance-plans.store';

const problem = (detail: string): HttpErrorResponse =>
  new HttpErrorResponse({ status: 422, error: { title: 'Conflict', detail } });

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
  let equipmentService: { list: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;
  const organizationId = 'c40bc4a3-c8c6-4177-aaef-fc406b78ee64';
  const otherOrganizationId = 'eaf9bc58-a98c-4552-8122-277689746b0f';
  const planId = '94b24e9b-9ebf-4462-8a2f-12b369c79481';
  const equipmentId = '34575c2d-5632-4f39-af26-d843028d6d77';
  const preparedPlan = (overrides: Partial<MaintenancePlanOutput> = {}): MaintenancePlanOutput => ({
    ...plan,
    '@id': `/api/organizations/${organizationId}/maintenance/plans/${planId}`,
    id: planId,
    organizationId,
    equipmentId,
    ...overrides,
  });
  const input: CreateMaintenancePlanInput = {
    equipmentId,
    name: 'Monthly equipment service',
    operationKind: 'maintenance',
    interval: 'P1M',
    anchorOn: '2027-01-31',
    nextDueOn: '2027-02-28',
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
    equipmentService = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    dispatch = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        MaintenancePlansStore,
        { provide: MaintenancePlanService, useValue: service },
        {
          provide: EquipmentService,
          useValue: equipmentService,
        },
        { provide: Dispatcher, useValue: { dispatch } },
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

  it('prepares inactive work, prevents duplicates and announces the originating plan', () => {
    const accepted = new Subject<MaintenancePlanOutput>();
    const result = preparedPlan();
    service.create.mockReturnValue(accepted);
    store.setScope(organizationId);
    store.create({ organizationId, input });
    store.create({ organizationId, input });
    store.resetCreate();
    expect(service.create).toHaveBeenCalledExactlyOnceWith(organizationId, input);
    expect(store.createCallState().status).toBe('pending');
    expect(store.commandPending()).toBe(true);
    expect(store.selectedPlan()).toBeNull();
    expect(service.update).not.toHaveBeenCalled();
    accepted.next(result);
    accepted.complete();
    expect(store.createCallState().status).toBe('success');
    expect(store.commandPending()).toBe(false);
    expect(store.selectedPlan()).toEqual(result);
    expect(store.selectedPlan()?.active).toBe(false);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      maintenancePlansStoreEvents.planPrepared({ organizationId, plan: result }),
    );
    store.resetCreate();
    expect(store.createCallState().status).toBe('idle');
    expect(store.selectedPlan()).toEqual(result);
  });

  it('preserves preparation errors inline and allows a corrected submission', () => {
    store.setScope(organizationId);
    service.create.mockReturnValueOnce(throwError(() => problem('Choose a first deadline.')));
    store.create({ organizationId, input });
    expect(store.createCallState().status).toBe('error');
    expect(store.createCallState().error?.message).toBe('Choose a first deadline.');
    expect(store.commandPending()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    service.create.mockReturnValue(of(preparedPlan()));
    store.create({ organizationId, input });
    expect(store.createCallState().status).toBe('success');
  });

  it('lets accepted preparation finish after navigation without replacing the new organization', () => {
    const accepted = new Subject<MaintenancePlanOutput>();
    service.create.mockReturnValue(accepted);
    store.setScope(organizationId);
    store.create({ organizationId, input });
    store.setScope(otherOrganizationId);
    accepted.next(preparedPlan());
    accepted.complete();
    expect(store.createCallState().status).toBe('idle');
    expect(store.selectedPlan()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('ignores rejected preparation from a previous organization', () => {
    const accepted = new Subject<MaintenancePlanOutput>();
    service.create.mockReturnValue(accepted);
    store.setScope(organizationId);
    store.create({ organizationId, input });
    store.setScope(otherOrganizationId);
    accepted.error(problem('Previous organization conflict.'));
    expect(store.createCallState().status).toBe('idle');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('retains the selected operation during refreshes and replaces it with the server version', () => {
    const selected = preparedPlan();
    store.setScope(organizationId);
    store.preview(selected);
    service.list.mockReturnValueOnce(of({ ...collection, member: [], totalItems: 0 }));
    store.load({ organizationId });
    expect(store.selectedPlan()).toEqual(selected);
    const renamed = preparedPlan({ name: 'Server-confirmed name' });
    service.list.mockReturnValueOnce(of({ ...collection, member: [renamed], totalItems: 73 }));
    store.load({ organizationId });
    store.setScope(organizationId);
    expect(store.selectedPlan()).toEqual(renamed);
    expect(store.planEntities()).toEqual([renamed]);
    expect(store.totalPlans()).toBe(73);
  });

  it('retains the current list on rejection and ignores a stale list rejection', () => {
    store.load({ organizationId: 'org-1' });
    service.list.mockReturnValueOnce(throwError(() => problem('Plan search unavailable.')));
    store.load({ organizationId: 'org-1' });
    expect(store.listCallState().status).toBe('error');
    expect(store.listCallState().error?.message).toBe('Plan search unavailable.');
    expect(store.planEntities()).toEqual([plan]);
    const stale = new Subject<HydraCollection<MaintenancePlanOutput>>();
    service.list.mockReturnValue(stale);
    store.load({ organizationId: 'org-1' });
    store.setScope(otherOrganizationId);
    stale.error(problem('Old search rejection.'));
    expect(store.listCallState().status).toBe('idle');
    expect(store.planEntities()).toEqual([]);
  });

  it.each(['success', 'error'] as const)('ignores an old engine %s after navigation', (outcome) => {
    const stale = new Subject<MaintenanceEngineOutput>();
    service.engine.mockReturnValue(stale);
    store.loadEngine('org-1');
    expect(store.engineCallState().status).toBe('pending');
    store.setScope(otherOrganizationId);
    if (outcome === 'success') stale.next({ mode: 'plans', preparedCount: 3 });
    else stale.error(problem('Previous engine unavailable.'));
    expect(store.engineCallState().status).toBe('idle');
  });

  it('keeps confirmed engine data during reload and preserves it with a normalized read error', () => {
    store.loadEngine('org-1');
    const refreshed = new Subject<MaintenanceEngineOutput>();
    service.engine.mockReturnValue(refreshed);
    store.loadEngine('org-1');
    expect(store.engineCallState().status).toBe('pending');
    expect(store.engineCallState().data?.mode).toBe('legacy');
    refreshed.error(problem('Engine temporarily unavailable.'));
    expect(store.engineCallState().status).toBe('error');
    expect(store.engineCallState().error?.message).toBe('Engine temporarily unavailable.');
    expect(store.engineCallState().data?.mode).toBe('legacy');
  });

  it('loads bounded equipment choices and keeps the last authorized page on a recoverable failure', () => {
    store.setScope(organizationId);
    equipmentService.list.mockReturnValueOnce(of({ member: [], totalItems: 71 }));
    store.loadEquipment({ organizationId, search: 'Extinguisher', page: 2 });
    expect(equipmentService.list).toHaveBeenCalledWith(organizationId, {
      search: 'Extinguisher',
      page: 2,
      itemsPerPage: 30,
    });
    expect(store.equipmentCallState().status).toBe('success');
    expect(store.totalEquipment()).toBe(71);
    const read = new Subject<HydraCollection<EquipmentOutput>>();
    equipmentService.list.mockReturnValue(read);
    store.loadEquipment({ organizationId, search: 'Detector', page: 1 });
    expect(store.equipmentCallState().status).toBe('pending');
    expect(store.equipmentCallState().data).toEqual([]);
    read.error(problem('Equipment unavailable.'));
    expect(store.equipmentCallState().error?.message).toBe('Equipment unavailable.');
    expect(store.totalEquipment()).toBe(71);
  });

  it.each(['success', 'error'] as const)('ignores obsolete equipment option %s', (outcome) => {
    const stale = new Subject<HydraCollection<EquipmentOutput>>();
    equipmentService.list.mockReturnValue(stale);
    store.loadEquipment({ organizationId: 'org-1', search: '', page: 1 });
    store.setScope(otherOrganizationId);
    if (outcome === 'success') stale.next({ ...collection, member: [], totalItems: 91 });
    else stale.error(problem('Previous equipment rejection.'));
    expect(store.equipmentCallState().status).toBe('idle');
    expect(store.totalEquipment()).toBe(0);
  });

  it('allows a rejected preview to retry and explicitly clears a closed selection', () => {
    service.preview.mockReturnValueOnce(throwError(() => problem('Calendar unavailable.')));
    store.preview(plan);
    expect(store.previewCallState().status).toBe('error');
    expect(store.previewCallState().error?.message).toBe('Calendar unavailable.');
    store.preview(plan);
    expect(store.previewCallState().status).toBe('success');
    store.preview(null);
    expect(store.selectedPlan()).toBeNull();
    expect(store.previewCallState().status).toBe('idle');
    expect(service.preview).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'error'] as const)(
    'ignores a selected plan preview %s after changing scope',
    (outcome) => {
      const stale = new Subject<MaintenancePlanPreviewOutput>();
      service.preview.mockReturnValue(stale);
      store.preview(plan);
      store.setScope(otherOrganizationId);
      if (outcome === 'success') stale.next({ dates: ['1900-01-01'] });
      else stale.error(problem('Previous calendar rejection.'));
      expect(store.selectedPlan()).toBeNull();
      expect(store.previewCallState().status).toBe('idle');
    },
  );

  it.each([true, false])('replaces only a confirmed plan when selection matches: %s', (matches) => {
    const selected = preparedPlan({
      id: matches ? planId : '1bd9ce03-ecee-4989-8253-0cd3f3327a91',
    });
    const changed = preparedPlan({ active: true });
    store.setScope(organizationId);
    store.preview(selected);
    service.update.mockReturnValue(of(changed));
    store.update({ organizationId, planId, input: { active: true } });
    expect(store.planEntities()).toEqual([changed]);
    expect(store.selectedPlan()).toEqual(matches ? changed : selected);
    expect(store.updateCallState().data).toEqual(changed);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      maintenancePlansStoreEvents.planChanged({ organizationId }),
    );
  });

  it('ignores a stale update rejection without emitting a confirmed change', () => {
    const accepted = new Subject<MaintenancePlanOutput>();
    service.update.mockReturnValue(accepted);
    store.setScope(organizationId);
    store.update({ organizationId, planId, input: { name: 'Renamed' } });
    store.setScope(otherOrganizationId);
    accepted.error(problem('Old update conflict.'));
    expect(store.updateCallState().status).toBe('idle');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('forwards ordinary recovery and explicit retry without marking the operation completed', () => {
    store.setScope(organizationId);
    store.preview(preparedPlan({ active: true }));
    store.generate({ organizationId, planId, retry: false });
    expect(service.generate).toHaveBeenLastCalledWith(organizationId, planId, false);
    store.generate({ organizationId, planId, retry: true });
    expect(service.generate).toHaveBeenLastCalledWith(organizationId, planId, true);
    expect(store.selectedPlan()?.lastCompletedAt).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(
      maintenancePlansStoreEvents.planChanged({ organizationId }),
    );
  });

  it('exposes generation errors inline and permits a later retry', () => {
    store.setScope(organizationId);
    service.generate.mockReturnValueOnce(throwError(() => problem('Operation is not due.')));
    store.generate({ organizationId, planId, retry: false });
    expect(store.generationCallState().status).toBe('error');
    expect(store.generationCallState().error?.message).toBe('Operation is not due.');
    expect(store.commandPending()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    store.generate({ organizationId, planId, retry: false });
    expect(store.generationCallState().status).toBe('success');
  });

  it.each(['success', 'error'] as const)(
    'preserves accepted generation and ignores its stale %s',
    (outcome) => {
      const accepted = new Subject<MaintenancePlanGenerationOutput>();
      service.generate.mockReturnValue(accepted);
      store.setScope(organizationId);
      store.generate({ organizationId, planId, retry: false });
      store.setScope(otherOrganizationId);
      if (outcome === 'success') accepted.next(work);
      else accepted.error(problem('Old generation conflict.'));
      expect(store.generationCallState().status).toBe('idle');
      expect(store.selectedPlan()).toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it('switches authority only after explicit successful confirmation and blocks a duplicate command', () => {
    const accepted = new Subject<MaintenanceEngineOutput>();
    service.activateEngine.mockReturnValue(accepted);
    store.setScope(organizationId);
    store.loadEngine(organizationId);
    store.migrate({ organizationId, activate: true });
    store.migrate({ organizationId, activate: true });
    expect(store.migrationCallState().status).toBe('pending');
    expect(store.commandPending()).toBe(true);
    expect(store.engineCallState().data?.mode).toBe('legacy');
    expect(service.activateEngine).toHaveBeenCalledExactlyOnceWith(organizationId);
    expect(service.prepareLegacy).not.toHaveBeenCalled();
    accepted.next({ mode: 'plans', preparedCount: 3, conflicts: [] });
    accepted.complete();
    expect(store.engineCallState().data?.mode).toBe('plans');
    expect(store.migrationCallState().status).toBe('success');
    expect(store.commandPending()).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(
      maintenancePlansStoreEvents.planChanged({ organizationId }),
    );
  });

  it.each(['success', 'error'] as const)(
    'ignores previous organization migration %s',
    (outcome) => {
      const accepted = new Subject<MaintenanceEngineOutput>();
      service.prepareLegacy.mockReturnValue(accepted);
      store.setScope(organizationId);
      store.migrate({ organizationId, activate: false });
      store.setScope(otherOrganizationId);
      if (outcome === 'success') accepted.next({ mode: 'legacy', preparedCount: 3 });
      else accepted.error(problem('Old preparation conflict.'));
      expect(store.engineCallState().status).toBe('idle');
      expect(store.migrationCallState().status).toBe('idle');
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it('does not restore an obsolete operation page after returning to its organization', () => {
    const previousVisit = new Subject<HydraCollection<MaintenancePlanOutput>>();
    service.list.mockReturnValue(previousVisit);
    store.setScope(organizationId);
    store.load({ organizationId });
    store.setScope(otherOrganizationId);
    store.setScope(organizationId);
    previousVisit.next({
      ...collection,
      member: [preparedPlan({ name: 'Obsolete visit' })],
      totalItems: 1,
    });
    expect(store.planEntities()).toEqual([]);
    expect(store.totalPlans()).toBe(0);
    expect(store.listCallState().status).toBe('idle');
  });

  it('keeps a confirmed accepted update out of a later visit to the original organization', () => {
    const previousVisit = new Subject<MaintenancePlanOutput>();
    service.update.mockReturnValue(previousVisit);
    store.setScope(organizationId);
    store.update({ organizationId, planId, input: { name: 'Earlier visit change' } });
    store.setScope(otherOrganizationId);
    store.setScope(organizationId);
    expect(store.updateCallState().status).toBe('pending');
    expect(store.commandPending()).toBe(true);
    store.update({ organizationId, planId, input: { name: 'Duplicate attempt' } });
    expect(service.update).toHaveBeenCalledExactlyOnceWith(organizationId, planId, {
      name: 'Earlier visit change',
    });
    previousVisit.next(preparedPlan({ name: 'Earlier visit change' }));
    previousVisit.complete();
    expect(store.planEntities()).toEqual([]);
    expect(store.updateCallState().status).toBe('idle');
    expect(store.commandPending()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('allows the new organization to save while an accepted write in another organization finishes', () => {
    const previousOrganizationWrite = new Subject<MaintenancePlanOutput>();
    const currentOrganizationWrite = new Subject<MaintenancePlanOutput>();
    service.update
      .mockReturnValueOnce(previousOrganizationWrite)
      .mockReturnValueOnce(currentOrganizationWrite);
    store.setScope(organizationId);
    store.update({ organizationId, planId, input: { name: 'First organization change' } });
    store.setScope(otherOrganizationId);
    const otherPlanId = 'da48c31b-efc2-4bc0-931a-093c480e9da1';
    store.update({
      organizationId: otherOrganizationId,
      planId: otherPlanId,
      input: { name: 'Current organization change' },
    });
    expect(service.update).toHaveBeenCalledTimes(2);
    expect(service.update).toHaveBeenLastCalledWith(otherOrganizationId, otherPlanId, {
      name: 'Current organization change',
    });
    expect(store.updateCallState().status).toBe('pending');
    previousOrganizationWrite.next(preparedPlan({ name: 'First organization change' }));
    previousOrganizationWrite.complete();
    expect(store.updateCallState().status).toBe('pending');
    expect(store.planEntities()).toEqual([]);
    const confirmed = preparedPlan({
      id: otherPlanId,
      organizationId: otherOrganizationId,
      name: 'Current organization change',
    });
    currentOrganizationWrite.next(confirmed);
    currentOrganizationWrite.complete();
    expect(store.updateCallState().data).toEqual(confirmed);
    expect(store.planEntities()).toEqual([confirmed]);
    expect(store.commandPending()).toBe(false);
  });

  it('does not select or announce a prepared plan returned for another organization', () => {
    store.setScope(organizationId);
    service.create.mockReturnValue(of(preparedPlan({ organizationId: otherOrganizationId })));
    store.create({ organizationId, input });
    expect(store.createCallState().status).toBe('idle');
    expect(store.selectedPlan()).toBeNull();
    expect(store.planEntities()).toEqual([]);
    expect(store.commandPending()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    service.create.mockReturnValue(of(preparedPlan()));
    store.create({ organizationId, input });
    expect(store.createCallState().data).toEqual(preparedPlan());
  });

  it.each([
    { organizationId: otherOrganizationId },
    { id: 'da48c31b-efc2-4bc0-931a-093c480e9da1' },
  ])('does not replace or announce a different plan from an update response: %o', (overrides) => {
    const selected = preparedPlan();
    store.setScope(organizationId);
    store.preview(selected);
    service.update.mockReturnValue(of(preparedPlan(overrides)));
    store.update({ organizationId, planId, input: { active: true } });
    expect(store.updateCallState().status).toBe('idle');
    expect(store.selectedPlan()).toEqual(selected);
    expect(store.planEntities()).toEqual([]);
    expect(store.commandPending()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('retains the authorized operation page when a response mixes organization ownership', () => {
    store.setScope(organizationId);
    service.list.mockReturnValueOnce(
      of({ ...collection, member: [preparedPlan()], totalItems: 72 }),
    );
    store.load({ organizationId });
    service.list.mockReturnValueOnce(
      of({
        ...collection,
        member: [
          preparedPlan({ name: 'Unexpected replacement' }),
          preparedPlan({
            id: 'da48c31b-efc2-4bc0-931a-093c480e9da1',
            organizationId: otherOrganizationId,
          }),
        ],
        totalItems: 2,
      }),
    );
    store.load({ organizationId });
    expect(store.listCallState().status).toBe('idle');
    expect(store.planEntities()).toEqual([preparedPlan()]);
    expect(store.totalPlans()).toBe(72);
  });

  it('does not send a preview request for an operation owned by another organization', () => {
    store.setScope(organizationId);
    store.preview(preparedPlan());
    const authorizedPreview = store.previewCallState();
    store.preview(preparedPlan({ organizationId: otherOrganizationId }));
    expect(store.selectedPlan()).toEqual(preparedPlan());
    expect(store.previewCallState()).toEqual(authorizedPreview);
    expect(service.preview).toHaveBeenCalledExactlyOnceWith(organizationId, planId);
  });
});
