import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import { InterventionsPage } from '../interventions-page.component';

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
  let instantiateFromTemplate: ReturnType<typeof vi.fn>;
  let clearCreated: ReturnType<typeof vi.fn>;
  let transition: ReturnType<typeof vi.fn>;
  let deleteIntervention: ReturnType<typeof vi.fn>;
  let assignResponsible: ReturnType<typeof vi.fn>;
  let clearPendingDuplicatePrefill: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let interventionList: WritableSignal<readonly InterventionOutput[]>;
  let createdInterventionId: WritableSignal<string | null>;
  let listError: WritableSignal<unknown>;
  let pendingDuplicatePrefill: WritableSignal<unknown>;

  beforeEach(() => {
    load = vi.fn();
    create = vi.fn();
    instantiateFromTemplate = vi.fn();
    clearCreated = vi.fn();
    transition = vi.fn();
    deleteIntervention = vi.fn();
    assignResponsible = vi.fn();
    clearPendingDuplicatePrefill = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    interventionList = signal<readonly InterventionOutput[]>([]);
    createdInterventionId = signal<string | null>(null);
    listError = signal<unknown>(null);
    pendingDuplicatePrefill = signal<unknown>(null);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: InterventionStore,
          useValue: {
            load,
            create,
            instantiateFromTemplate,
            transition,
            delete: deleteIntervention,
            assignResponsible,
            clearCreatedIntervention: clearCreated,
            clearPendingDuplicatePrefill,
            interventionList,
            createdInterventionId,
            listError,
            pendingDuplicatePrefill,
            totalInterventions: signal(0),
            isLoadingInterventions: signal(false),
            isCreating: signal(false),
            createError: signal(null),
            isInstantiatingFromTemplate: signal(false),
            assignCallState: signal({ status: 'idle' }),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasAnyPermission: (): boolean => true, hasPermission: (): boolean => true },
        },
        {
          provide: InterventionSyncCoordinatorService,
          useValue: {
            syncing: signal(false),
            blockedOperations: signal(0),
            problem: signal(null),
            syncAll: vi.fn(),
            retryBlocked: vi.fn(),
            discardBlocked: vi.fn(),
          },
        },
        {
          provide: InterventionOfflineService,
          useValue: { hasUnsyncedChanges: signal(false) },
        },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { profile: signal({ id: 'member-1' }) },
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
              labels: signal([]),
              templates: signal([]),
              hasTemplates: signal(false),
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

  it('should write a picked filter into the URL, the single source of truth', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ status: 'planned' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: 'planned' }),
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('should narrow the query from the filter params the URL carries', async () => {
    fixture = await createPage();

    fixture.componentRef.setInput('status', 'planned');
    fixture.componentRef.setInput('label', 'l-1');
    fixture.componentRef.setInput('mine', '1');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options).toMatchObject({
      status: 'planned',
      label: '/api/intervention-labels/l-1',
      member: '/api/organizations/org-1/members/member-1',
    });
  });

  it('should drop an unknown filter value instead of sending it', async () => {
    fixture = await createPage();

    fixture.componentRef.setInput('status', 'bogus');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.status).toBeUndefined();
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

    createdInterventionId.set('new-1');
    await fixture.whenStable();

    expect(clearCreated).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'new-1']);
  });

  it('should navigate to the draft created from a template, the same as a manual create', async () => {
    fixture = await createPage();

    createdInterventionId.set('new-2');
    await fixture.whenStable();

    expect(clearCreated).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'new-2']);
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

  it('should hand the picked template straight to the store', async () => {
    fixture = await createPage();

    fixture.componentInstance['instantiateFromTemplate']('template-1');

    expect(instantiateFromTemplate).toHaveBeenCalledWith({ templateId: 'template-1' });
  });

  describe('duplicate', () => {
    it('should open the sheet prefilled from a row’s own Duplicate request', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDuplicate'](
        intervention({ name: 'Roof round', type: 'inventory', priority: 'high' }),
      );
      await fixture.whenStable();

      expect(fixture.componentInstance['createSheetVisible']()).toBe(true);
      expect(fixture.componentInstance['duplicatePrefill']()).toEqual({
        name: 'Roof round (copy)',
        type: 'inventory',
        priority: 'high',
        site: '',
        responsible: '',
      });
    });

    it('should drop the prefill once the sheet closes', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDuplicate'](intervention());
      fixture.componentInstance['onCreateSheetVisibleChange'](false);
      await fixture.whenStable();

      expect(fixture.componentInstance['duplicatePrefill']()).toBeNull();
    });

    it('should drop a stale prefill when opening a plain creation', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDuplicate'](intervention());
      fixture.componentInstance['openCreate']();
      await fixture.whenStable();

      expect(fixture.componentInstance['duplicatePrefill']()).toBeNull();
      expect(fixture.componentInstance['createSheetVisible']()).toBe(true);
    });

    it('should consume and clear a cross-route handoff from the detail page', async () => {
      fixture = await createPage();

      pendingDuplicatePrefill.set({
        name: 'Site visit (copy)',
        type: 'inventory',
        priority: 'normal',
        site: '',
        responsible: '',
      });
      await fixture.whenStable();

      expect(fixture.componentInstance['createSheetVisible']()).toBe(true);
      expect(fixture.componentInstance['duplicatePrefill']()).toEqual({
        name: 'Site visit (copy)',
        type: 'inventory',
        priority: 'normal',
        site: '',
        responsible: '',
      });
      expect(clearPendingDuplicatePrefill).toHaveBeenCalled();
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

  describe('mine toggle', () => {
    it('should navigate the mine param on', async () => {
      fixture = await createPage();

      fixture.componentInstance['toggleMine']();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ mine: '1' }) }),
      );
    });

    it('should navigate the mine param off when already on', async () => {
      fixture = await createPage({ mine: '1' });

      fixture.componentInstance['toggleMine']();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ mine: null }) }),
      );
    });
  });

  describe('label filter', () => {
    it('should send the label filter as an intervention-label IRI', async () => {
      fixture = await createPage();

      fixture.componentInstance['applyFilter']({ label: '/api/intervention-labels/l-1' });
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ label: 'l-1' }) }),
      );
    });
  });

  describe('assign', () => {
    it('should open the assign dialog for a single row without calling the store yet', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestAssign'](
        intervention({ id: 'i-1', name: 'Roof round', responsible: null }),
      );
      await fixture.whenStable();

      expect(fixture.componentInstance['assignRequest']()).toEqual({
        interventionId: 'i-1',
        interventionName: 'Roof round',
        currentResponsible: null,
      });
      expect(assignResponsible).not.toHaveBeenCalled();
    });

    it('should call the store with the id, the picked member and the row’s revision on submit', async () => {
      interventionList.set([intervention({ id: 'i-1', revision: 5 })]);
      fixture = await createPage();

      fixture.componentInstance['requestAssign'](intervention({ id: 'i-1', revision: 5 }));
      fixture.componentInstance['submitAssign']({
        interventionId: 'i-1',
        responsible: '/api/organizations/org-1/members/member-2',
      });
      await fixture.whenStable();

      expect(assignResponsible).toHaveBeenCalledWith({
        interventionId: 'i-1',
        responsible: '/api/organizations/org-1/members/member-2',
        revision: 5,
      });
      expect(fixture.componentInstance['assignRequest']()).toBeNull();
    });

    it('should dismiss the assign dialog without calling the store', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestAssign'](intervention({ id: 'i-1' }));
      fixture.componentInstance['dismissAssign']();
      await fixture.whenStable();

      expect(fixture.componentInstance['assignRequest']()).toBeNull();
      expect(assignResponsible).not.toHaveBeenCalled();
    });

    it('should filter the selection to assignable rows only before opening the bulk dialog', async () => {
      interventionList.set([
        intervention({ id: 'i-draft', status: 'draft' }),
        intervention({ id: 'i-published', status: 'published' }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-draft', 'i-published']));
      fixture.componentInstance['requestBulkAssign']();
      await fixture.whenStable();

      expect(fixture.componentInstance['pendingBulkAssignIds']()).toEqual(['i-draft']);
    });

    it('should not open the bulk assign dialog when nothing selected is assignable', async () => {
      interventionList.set([intervention({ id: 'i-published', status: 'published' })]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-published']));
      fixture.componentInstance['requestBulkAssign']();
      await fixture.whenStable();

      expect(fixture.componentInstance['assignRequest']()).toBeNull();
    });

    it('should assign every assignable selected row and clear the selection on submit', async () => {
      interventionList.set([
        intervention({ id: 'i-draft', status: 'draft', revision: 1 }),
        intervention({ id: 'i-planned', status: 'planned', revision: 2 }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-draft', 'i-planned']));
      fixture.componentInstance['requestBulkAssign']();
      fixture.componentInstance['submitAssign']({
        interventionId: '',
        responsible: '/api/organizations/org-1/members/member-2',
      });
      await fixture.whenStable();

      expect(assignResponsible).toHaveBeenCalledWith({
        interventionId: 'i-draft',
        responsible: '/api/organizations/org-1/members/member-2',
        revision: 1,
      });
      expect(assignResponsible).toHaveBeenCalledWith({
        interventionId: 'i-planned',
        responsible: '/api/organizations/org-1/members/member-2',
        revision: 2,
      });
      expect(fixture.componentInstance['selectedIds']().size).toBe(0);
    });
  });

  describe('bulk transition', () => {
    it('should only count selected rows whose allowedTransitions include the target', async () => {
      interventionList.set([
        intervention({ id: 'i-1', allowedTransitions: ['abandoned'] }),
        intervention({ id: 'i-2', allowedTransitions: [] }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-1', 'i-2']));

      expect(fixture.componentInstance['transitionableSelectedIds']('abandoned')).toEqual(['i-1']);
    });

    it('should gate the submitted target to the row’s own responsible', async () => {
      interventionList.set([
        intervention({
          id: 'i-mine',
          status: 'in_progress',
          allowedTransitions: ['submitted'],
          responsible: '/api/organizations/org-1/members/member-1',
        }),
        intervention({
          id: 'i-other',
          status: 'in_progress',
          allowedTransitions: ['submitted'],
          responsible: '/api/organizations/org-1/members/member-2',
        }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-mine', 'i-other']));

      expect(fixture.componentInstance['transitionableSelectedIds']('submitted')).toEqual([
        'i-mine',
      ]);
    });

    it('should call the store once per eligible row and clear the selection on confirm', async () => {
      interventionList.set([
        intervention({ id: 'i-1', allowedTransitions: ['abandoned'], revision: 1 }),
        intervention({ id: 'i-2', allowedTransitions: ['abandoned'], revision: 2 }),
      ]);
      fixture = await createPage();

      fixture.componentInstance['onSelectionChanged'](new Set(['i-1', 'i-2']));
      fixture.componentInstance['confirmBulkTransition']('abandoned');
      await fixture.whenStable();

      expect(transition).toHaveBeenCalledWith({ id: 'i-1', status: 'abandoned', revision: 1 });
      expect(transition).toHaveBeenCalledWith({ id: 'i-2', status: 'abandoned', revision: 2 });
      expect(fixture.componentInstance['selectedIds']().size).toBe(0);
    });
  });
});
