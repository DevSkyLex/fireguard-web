import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '../active-inspection.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveInspectionStore', () => {
  let store: ActiveInspectionStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let mockInspectionService: {
    get: ReturnType<typeof vi.fn>;
  };

  const inspection = { id: 'inspection-1', reference: 'INSP-1' } as unknown as InspectionOutput;

  beforeEach(() => {
    dispatch = vi.fn();
    mockInspectionService = {
      get: vi.fn().mockReturnValue(of(inspection)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InspectionService, useValue: mockInspectionService },
      ],
    });

    store = TestBed.inject(ActiveInspectionStore);
  });

  it('should resolve and expose the active inspection', async () => {
    store.resolveInspection({ organizationId: 'org-1', inspectionId: 'inspection-1' });
    await flushEffects();

    expect(mockInspectionService.get).toHaveBeenCalledWith('org-1', 'inspection-1');
    expect(store.selectedInspection()).toEqual(inspection);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the previous record while resolving a different id', () => {
    store.setInspection(inspection);
    mockInspectionService.get.mockReturnValue(NEVER);

    store.resolveInspection({ organizationId: 'org-1', inspectionId: 'inspection-2' });

    expect(store.selectedInspection()).toBeNull();
    expect(store.getCallState().status).toBe('pending');
  });

  it('should keep the current record on screen while re-resolving the same id', () => {
    store.setInspection(inspection);
    mockInspectionService.get.mockReturnValue(NEVER);

    store.resolveInspection({ organizationId: 'org-1', inspectionId: 'inspection-1' });

    expect(store.selectedInspection()).toEqual(inspection);
    expect(store.getCallState().status).toBe('pending');
  });

  it('should record the failure and dispatch getFailed when the fetch errors', async () => {
    mockInspectionService.get.mockReturnValue(throwError(() => new Error('down')));

    store.resolveInspection({ organizationId: 'org-1', inspectionId: 'inspection-1' });
    await flushEffects();

    expect(store.selectedInspection()).toBeNull();
    expect(store.getCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalled();
  });

  it('should clear the selected inspection', () => {
    store.setInspection(inspection);
    store.clear();

    expect(store.selectedInspection()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
