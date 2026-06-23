import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { ActiveChecklistStore } from '../../active-checklist/active-checklist.store';
import { ChecklistStore } from '../checklist.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ChecklistStore', () => {
  let store: ChecklistStore;
  let mockChecklistService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    archive: ReturnType<typeof vi.fn>;
  };

  const checklist = { id: 'checklist-1', name: 'Electrical audit' } as unknown as ChecklistOutput;
  const collection: HydraCollection<ChecklistOutput> = {
    '@id': '/api/organizations/org-1/checklists',
    '@type': 'Collection',
    totalItems: 1,
    member: [checklist],
  };

  beforeEach(() => {
    mockChecklistService = {
      list: vi.fn().mockReturnValue(of(collection)),
      create: vi.fn(),
      archive: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ChecklistStore,
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: ChecklistService, useValue: mockChecklistService },
        {
          provide: ActiveChecklistStore,
          useValue: {
            selectedChecklist: signal<ChecklistOutput | null>(null),
            isLoadingChecklist: signal(false),
          },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(ChecklistStore);
  });

  it('should load checklists', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockChecklistService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.checklists()).toEqual([checklist]);
    expect(store.totalChecklists()).toBe(1);
  });

  it('should preload inspection-create options in the browser', async () => {
    store.ensureInspectionCreateOptionsLoaded('org-1');
    await flushEffects();

    expect(mockChecklistService.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
  });
});
