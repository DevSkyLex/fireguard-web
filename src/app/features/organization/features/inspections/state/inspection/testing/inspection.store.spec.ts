import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  InspectionOutput,
  NonConformityOutput,
  NonConformityWaivePendingOutput,
} from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '../../active-inspection/active-inspection.store';
import { InspectionStore } from '../inspection.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('InspectionStore', () => {
  let store: InspectionStore;
  let mockInspectionService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    submit: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    listNonConformities: ReturnType<typeof vi.fn>;
    getNonConformity: ReturnType<typeof vi.fn>;
    addNonConformity: ReturnType<typeof vi.fn>;
    updateNonConformityStatus: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockActiveInspectionStore: {
    selectedInspection: ReturnType<typeof signal<InspectionOutput | null>>;
    isLoadingInspection: ReturnType<typeof signal<boolean>>;
    setInspection: ReturnType<typeof vi.fn>;
    clearSelectedInspection: ReturnType<typeof vi.fn>;
  };

  const inspection = { id: 'inspection-1', reference: 'INSP-1' } as unknown as InspectionOutput;
  const updatedInspection = {
    id: 'inspection-1',
    reference: 'INSP-1-updated',
  } as unknown as InspectionOutput;
  const nonConformity = {
    id: 'nc-1',
    title: 'Door blocked',
  } as unknown as NonConformityOutput;
  const updatedNonConformity = {
    id: 'nc-1',
    title: 'Door blocked',
    status: 'resolved',
  } as unknown as NonConformityOutput;
  const pendingApproval: NonConformityWaivePendingOutput = {
    status: 'pending_approval',
    approvalRequestId: 'approval-1',
    approvalStatus: 'pending',
    expiresAt: '2026-04-01T00:00:00+00:00',
  };
  const inspectionsCollection: HydraCollection<InspectionOutput> = {
    '@id': '/api/organizations/org-1/inspections',
    '@type': 'Collection',
    totalItems: 1,
    member: [inspection],
  };
  const nonConformitiesCollection: HydraCollection<NonConformityOutput> = {
    '@id': '/api/organizations/org-1/inspections/inspection-1/non-conformities',
    '@type': 'Collection',
    totalItems: 1,
    member: [nonConformity],
  };
  const apiError = new Error('Network failure');

  beforeEach(() => {
    mockInspectionService = {
      list: vi.fn().mockReturnValue(of(inspectionsCollection)),
      create: vi.fn().mockReturnValue(of(inspection)),
      update: vi.fn().mockReturnValue(of(updatedInspection)),
      cancel: vi.fn().mockReturnValue(of(undefined)),
      submit: vi.fn().mockReturnValue(of(updatedInspection)),
      close: vi.fn().mockReturnValue(of(updatedInspection)),
      listNonConformities: vi.fn().mockReturnValue(of(nonConformitiesCollection)),
      getNonConformity: vi.fn().mockReturnValue(of(nonConformity)),
      addNonConformity: vi.fn().mockReturnValue(of(nonConformity)),
      updateNonConformityStatus: vi
        .fn()
        .mockReturnValue(of({ kind: 'updated', nonConformity: updatedNonConformity })),
    };
    mockDispatcher = { dispatch: vi.fn() };
    mockActiveInspectionStore = {
      selectedInspection: signal<InspectionOutput | null>(null),
      isLoadingInspection: signal(false),
      setInspection: vi.fn(),
      clearSelectedInspection: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InspectionStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: InspectionService, useValue: mockInspectionService },
        { provide: ActiveInspectionStore, useValue: mockActiveInspectionStore },
      ],
    });

    store = TestBed.inject(InspectionStore);
  });

  it('should load inspections', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockInspectionService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.inspections()).toEqual([inspection]);
    expect(store.totalInspections()).toBe(1);
  });

  it('should load non-conformities for an inspection', async () => {
    store.loadNonConformities({ organizationId: 'org-1', inspectionId: 'inspection-1' });
    await flushEffects();

    expect(mockInspectionService.listNonConformities).toHaveBeenCalledWith(
      'org-1',
      'inspection-1',
      undefined,
    );
    expect(store.nonConformities()).toEqual([nonConformity]);
    expect(store.totalNonConformities()).toBe(1);
  });

  it('should dispatch listFailed and set listError when loading inspections fails', async () => {
    mockInspectionService.list.mockReturnValue(throwError(() => apiError));

    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.listError()?.message).toBe('Network failure');
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Inspection Store] listFailed' }),
    );
  });

  it('should dispatch nonConformitiesListFailed when loading non-conformities fails', async () => {
    mockInspectionService.listNonConformities.mockReturnValue(throwError(() => apiError));

    store.loadNonConformities({ organizationId: 'org-1', inspectionId: 'inspection-1' });
    await flushEffects();

    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Inspection Store] nonConformitiesListFailed' }),
    );
  });

  describe('create', () => {
    it('should add the entity, increment total and dispatch createSucceeded on success', async () => {
      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();

      expect(mockInspectionService.create).toHaveBeenCalledWith('org-1', {});
      expect(store.inspections()).toEqual([inspection]);
      expect(store.totalInspections()).toBe(1);
      expect(store.createError()).toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] createSucceeded' }),
      );
    });

    it('should set createError and dispatch createFailed on failure', async () => {
      mockInspectionService.create.mockReturnValue(throwError(() => apiError));

      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();

      expect(store.inspections()).toEqual([]);
      expect(store.createError()?.message).toBe('Network failure');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] createFailed' }),
      );
    });
  });

  describe('update', () => {
    it('should update the entity and sync the active inspection store on success', async () => {
      store.update({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();

      expect(mockInspectionService.update).toHaveBeenCalledWith('org-1', 'inspection-1', {});
      expect(mockActiveInspectionStore.setInspection).toHaveBeenCalledWith(updatedInspection);
    });

    it('should dispatch updateFailed on failure', async () => {
      mockInspectionService.update.mockReturnValue(throwError(() => apiError));

      store.update({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();

      expect(mockActiveInspectionStore.setInspection).not.toHaveBeenCalled();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] updateFailed' }),
      );
    });
  });

  describe('cancel', () => {
    it('should remove the entity, decrement total and dispatch cancelSucceeded on success', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.totalInspections()).toBe(1);

      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockInspectionService.cancel).toHaveBeenCalledWith('org-1', 'inspection-1');
      expect(store.inspections()).toEqual([]);
      expect(store.totalInspections()).toBe(0);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] cancelSucceeded' }),
      );
    });

    it('should clear the active inspection when the cancelled inspection is selected', async () => {
      mockActiveInspectionStore.selectedInspection.set(inspection);

      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockActiveInspectionStore.clearSelectedInspection).toHaveBeenCalled();
    });

    it('should not clear the active inspection when a different inspection is selected', async () => {
      mockActiveInspectionStore.selectedInspection.set({
        id: 'inspection-2',
      } as unknown as InspectionOutput);

      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockActiveInspectionStore.clearSelectedInspection).not.toHaveBeenCalled();
    });

    it('should dispatch cancelFailed on failure', async () => {
      mockInspectionService.cancel.mockReturnValue(throwError(() => apiError));

      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] cancelFailed' }),
      );
    });
  });

  describe('submit', () => {
    it('should update the entity and sync the active inspection store on success', async () => {
      store.submit({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockInspectionService.submit).toHaveBeenCalledWith('org-1', 'inspection-1');
      expect(mockActiveInspectionStore.setInspection).toHaveBeenCalledWith(updatedInspection);
    });

    it('should dispatch submitFailed on failure', async () => {
      mockInspectionService.submit.mockReturnValue(throwError(() => apiError));

      store.submit({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockActiveInspectionStore.setInspection).not.toHaveBeenCalled();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] submitFailed' }),
      );
    });
  });

  describe('close', () => {
    it('should update the entity and sync the active inspection store on success', async () => {
      store.close({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockInspectionService.close).toHaveBeenCalledWith('org-1', 'inspection-1');
      expect(mockActiveInspectionStore.setInspection).toHaveBeenCalledWith(updatedInspection);
    });

    it('should dispatch closeFailed on failure', async () => {
      mockInspectionService.close.mockReturnValue(throwError(() => apiError));

      store.close({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      expect(mockActiveInspectionStore.setInspection).not.toHaveBeenCalled();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] closeFailed' }),
      );
    });
  });

  describe('loadNonConformity', () => {
    it('should set the entity on success', async () => {
      store.loadNonConformity({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
      });
      await flushEffects();

      expect(mockInspectionService.getNonConformity).toHaveBeenCalledWith(
        'org-1',
        'inspection-1',
        'nc-1',
      );
      expect(store.nonConformities()).toEqual([nonConformity]);
    });

    it('should dispatch nonConformityGetFailed on failure', async () => {
      mockInspectionService.getNonConformity.mockReturnValue(throwError(() => apiError));

      store.loadNonConformity({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
      });
      await flushEffects();

      expect(store.nonConformities()).toEqual([]);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] nonConformityGetFailed' }),
      );
    });
  });

  describe('addNonConformity', () => {
    it('should add the entity and increment total on success', async () => {
      store.addNonConformity({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();

      expect(mockInspectionService.addNonConformity).toHaveBeenCalledWith(
        'org-1',
        'inspection-1',
        {},
      );
      expect(store.nonConformities()).toEqual([nonConformity]);
      expect(store.totalNonConformities()).toBe(1);
    });

    it('should dispatch addNonConformityFailed on failure', async () => {
      mockInspectionService.addNonConformity.mockReturnValue(throwError(() => apiError));

      store.addNonConformity({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();

      expect(store.nonConformities()).toEqual([]);
      expect(store.totalNonConformities()).toBe(0);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] addNonConformityFailed' }),
      );
    });
  });

  describe('updateNonConformityStatus', () => {
    it('should update the entity on success', async () => {
      store.loadNonConformities({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      store.updateNonConformityStatus({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: {} as never,
      });
      await flushEffects();

      expect(mockInspectionService.updateNonConformityStatus).toHaveBeenCalledWith(
        'org-1',
        'inspection-1',
        'nc-1',
        {},
      );
      expect(store.nonConformities()).toEqual([updatedNonConformity]);
    });

    it('should dispatch updateNonConformityStatusFailed on failure', async () => {
      mockInspectionService.updateNonConformityStatus.mockReturnValue(throwError(() => apiError));

      store.updateNonConformityStatus({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: {} as never,
      });
      await flushEffects();

      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] updateNonConformityStatusFailed' }),
      );
    });

    it('should record the pending waiver and leave the entity untouched on a 202', async () => {
      store.loadNonConformities({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();

      mockInspectionService.updateNonConformityStatus.mockReturnValue(
        of({ kind: 'pendingApproval', pending: pendingApproval }),
      );

      store.updateNonConformityStatus({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: {} as never,
      });
      await flushEffects();

      expect(store.nonConformities()).toEqual([nonConformity]);
      expect(store.nonConformityWaivePending()).toEqual({ 'nc-1': pendingApproval });
    });

    it('should refresh the row instead of dispatching a toast on a 409', async () => {
      const conflict = { '@id': '', '@type': 'Error', status: 409, detail: 'Conflict' };
      mockInspectionService.updateNonConformityStatus.mockReturnValue(throwError(() => conflict));

      store.updateNonConformityStatus({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: {} as never,
      });
      await flushEffects();

      expect(mockInspectionService.getNonConformity).toHaveBeenCalledWith(
        'org-1',
        'inspection-1',
        'nc-1',
      );
      expect(mockDispatcher.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Inspection Store] updateNonConformityStatusFailed' }),
      );
      expect(store.nonConformityStatusErrorText()).toContain('already resolved');
    });
  });

  describe('resetAddNonConformityOperation', () => {
    it('should reset the add non-conformity call state to idle', async () => {
      mockInspectionService.addNonConformity.mockReturnValue(throwError(() => apiError));

      store.addNonConformity({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();
      expect(store.isAddingNonConformity()).toBe(false);

      store.resetAddNonConformityOperation();

      expect(store.isAddingNonConformity()).toBe(false);
    });
  });

  describe('resetUpdateNonConformityStatusOperation', () => {
    it('should reset the update non-conformity status call state to idle', async () => {
      mockInspectionService.updateNonConformityStatus.mockReturnValue(throwError(() => apiError));

      store.updateNonConformityStatus({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: {} as never,
      });
      await flushEffects();
      expect(store.nonConformityStatusErrorText()).not.toBeNull();

      store.resetUpdateNonConformityStatusOperation();

      expect(store.nonConformityStatusErrorText()).toBeNull();
    });
  });

  describe('resetCreateOperation', () => {
    it('should reset the create call state to idle', async () => {
      mockInspectionService.create.mockReturnValue(throwError(() => apiError));

      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();
      expect(store.createError()).not.toBeNull();

      store.resetCreateOperation();

      expect(store.createError()).toBeNull();
      expect(store.isCreating()).toBe(false);
    });
  });

  describe('computed signals', () => {
    it('listError should be null while idle and set to a StoreError after a failed load', async () => {
      expect(store.listError()).toBeNull();

      mockInspectionService.list.mockReturnValue(throwError(() => apiError));
      store.load({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.listError()).not.toBeNull();
      expect(store.listError()?.message).toBe('Network failure');
    });

    it('isEmpty should be true only when the collection is empty and the list call is neither pending nor errored', async () => {
      expect(store.isEmpty()).toBe(true);

      mockInspectionService.list.mockReturnValue(NEVER);
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.isEmpty()).toBe(false);

      mockInspectionService.list.mockReturnValue(of(inspectionsCollection));
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.isEmpty()).toBe(false);

      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();
      expect(store.isEmpty()).toBe(true);

      mockInspectionService.list.mockReturnValue(throwError(() => apiError));
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.isEmpty()).toBe(false);
    });

    it('isLoadingInspections should reflect the pending state of the list call', async () => {
      expect(store.isLoadingInspections()).toBe(false);

      mockInspectionService.list.mockReturnValue(NEVER);
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.isLoadingInspections()).toBe(true);
    });

    it('isCreating should reflect the pending state of the create call', async () => {
      expect(store.isCreating()).toBe(false);

      mockInspectionService.create.mockReturnValue(NEVER);
      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();
      expect(store.isCreating()).toBe(true);
    });

    it('isUpdating should reflect the pending state of the update call', async () => {
      expect(store.isUpdating()).toBe(false);

      mockInspectionService.update.mockReturnValue(NEVER);
      store.update({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();
      expect(store.isUpdating()).toBe(true);
    });

    it('isCancelling should reflect the pending state of the cancel call', async () => {
      expect(store.isCancelling()).toBe(false);

      mockInspectionService.cancel.mockReturnValue(NEVER);
      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();
      expect(store.isCancelling()).toBe(true);
    });

    it('isChangingLifecycle should be true while a submit is pending', async () => {
      expect(store.isChangingLifecycle()).toBe(false);

      mockInspectionService.submit.mockReturnValue(NEVER);
      store.submit({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();
      expect(store.isChangingLifecycle()).toBe(true);
    });

    it('isChangingLifecycle should be true while a close is pending', async () => {
      mockInspectionService.close.mockReturnValue(NEVER);
      store.close({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();
      expect(store.isChangingLifecycle()).toBe(true);
    });

    it('isChangingLifecycle should be true while a cancel is pending', async () => {
      mockInspectionService.cancel.mockReturnValue(NEVER);
      store.cancel({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();
      expect(store.isChangingLifecycle()).toBe(true);
    });

    it('isLoadingNonConformities should reflect the pending state of the non-conformities list call', async () => {
      expect(store.isLoadingNonConformities()).toBe(false);

      mockInspectionService.listNonConformities.mockReturnValue(NEVER);
      store.loadNonConformities({ organizationId: 'org-1', inspectionId: 'inspection-1' });
      await flushEffects();
      expect(store.isLoadingNonConformities()).toBe(true);
    });

    it('isAddingNonConformity should reflect the pending state of the add non-conformity call', async () => {
      expect(store.isAddingNonConformity()).toBe(false);

      mockInspectionService.addNonConformity.mockReturnValue(NEVER);
      store.addNonConformity({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: {} as never,
      });
      await flushEffects();
      expect(store.isAddingNonConformity()).toBe(true);
    });

    it('isUpdatingNonConformity should reflect the pending state of the update non-conformity status call', async () => {
      expect(store.isUpdatingNonConformity()).toBe(false);

      mockInspectionService.updateNonConformityStatus.mockReturnValue(NEVER);
      store.updateNonConformityStatus({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: {} as never,
      });
      await flushEffects();
      expect(store.isUpdatingNonConformity()).toBe(true);
    });

    it('createError should be null on success and populated on failure', async () => {
      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();
      expect(store.createError()).toBeNull();

      mockInspectionService.create.mockReturnValue(throwError(() => apiError));
      store.create({ organizationId: 'org-1', input: {} as never });
      await flushEffects();
      expect(store.createError()?.message).toBe('Network failure');
    });
  });
});
