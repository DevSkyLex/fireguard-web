import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { ChecklistsPage } from '../checklists-page.component';

const checklist = (overrides: Partial<ChecklistOutput> = {}): ChecklistOutput =>
  ({
    '@id': '/api/organizations/org-1/checklists/checklist-1',
    '@type': 'Checklist',
    id: 'checklist-1',
    organizationId: 'org-1',
    name: 'Fire Safety Inspection',
    version: '1.0',
    status: 'active',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as ChecklistOutput;

describe('ChecklistsPage', () => {
  let fixture: ComponentFixture<ChecklistsPage>;
  let load: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let archive: ReturnType<typeof vi.fn>;
  let resetCreateOperation: ReturnType<typeof vi.fn>;
  let resetUpdateOperation: ReturnType<typeof vi.fn>;
  let resetArchiveOperation: ReturnType<typeof vi.fn>;
  let createCallState: WritableSignal<CallState<ChecklistOutput | null>>;
  let updateCallState: WritableSignal<CallState<ChecklistOutput | null>>;
  let archiveCallState: WritableSignal<CallState<ChecklistOutput | null>>;
  let hasPermission: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(ChecklistsPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  };

  beforeEach(() => {
    load = vi.fn();
    create = vi.fn();
    update = vi.fn();
    archive = vi.fn();
    resetCreateOperation = vi.fn();
    resetUpdateOperation = vi.fn();
    resetArchiveOperation = vi.fn();
    createCallState = signal<CallState<ChecklistOutput | null>>(idleCallState());
    updateCallState = signal<CallState<ChecklistOutput | null>>(idleCallState());
    archiveCallState = signal<CallState<ChecklistOutput | null>>(idleCallState());
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
      ],
    });

    TestBed.overrideComponent(ChecklistsPage, {
      set: {
        providers: [
          {
            provide: ChecklistStore,
            useValue: {
              checklists: signal<readonly ChecklistOutput[]>([checklist()]),
              totalChecklists: signal(1),
              listCallState: signal(idleCallState()),
              isLoadingChecklists: signal(false),
              createCallState,
              updateCallState,
              archiveCallState,
              isCreating: computed(() => createCallState().status === 'pending'),
              isUpdating: computed(() => updateCallState().status === 'pending'),
              isArchiving: computed(() => archiveCallState().status === 'pending'),
              load,
              create,
              update,
              archive,
              resetCreateOperation,
              resetUpdateOperation,
              resetArchiveOperation,
            },
          },
        ],
      },
    });
  });

  it('should load the first page for the workspace on arrival', async () => {
    await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1' });
    expect(load.mock.calls[0][0].options).toMatchObject({
      status: undefined,
      search: undefined,
      page: 1,
      itemsPerPage: 30,
    });
  });

  it('should send the trimmed search term as a search param and reset to page 1', async () => {
    await createPage();

    fixture.componentInstance['applySearch']('  fire  ');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.search).toBe('fire');
    expect(load.mock.calls.at(-1)?.[0].options.page).toBe(1);
  });

  it('should hide the New checklist action without the write permission', async () => {
    hasPermission.mockReturnValue(false);
    await createPage();

    expect(root().querySelector('[data-testid="checklists-new"]')).toBeNull();
  });

  it('should open the create dialog from the header action', async () => {
    await createPage();

    root().querySelector<HTMLButtonElement>('[data-testid="checklists-new"]')?.click();
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="checklist-create-dialog"]')).not.toBeNull();
  });

  it('should call ChecklistStore.create with the organization id and the payload', async () => {
    await createPage();

    fixture.componentInstance['createChecklist']({ name: 'Fire drill', version: '1.0', items: [] });

    expect(create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { name: 'Fire drill', version: '1.0', items: [] },
    });
  });

  it('should close the create dialog once the create write succeeds', async () => {
    await createPage();
    fixture.componentInstance['createDialogVisible'].set(true);
    await fixture.whenStable();

    createCallState.set(successCallState(checklist()));
    await fixture.whenStable();

    expect(fixture.componentInstance['createDialogVisible']()).toBe(false);
    expect(resetCreateOperation).toHaveBeenCalled();
  });

  it('should call ChecklistStore.update for the checklist open in the edit dialog', async () => {
    await createPage();
    fixture.componentInstance['requestEdit'](checklist());

    fixture.componentInstance['submitEdit']({ name: 'Renamed', items: [] });

    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      checklistId: 'checklist-1',
      input: { name: 'Renamed', items: [] },
    });
  });

  it('should close the edit dialog once the update write succeeds', async () => {
    await createPage();
    fixture.componentInstance['requestEdit'](checklist());
    await fixture.whenStable();

    updateCallState.set(successCallState(checklist()));
    await fixture.whenStable();

    expect(fixture.componentInstance['editingChecklist']()).toBeNull();
    expect(resetUpdateOperation).toHaveBeenCalled();
  });

  it('should call ChecklistStore.archive for the checklist open in the archive confirmation', async () => {
    await createPage();
    fixture.componentInstance['requestArchive'](checklist());

    fixture.componentInstance['confirmArchive']();

    expect(archive).toHaveBeenCalledWith({ organizationId: 'org-1', checklistId: 'checklist-1' });
  });

  it('should close the archive confirmation once the archive write succeeds', async () => {
    await createPage();
    fixture.componentInstance['requestArchive'](checklist());
    await fixture.whenStable();

    archiveCallState.set(successCallState({ ...checklist(), status: 'archived' }));
    await fixture.whenStable();

    expect(fixture.componentInstance['archivingChecklist']()).toBeNull();
    expect(resetArchiveOperation).toHaveBeenCalled();
  });

  it('should re-run the current query when the error state retries', async () => {
    await createPage();
    load.mockClear();

    fixture.componentInstance['reload']();

    expect(load).toHaveBeenCalledTimes(1);
  });
});
