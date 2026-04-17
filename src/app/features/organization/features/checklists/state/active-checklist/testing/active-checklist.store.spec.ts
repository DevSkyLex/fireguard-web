import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { ActiveChecklistStore } from '../active-checklist.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveChecklistStore', () => {
  let store: ActiveChecklistStore;
  let mockChecklistService: {
    get: ReturnType<typeof vi.fn>;
  };

  const checklist = { id: 'checklist-1', name: 'Electrical audit' } as unknown as ChecklistOutput;

  beforeEach(() => {
    mockChecklistService = {
      get: vi.fn().mockReturnValue(of(checklist)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: ChecklistService, useValue: mockChecklistService },
      ],
    });

    store = TestBed.inject(ActiveChecklistStore);
  });

  it('should resolve and expose the active checklist', async () => {
    store.resolveChecklist('org-1', 'checklist-1').subscribe();
    await flushEffects();

    expect(mockChecklistService.get).toHaveBeenCalledWith('org-1', 'checklist-1');
    expect(store.selectedChecklist()).toEqual(checklist);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the selected checklist', () => {
    store.setChecklist(checklist);
    store.clear();

    expect(store.selectedChecklist()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
