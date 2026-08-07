import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import { InterventionsPage } from '../interventions.component';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'a1b2',
    organization: '/api/organizations/1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly extinguisher sweep',
    description: null,
    status: 'planned',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'high',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 1,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    createdAt: '2026-08-01T09:00:00+00:00',
    updatedAt: '2026-08-02T09:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<InterventionsPage>> => {
  const created: ComponentFixture<InterventionsPage> = TestBed.createComponent(InterventionsPage);
  created.componentRef.setInput('organizationId', 'org-1');
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

describe('InterventionsPage', () => {
  let fixture: ComponentFixture<InterventionsPage>;
  let load: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let clearCreated: ReturnType<typeof vi.fn>;
  let transition: ReturnType<typeof vi.fn>;
  let deleteIntervention: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let interventionList: WritableSignal<readonly InterventionOutput[]>;
  let createdIntervention: WritableSignal<InterventionOutput | null>;
  let listError: WritableSignal<unknown>;

  beforeEach(() => {
    load = vi.fn();
    create = vi.fn();
    clearCreated = vi.fn();
    transition = vi.fn();
    deleteIntervention = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    interventionList = signal<readonly InterventionOutput[]>([]);
    createdIntervention = signal<InterventionOutput | null>(null);
    listError = signal<unknown>(null);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: InterventionStore,
          useValue: {
            load,
            create,
            transition,
            delete: deleteIntervention,
            clearCreatedIntervention: clearCreated,
            interventionList,
            createdIntervention,
            listError,
            isLoadingInterventions: signal(false),
            isCreating: signal(false),
            createError: signal(null),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasAnyPermission: (): boolean => true, hasPermission: (): boolean => true },
        },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    TestBed.overrideComponent(InterventionsPage, {
      remove: { providers: [InterventionPlanningOptionsStore] },
      add: {
        providers: [
          {
            provide: InterventionPlanningOptionsStore,
            useValue: {
              sites: signal([]),
              members: signal([]),
              loadCreationOptions: vi.fn(),
            },
          },
        ],
      },
    });
  });

  it('should load the list for the workspace on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1' });
  });

  it('should send the search term as a name filter', async () => {
    fixture = await createPage({ q: '  extinguisher  ' });

    expect(load.mock.calls[0][0].options).toMatchObject({ name: 'extinguisher' });
  });

  it('should survive a search param that was removed, which binds as undefined', async () => {
    fixture = await createPage({ q: 'extinguisher' });

    fixture.componentRef.setInput('q', undefined);
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.name).toBeUndefined();
  });

  it('should narrow the query when a filter is picked', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ status: 'planned' });
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options).toMatchObject({ status: 'planned' });
  });

  it('should reverse the ordering when the active column is picked again', async () => {
    fixture = await createPage();

    fixture.componentInstance['applySortField']('dueAt');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.order).toEqual({ dueAt: 'desc' });
  });

  it('should return to the first page whenever the query changes', async () => {
    fixture = await createPage();

    fixture.componentInstance['goToPage'](1);
    fixture.componentInstance['applyFilter']({ status: 'draft' });
    await fixture.whenStable();

    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should hide a column when the menu toggles it, and show it again', async () => {
    fixture = await createPage();

    expect(fixture.componentInstance['isColumnVisible']('site')).toBe(true);

    fixture.componentInstance['toggleColumn']('site');
    await fixture.whenStable();

    expect(fixture.componentInstance['isColumnVisible']('site')).toBe(false);

    fixture.componentInstance['toggleColumn']('site');
    await fixture.whenStable();

    expect(fixture.componentInstance['isColumnVisible']('site')).toBe(true);
  });

  it('should send a row transition to the store with the row’s own revision', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyTransition']({
      intervention: intervention({ id: 'i-9', revision: 7 }),
      status: 'planned',
    });

    expect(transition).toHaveBeenCalledWith({ id: 'i-9', status: 'planned', revision: 7 });
  });

  it('should open the creation sheet once for ?create=1, then drop the param', async () => {
    fixture = await createPage({ create: '1' });

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { create: null } }),
    );
    expect(document.querySelector('[data-testid="intervention-create-sheet"]')).not.toBeNull();
  });

  it('should not open the creation sheet without the param', async () => {
    fixture = await createPage();

    expect(document.querySelector('[data-testid="intervention-create-sheet"]')).toBeNull();
  });

  it('should navigate to the intervention the store just created', async () => {
    fixture = await createPage();

    createdIntervention.set(intervention({ id: 'new-1' }));
    await fixture.whenStable();

    expect(clearCreated).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'new-1']);
  });

  it('should show the failure state rather than an empty list when the load fails', async () => {
    listError.set({ message: 'boom' });
    fixture = await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Couldn't load the interventions",
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
  });

  it('should map the form values onto the store command, dropping the empty ones', async () => {
    fixture = await createPage();

    fixture.componentInstance['createIntervention']({
      name: 'Roof round',
      type: 'inventory',
      priority: 'normal',
      site: '',
      responsible: '',
      plannedStartAt: null,
      dueAt: null,
    });

    expect(create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      name: 'Roof round',
      type: 'inventory',
      priority: 'normal',
      site: undefined,
      responsible: undefined,
      plannedStartAt: undefined,
      dueAt: undefined,
    });
  });

  describe('delete', () => {
    it('should open the confirm dialog for a row delete request without calling the store yet', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDelete'](intervention({ id: 'i-1', revision: 3 }));
      await fixture.whenStable();

      expect(fixture.componentInstance['deleteDialogState']()).toBe('open');
      expect(deleteIntervention).not.toHaveBeenCalled();
    });

    it('should call the store with the id and revision once the single delete is confirmed', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDelete'](intervention({ id: 'i-1', revision: 3 }));
      fixture.componentInstance['confirmDelete']();
      await fixture.whenStable();

      expect(deleteIntervention).toHaveBeenCalledWith({ interventionId: 'i-1', revision: 3 });
      expect(fixture.componentInstance['deleteDialogState']()).toBe('closed');
    });

    it('should clear the pending target on any dismissal, not only confirm', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDelete'](intervention({ id: 'i-1' }));
      fixture.componentInstance['onDeleteDialogStateChanged']('closed');
      await fixture.whenStable();

      expect(fixture.componentInstance['deleteDialogState']()).toBe('closed');
      expect(deleteIntervention).not.toHaveBeenCalled();
    });

    it('should filter the selection to deletable rows only before opening the bulk dialog', async () => {
      interventionList.set([
        intervention({ id: 'i-draft', status: 'draft', revision: 1 }),
        intervention({ id: 'i-published', status: 'published', revision: 1 }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-draft', 'i-published']));
      fixture.componentInstance['requestBulkDelete']();
      await fixture.whenStable();

      expect(fixture.componentInstance['pendingBulkDeleteIds']()).toEqual(['i-draft']);
    });

    it('should not open the bulk dialog when nothing selected is deletable', async () => {
      interventionList.set([intervention({ id: 'i-published', status: 'published' })]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-published']));
      fixture.componentInstance['requestBulkDelete']();
      await fixture.whenStable();

      expect(fixture.componentInstance['deleteDialogState']()).toBe('closed');
    });

    it('should delete every deletable selected row and clear the selection on confirm', async () => {
      interventionList.set([
        intervention({ id: 'i-draft', status: 'draft', revision: 1 }),
        intervention({ id: 'i-abandoned', status: 'abandoned', revision: 2 }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-draft', 'i-abandoned']));
      fixture.componentInstance['requestBulkDelete']();
      fixture.componentInstance['confirmDelete']();
      await fixture.whenStable();

      expect(deleteIntervention).toHaveBeenCalledWith({ interventionId: 'i-draft', revision: 1 });
      expect(deleteIntervention).toHaveBeenCalledWith({
        interventionId: 'i-abandoned',
        revision: 2,
      });
      expect(fixture.componentInstance['selectedIds']().size).toBe(0);
    });
  });
});
