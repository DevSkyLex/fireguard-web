import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '../active-inspection.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveInspectionStore', () => {
  let store: ActiveInspectionStore;
  let mockInspectionService: {
    get: ReturnType<typeof vi.fn>;
  };

  const inspection = { id: 'inspection-1', reference: 'INSP-1' } as unknown as InspectionOutput;

  beforeEach(() => {
    mockInspectionService = {
      get: vi.fn().mockReturnValue(of(inspection)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: InspectionService, useValue: mockInspectionService },
      ],
    });

    store = TestBed.inject(ActiveInspectionStore);
  });

  it('should resolve and expose the active inspection', async () => {
    store.resolveInspection('org-1', 'inspection-1').subscribe();
    await flushEffects();

    expect(mockInspectionService.get).toHaveBeenCalledWith('org-1', 'inspection-1');
    expect(store.selectedInspection()).toEqual(inspection);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the selected inspection', () => {
    store.setInspection(inspection);
    store.clear();

    expect(store.selectedInspection()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
