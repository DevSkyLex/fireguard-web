import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  input,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
  idleCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionLabelOutput,
  InterventionOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
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
    hasSignature: false,
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

/**
 * Stands in for the shell's `DashboardPageActions`: every migrated page
 * registers its header actions as a `TemplateRef` on the real
 * `PageActionsService` (never mocked, so the constructor effect and the
 * teardown clear behave exactly as in production) rather than rendering them
 * in its own template. A spec that needs to click one of those buttons
 * renders the currently registered template through this outlet, the same
 * way the shell does — this is the approach every migrated page's spec
 * reuses.
 */
@Component({
  selector: 'app-page-actions-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageActionsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
}

const renderPageActions = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageActionsService).actions());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

describe('InterventionsPage', () => {
  let fixture: ComponentFixture<InterventionsPage>;
  let load: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let instantiateFromTemplate: ReturnType<typeof vi.fn>;
  let clearCreated: ReturnType<typeof vi.fn>;
  let transition: ReturnType<typeof vi.fn>;
  let deleteIntervention: ReturnType<typeof vi.fn>;
  let resetDeleteState: ReturnType<typeof vi.fn>;
  let deleteCallState: WritableSignal<CallState>;
  let assignResponsible: ReturnType<typeof vi.fn>;
  let clearPendingDuplicatePrefill: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let interventionList: WritableSignal<readonly InterventionOutput[]>;
  let createdInterventionId: WritableSignal<string | null>;
  let listError: WritableSignal<unknown>;
  let pendingDuplicatePrefill: WritableSignal<unknown>;
  let totalInterventions: WritableSignal<number>;
  let listAll: ReturnType<typeof vi.fn>;
  let feedbackWarn: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    load = vi.fn();
    create = vi.fn();
    instantiateFromTemplate = vi.fn();
    clearCreated = vi.fn();
    transition = vi.fn();
    deleteIntervention = vi.fn();
    resetDeleteState = vi.fn();
    deleteCallState = signal<CallState>(idleCallState());
    assignResponsible = vi.fn();
    clearPendingDuplicatePrefill = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    interventionList = signal<readonly InterventionOutput[]>([]);
    createdInterventionId = signal<string | null>(null);
    listError = signal<unknown>(null);
    pendingDuplicatePrefill = signal<unknown>(null);
    totalInterventions = signal<number>(0);
    listAll = vi.fn().mockReturnValue(of([]));
    feedbackWarn = vi.fn();
    feedbackError = vi.fn();

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
            resetDeleteState,
            deleteCallState,
            isDeleting: signal(false),
            deleteError: signal(null),
            assignResponsible,
            clearCreatedIntervention: clearCreated,
            clearPendingDuplicatePrefill,
            interventionList,
            createdInterventionId,
            listError,
            pendingDuplicatePrefill,
            totalInterventions,
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
          provide: OrganizationMemberAccessStore,
          useValue: { profile: signal({ id: 'member-1' }) },
        },
        {
          provide: InterventionService,
          useValue: { listAll, statistics: vi.fn().mockReturnValue(of(null)) },
        },
        {
          provide: FeedbackService,
          useValue: { warn: feedbackWarn, error: feedbackError },
        },
        { provide: Router, useValue: { navigate, events: EMPTY } },
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

  it('should render the "New intervention" button through the shell header actions', async () => {
    fixture = await createPage();

    const header: HTMLElement = renderPageActions();
    const button: HTMLButtonElement | null = header.querySelector(
      '[data-testid="interventions-new"]',
    );

    expect(button).not.toBeNull();
    button?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance['createSheetVisible']()).toBe(true);
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
      expect(resetDeleteState).toHaveBeenCalled();
    });

    it('should call the store with the id and revision once the single delete is confirmed, and keep the dialog open while it is pending', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDelete'](intervention({ id: 'i-1', revision: 3 }));
      fixture.componentInstance['confirmDelete']();
      await fixture.whenStable();

      expect(deleteIntervention).toHaveBeenCalledWith({ interventionId: 'i-1', revision: 3 });
      expect(fixture.componentInstance['deleteDialogState']()).toBe('open');
    });

    it('should close the single-delete confirmation once the store reports success', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDelete'](intervention({ id: 'i-1', revision: 3 }));
      fixture.componentInstance['confirmDelete']();
      deleteCallState.set(successCallState(null));
      await fixture.whenStable();

      expect(fixture.componentInstance['deleteDialogState']()).toBe('closed');
    });

    it('should keep the single-delete confirmation open and let the store error surface inline on failure', async () => {
      fixture = await createPage();

      fixture.componentInstance['requestDelete'](intervention({ id: 'i-1', revision: 3 }));
      fixture.componentInstance['confirmDelete']();
      deleteCallState.set(errorCallState(toStoreError(new Error('Conflict'))));
      await fixture.whenStable();

      expect(fixture.componentInstance['deleteDialogState']()).toBe('open');
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

  describe('export', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('should disable the button while the list is loading, busy or empty', async () => {
      totalInterventions.set(0);
      fixture = await createPage();

      expect(fixture.componentInstance['exportDisabled']()).toBe(true);

      totalInterventions.set(5);
      await fixture.whenStable();

      expect(fixture.componentInstance['exportDisabled']()).toBe(false);

      fixture.componentInstance['exportBusy'].set(true);
      expect(fixture.componentInstance['exportDisabled']()).toBe(true);
    });

    it('should export the loaded page directly when it already is the whole collection', async () => {
      interventionList.set([intervention({ id: 'i-1' })]);
      totalInterventions.set(1);
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();

      expect(listAll).not.toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('should drain every page through the service, with the current filters and sort, when more rows exist than are loaded', async () => {
      interventionList.set([intervention({ id: 'i-1' })]);
      totalInterventions.set(2);
      listAll.mockReturnValue(of([intervention({ id: 'i-1' }), intervention({ id: 'i-2' })]));
      fixture = await createPage({ status: 'planned', q: 'sweep' });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(listAll).toHaveBeenCalledTimes(1);
      expect(listAll.mock.calls[0][0]).toBe('org-1');
      expect(listAll.mock.calls[0][1]).toMatchObject({ status: 'planned', name: 'sweep' });
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['exportBusy']()).toBe(false);
    });

    it('should cap a drained export and warn once truncated', async () => {
      totalInterventions.set(1_500);
      const rows: InterventionOutput[] = Array.from({ length: 1_200 }, (_unused, index) =>
        intervention({ id: `i-${index}` }),
      );
      listAll.mockReturnValue(of(rows));
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('should clear the busy flag and report a failure when the drain errors', async () => {
      totalInterventions.set(2);
      listAll.mockReturnValue(throwError(() => new Error('network down')));
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(fixture.componentInstance['exportBusy']()).toBe(false);
      expect(feedbackError).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should mark the export button busy and announce it while the export is in flight', async () => {
      totalInterventions.set(5);
      fixture = await createPage();

      const button = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="interventions-export"]',
      );
      expect(button?.getAttribute('aria-busy')).toBeNull();

      fixture.componentInstance['exportBusy'].set(true);
      await fixture.whenStable();

      expect(button?.getAttribute('aria-busy')).toBe('true');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="interventions-export-status"]',
        ),
      ).not.toBeNull();
    });
  });

  describe('activeView', () => {
    it('should read "all" for no status and no due window', async () => {
      fixture = await createPage();

      expect(fixture.componentInstance['activeView']()).toBe('all');
    });

    it('should read "overdue" for the overdue due window with no status', async () => {
      fixture = await createPage({ due: 'overdue' });

      expect(fixture.componentInstance['activeView']()).toBe('overdue');
    });

    it('should read "sent-back" for status changes_requested with no due window', async () => {
      fixture = await createPage({ status: 'changes_requested' });

      expect(fixture.componentInstance['activeView']()).toBe('sent-back');
    });

    it('should read "awaiting-review" for status submitted with no due window', async () => {
      fixture = await createPage({ status: 'submitted' });

      expect(fixture.componentInstance['activeView']()).toBe('awaiting-review');
    });

    it('should read null for a custom combination matching none of the four views', async () => {
      fixture = await createPage({ status: 'changes_requested', due: 'overdue' });

      expect(fixture.componentInstance['activeView']()).toBeNull();
    });
  });

  describe('onViewChanged', () => {
    it('should navigate "all" to every filter cleared and reset the page', async () => {
      fixture = await createPage();
      fixture.componentInstance['page'].set(3);

      fixture.componentInstance['onViewChanged']('all');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {
            status: null,
            type: null,
            priority: null,
            site: null,
            responsible: null,
            label: null,
            mine: null,
            due: null,
          },
          queryParamsHandling: 'merge',
        }),
      );
      expect(fixture.componentInstance['page']()).toBe(1);
    });

    it('should navigate "overdue" to the overdue due window with no status and reset the page', async () => {
      fixture = await createPage();
      fixture.componentInstance['page'].set(3);

      fixture.componentInstance['onViewChanged']('overdue');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {
            status: null,
            type: null,
            priority: null,
            site: null,
            responsible: null,
            label: null,
            mine: null,
            due: 'overdue',
          },
          queryParamsHandling: 'merge',
        }),
      );
      expect(fixture.componentInstance['page']()).toBe(1);
    });

    it('should navigate "sent-back" to status changes_requested with no due window and reset the page', async () => {
      fixture = await createPage();
      fixture.componentInstance['page'].set(3);

      fixture.componentInstance['onViewChanged']('sent-back');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {
            status: 'changes_requested',
            type: null,
            priority: null,
            site: null,
            responsible: null,
            label: null,
            mine: null,
            due: null,
          },
          queryParamsHandling: 'merge',
        }),
      );
      expect(fixture.componentInstance['page']()).toBe(1);
    });

    it('should navigate "awaiting-review" to status submitted with no due window and reset the page', async () => {
      fixture = await createPage();
      fixture.componentInstance['page'].set(3);

      fixture.componentInstance['onViewChanged']('awaiting-review');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {
            status: 'submitted',
            type: null,
            priority: null,
            site: null,
            responsible: null,
            label: null,
            mine: null,
            due: null,
          },
          queryParamsHandling: 'merge',
        }),
      );
      expect(fixture.componentInstance['page']()).toBe(1);
    });
  });

  describe('filters visibility', () => {
    function toggleButton(): HTMLButtonElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="interventions-filters-toggle"]',
      );
    }

    function filterBar(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('#interventions-filter-bar');
    }

    it('should render collapsed with no badge when no filter is active on arrival', async () => {
      fixture = await createPage();

      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
      expect(filterBar()).toBeNull();
      expect(toggleButton()?.querySelector('hlm-badge')).toBeNull();
    });

    it('should mount the filter bar already expanded, with a badge count, when the URL carries an active filter', async () => {
      fixture = await createPage({ status: 'planned', priority: 'high' });

      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('true');
      expect(filterBar()).not.toBeNull();
      expect(toggleButton()?.querySelector('hlm-badge')?.textContent?.trim()).toBe('2');
    });

    it('should mount and unmount the bar as the toggle button is activated', async () => {
      fixture = await createPage();
      expect(filterBar()).toBeNull();

      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).not.toBeNull();
      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('true');

      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).toBeNull();
      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should stay expanded once auto-opened by a URL filter, even after that filter is cleared', async () => {
      fixture = await createPage({ status: 'planned' });
      expect(filterBar()).not.toBeNull();

      fixture.componentInstance['applyFilter']({ status: null });
      fixture.componentRef.setInput('status', undefined);
      await fixture.whenStable();

      expect(filterBar()).not.toBeNull();
    });
  });

  describe('filter chips', () => {
    it('should list every active field as an activeKey, in the catalog’s own keys', async () => {
      TestBed.overrideComponent(InterventionsPage, {
        remove: { providers: [InterventionPlanningOptionsStore] },
        add: {
          providers: [
            {
              provide: InterventionPlanningOptionsStore,
              useValue: {
                sites: signal<readonly SelectOption[]>([
                  { value: '/api/facilities/site-9', label: 'Warehouse 9' },
                ]),
                members: signal<readonly MemberSelectOption[]>([
                  {
                    value: '/api/organizations/org-1/members/member-9',
                    label: 'Jordan Lee',
                    displayName: 'Jordan Lee',
                    roleLabel: 'Technician',
                    avatarUrl: null,
                    initials: 'JL',
                  },
                ]),
                labels: signal<readonly InterventionLabelOutput[]>([
                  {
                    '@id': '/api/intervention-labels/label-9',
                    '@type': 'InterventionLabel',
                    id: 'label-9',
                    organization: '/api/organizations/org-1',
                    name: 'Compliance',
                    color: '#ff0000',
                    createdAt: '2026-01-01T00:00:00+00:00',
                    updatedAt: '2026-01-01T00:00:00+00:00',
                  },
                ]),
                templates: signal([]),
                hasTemplates: signal(false),
                loadCreationOptions: vi.fn(),
              },
            },
          ],
        },
      });

      fixture = await createPage({
        status: 'changes_requested',
        type: 'inventory',
        priority: 'high',
        site: 'site-9',
        responsible: 'member-9',
        label: 'label-9',
        due: 'today',
      });

      expect(fixture.componentInstance['activeFilterKeys']()).toEqual([
        'status',
        'type',
        'priority',
        'site',
        'responsible',
        'label',
        'dueWindow',
      ]);

      const triggers = ['status', 'type', 'priority', 'site', 'responsible', 'dueWindow'].map(
        (suffix: string) =>
          (fixture.nativeElement as HTMLElement).querySelector(
            `[data-testid="interventions-filter-${suffix === 'dueWindow' ? 'due' : suffix}"]`,
          ),
      );
      expect(triggers.every((trigger) => trigger !== null)).toBe(true);
    });

    it('should still render an IRI-valued field’s chip while its option list is loading and its label cannot resolve yet', async () => {
      fixture = await createPage({ site: 'site-42', responsible: 'member-77', label: 'label-88' });

      expect(fixture.componentInstance['activeFilterKeys']()).toEqual([
        'site',
        'responsible',
        'label',
      ]);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="interventions-filter-site"]',
        ),
      ).not.toBeNull();
    });

    it('should apply the chip’s own patch when its remove button is clicked', async () => {
      fixture = await createPage({ status: 'planned' });

      const removeButton: HTMLButtonElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('[data-testid="interventions-filter-chip-remove"]');
      removeButton?.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: expect.objectContaining({ status: null }),
          queryParamsHandling: 'merge',
        }),
      );
    });

    it('should name a chip’s remove button by its field label', async () => {
      fixture = await createPage({ status: 'planned' });

      const removeButton: HTMLButtonElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('[data-testid="interventions-filter-chip-remove"]');

      expect(removeButton?.getAttribute('aria-label')).toBe('Remove filter: Status');
    });

    it('should name a chip’s value segment by its field label, distinctly from the remove button', async () => {
      fixture = await createPage();

      expect(fixture.componentInstance['changeFilterLabel']('Status')).toBe(
        'Change filter: Status',
      );
    });

    it('should force a field’s selector open when the bar reports it picked', async () => {
      fixture = await createPage();

      fixture.componentInstance['onFieldPicked']('site');
      await fixture.whenStable();

      expect(fixture.componentInstance['fieldPopoverState']('site')).toBe('open');
    });

    it('should clear the forced-open field once its selector reports closed', async () => {
      fixture = await createPage();

      fixture.componentInstance['onFieldPicked']('site');
      fixture.componentInstance['onFieldPopoverStateChanged']('site', 'closed');
      await fixture.whenStable();

      expect(fixture.componentInstance['fieldPopoverState']('site')).toBe('closed');
    });

    it('should not clear the forced-open field when a different field’s selector closes', async () => {
      fixture = await createPage();

      fixture.componentInstance['onFieldPicked']('site');
      fixture.componentInstance['onFieldPopoverStateChanged']('responsible', 'closed');
      await fixture.whenStable();

      expect(fixture.componentInstance['fieldPopoverState']('site')).toBe('open');
    });
  });
});
