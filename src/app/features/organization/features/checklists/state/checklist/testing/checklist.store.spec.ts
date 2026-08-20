import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
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
    update: ReturnType<typeof vi.fn>;
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
      update: vi.fn(),
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

    expect(mockChecklistService.list).toHaveBeenCalledWith('org-1', {
      itemsPerPage: 200,
      status: 'active',
    });
  });

  it('should not preload inspection-create options twice while already loading or loaded', async () => {
    store.ensureInspectionCreateOptionsLoaded('org-1');
    await flushEffects();
    mockChecklistService.list.mockClear();

    store.ensureInspectionCreateOptionsLoaded('org-1');
    await flushEffects();

    expect(mockChecklistService.list).not.toHaveBeenCalled();
  });

  it('should not preload inspection-create options on the server', async () => {
    TestBed.resetTestingModule();
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
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const serverStore = TestBed.inject(ChecklistStore);

    serverStore.ensureInspectionCreateOptionsLoaded('org-1');
    await flushEffects();

    expect(mockChecklistService.list).not.toHaveBeenCalled();
  });

  it('should record a load error', async () => {
    mockChecklistService.list.mockReturnValue(throwError(() => new Error('network down')));

    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.checklists()).toEqual([]);
    expect(store.isLoadingChecklists()).toBe(false);
  });

  it('should create a checklist and add it to the collection', async () => {
    const created = { id: 'checklist-2', name: 'Fire drill' } as unknown as ChecklistOutput;
    mockChecklistService.create.mockReturnValue(of(created));

    store.create({ organizationId: 'org-1', input: { name: 'Fire drill' } as never });
    await flushEffects();

    expect(store.checklists()).toContainEqual(created);
    expect(store.totalChecklists()).toBe(1);
    expect(store.isCreating()).toBe(false);
    expect(store.createError()).toBeNull();
  });

  it('should record a create error', async () => {
    mockChecklistService.create.mockReturnValue(throwError(() => new Error('rejected')));

    store.create({ organizationId: 'org-1', input: { name: 'Fire drill' } as never });
    await flushEffects();

    expect(store.isCreating()).toBe(false);
    expect(store.createError()).not.toBeNull();
  });

  it('should archive a checklist', async () => {
    const archived = {
      id: 'checklist-1',
      name: 'Electrical audit',
      status: 'archived',
    } as unknown as ChecklistOutput;
    mockChecklistService.archive.mockReturnValue(of(archived));
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    store.archive({ organizationId: 'org-1', checklistId: 'checklist-1' });
    await flushEffects();

    expect(store.isArchiving()).toBe(false);
    expect(store.checklists()).toContainEqual(archived);
  });

  it('should record an archive error', async () => {
    mockChecklistService.archive.mockReturnValue(throwError(() => new Error('rejected')));

    store.archive({ organizationId: 'org-1', checklistId: 'checklist-1' });
    await flushEffects();

    expect(store.isArchiving()).toBe(false);
  });

  it('should update a checklist and replace it in the collection', async () => {
    const updated = {
      id: 'checklist-1',
      name: 'Electrical audit v2',
    } as unknown as ChecklistOutput;
    mockChecklistService.update.mockReturnValue(of(updated));
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    store.update({
      organizationId: 'org-1',
      checklistId: 'checklist-1',
      input: { name: 'Electrical audit v2' },
    });
    await flushEffects();

    expect(store.isUpdating()).toBe(false);
    expect(store.updateError()).toBeNull();
    expect(store.checklists()).toContainEqual(updated);
  });

  it('should record an update error', async () => {
    mockChecklistService.update.mockReturnValue(throwError(() => new Error('rejected')));

    store.update({ organizationId: 'org-1', checklistId: 'checklist-1', input: { name: 'x' } });
    await flushEffects();

    expect(store.isUpdating()).toBe(false);
    expect(store.updateError()).not.toBeNull();
  });

  it('should reset the create, archive and update operations back to idle', () => {
    store.resetCreateOperation();
    store.resetArchiveOperation();
    store.resetUpdateOperation();

    expect(store.isCreating()).toBe(false);
    expect(store.isArchiving()).toBe(false);
    expect(store.isUpdating()).toBe(false);
    expect(store.createError()).toBeNull();
  });

  it('should report isEmpty only once the list settles with no results', async () => {
    mockChecklistService.list.mockReturnValue(
      of({
        '@id': '/api/organizations/org-1/checklists',
        '@type': 'Collection',
        totalItems: 0,
        member: [],
      }),
    );

    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.isEmpty()).toBe(true);
  });
});
