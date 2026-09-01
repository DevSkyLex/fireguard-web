import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  input,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, of, throwError } from 'rxjs';
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
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  InterventionRecurrenceService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionAllowedActionsOutput,
  InterventionOutput,
  InterventionRecurrenceOutput,
} from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { ORGANIZATION_CONTEXT_PORT, REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import { InterventionStatisticsStore } from '../../../../state/intervention-statistics';
import { InterventionRecurrenceDeleteDialog } from '../../../dialogs/intervention-recurrence-delete-dialog';
import { InterventionRecurrenceTable } from '../../../tables/intervention-recurrence-table';
import { InterventionsPage } from '../interventions-page.component';

/**
 * The `allowedActions` block the backend would compute for a fully-permitted
 * caller: `canDelete` follows the deletable-status window these tests assume.
 */
const serverActions = (status: InterventionOutput['status']): InterventionAllowedActionsOutput => ({
  canEditDetails: false,
  canEditSite: false,
  canEditResponsible: false,
  canEditPlanning: false,
  canMutateWorkItems: false,
  canMutateChanges: false,
  canAssignTeam: false,
  canManageAttachments: false,
  canSubmit: false,
  canWithdraw: false,
  canDelete: status === 'draft' || status === 'abandoned',
  canPublish: false,
});

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
    allowedActions: serverActions(overrides.status ?? 'planned'),
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

const recurrence = (
  overrides: Partial<InterventionRecurrenceOutput> = {},
): InterventionRecurrenceOutput =>
  ({
    id: 'rec-1',
    organization: '/api/organizations/org-1',
    template: '/api/intervention-templates/t-1',
    name: 'Monthly extinguisher check',
    site: null,
    responsible: null,
    frequency: 'monthly',
    interval: 1,
    anchorDate: '2026-08-01T09:00:00+00:00',
    timezone: 'Europe/Paris',
    leadTimeDays: 3,
    nextOccurrenceAt: '2026-09-01T09:00:00+00:00',
    lastMaterializedAt: null,
    isActive: true,
    endAt: null,
    createdAt: '2026-08-01T09:00:00+00:00',
    updatedAt: '2026-08-01T09:00:00+00:00',
    ...overrides,
  }) as InterventionRecurrenceOutput;

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
 * Stands in for the shell's `DashboardPageActions` — the tab selector and
 * "New intervention" render through `PageActionsService`, never inside this
 * page's own `fixture.nativeElement`, so proving them means rendering the
 * registered `TemplateRef` the same way the real shell does.
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
  let transitioningInterventionIds: WritableSignal<readonly string[]>;
  let createdInterventionId: WritableSignal<string | null>;
  let listError: WritableSignal<unknown>;
  let pendingDuplicatePrefill: WritableSignal<unknown>;
  let totalInterventions: WritableSignal<number>;
  let servedFromLocalCache: WritableSignal<boolean>;
  let exportCsv: ReturnType<typeof vi.fn>;
  let feedbackWarn: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;

  /**
   * jsdom implements neither, and the chips' spartan selects reach for both:
   * the popover observes its anchor, and the multiple select scrolls its
   * active option into view the moment "is any of" renders one.
   */
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      public observe(): void {}
      public unobserve(): void {}
      public disconnect(): void {}
    } as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
  });

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
    transitioningInterventionIds = signal<readonly string[]>([]);
    createdInterventionId = signal<string | null>(null);
    listError = signal<unknown>(null);
    pendingDuplicatePrefill = signal<unknown>(null);
    totalInterventions = signal<number>(0);
    servedFromLocalCache = signal<boolean>(false);
    exportCsv = vi.fn().mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })));
    feedbackWarn = vi.fn();
    feedbackError = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal(null) },
        },
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
            transitioningInterventionIds,
            createdInterventionId,
            listError,
            pendingDuplicatePrefill,
            totalInterventions,
            servedFromLocalCache,
            isLoadingInterventions: signal(false),
            isCreating: signal(false),
            createError: signal(null),
            isInstantiatingFromTemplate: signal(false),
            assignCallState: signal({ status: 'idle' }),
          },
        },
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
        {
          provide: OrganizationPermissionService,
          useValue: { hasAnyPermission: (): boolean => true, hasPermission: (): boolean => true },
        },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { profile: signal({ id: 'member-1' }) },
        },
        {
          provide: InterventionStatisticsStore,
          useValue: { load: vi.fn(), queryData: signal(null), isQueryLoading: signal(false) },
        },
        {
          provide: InterventionService,
          useValue: {
            exportCsv,
            statistics: vi.fn().mockReturnValue(of(null)),
            listCalendarWindow: vi.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: InterventionRecurrenceService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            remove: vi.fn().mockReturnValue(of(undefined)),
          },
        },
        {
          provide: OrganizationMemberService,
          useValue: { getCurrentProfile: vi.fn().mockReturnValue(of({ id: 'member-1' })) },
        },
        {
          provide: FeedbackService,
          useValue: { warn: feedbackWarn, error: feedbackError },
        },
        { provide: Router, useValue: { navigate, events: EMPTY } },
        { provide: ActivatedRoute, useValue: {} },
      ],
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

  it('should send a repeated status when the URL carries a comma-separated "isAnyOf" value', async () => {
    fixture = await createPage({ status: 'planned,in_progress' });

    expect(load.mock.calls.at(-1)?.[0].options.status).toEqual(['planned', 'in_progress']);
  });

  it('should send a scalar status from a single-valued "equals" filter', async () => {
    fixture = await createPage({ status: 'planned' });

    expect(load.mock.calls.at(-1)?.[0].options.status).toBe('planned');
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
    fixture.componentRef.setInput('status', 'draft');
    await fixture.whenStable();

    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should reset the page even when the shell — not this page — wrote the URL', async () => {
    totalInterventions.set(500);
    fixture = await createPage();

    fixture.componentInstance['goToPage'](2);
    await fixture.whenStable();
    expect(fixture.componentInstance['page']()).toBe(2);

    fixture.componentRef.setInput('q', 'sweep');
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

  it('should leave ?create=1 untouched on the server so the hydrated browser can honour it', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    fixture = await createPage({ create: '1' });

    expect(navigate).not.toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { create: null } }),
    );
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

  it('should hand the picked template and its overrides straight to the store', async () => {
    fixture = await createPage();

    fixture.componentInstance['instantiateFromTemplate']({
      templateId: 'template-1',
      name: 'Spring round',
    });

    expect(instantiateFromTemplate).toHaveBeenCalledWith({
      templateId: 'template-1',
      name: 'Spring round',
    });
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

    it('should skip a selected row whose own transition is still in flight', async () => {
      interventionList.set([
        intervention({ id: 'i-1', allowedTransitions: ['abandoned'] }),
        intervention({ id: 'i-2', allowedTransitions: ['abandoned'] }),
      ]);
      transitioningInterventionIds.set(['i-2']);
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

    it('should request the export from the service with the current filters and sort, then trigger the download', async () => {
      totalInterventions.set(2);
      fixture = await createPage({ status: 'planned', q: 'sweep' });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(exportCsv).toHaveBeenCalledTimes(1);
      expect(exportCsv.mock.calls[0][0]).toBe('org-1');
      expect(exportCsv.mock.calls[0][1]).toMatchObject({ status: 'planned', name: 'sweep' });
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['exportBusy']()).toBe(false);
    });

    it('should drop a filter the export endpoint does not accept and warn once', async () => {
      totalInterventions.set(2);
      fixture = await createPage({ mine: '1' });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(exportCsv.mock.calls[0][1]).not.toHaveProperty('member');
      expect(feedbackWarn).toHaveBeenCalledTimes(1);
    });

    it('should not warn when every active filter is exportable', async () => {
      totalInterventions.set(2);
      fixture = await createPage({ status: 'planned' });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).not.toHaveBeenCalled();
    });

    it('should clear the busy flag and report a generic failure when the request errors without a parseable detail', async () => {
      totalInterventions.set(2);
      exportCsv.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(fixture.componentInstance['exportBusy']()).toBe(false);
      expect(feedbackError).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should surface the RFC 7807 detail from a 422 export-cap response', async () => {
      totalInterventions.set(2);
      const problem = new Blob(
        [
          JSON.stringify({
            '@type': 'Error',
            status: 422,
            detail: 'Export capped at 50,000 rows.',
          }),
        ],
        {
          type: 'application/problem+json',
        },
      );
      exportCsv.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 422, error: problem })),
      );
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      await vi.waitFor(() =>
        expect(feedbackError).toHaveBeenCalledWith('Export capped at 50,000 rows.'),
      );
    });

    it('should mark the export button busy and announce it while the export is in flight', async () => {
      totalInterventions.set(5);
      fixture = await createPage();
      const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

      expect(
        root().querySelector('[data-testid="interventions-export"]')?.getAttribute('aria-busy'),
      ).toBeNull();

      fixture.componentInstance['exportBusy'].set(true);
      await fixture.whenStable();

      expect(
        root().querySelector('[data-testid="interventions-export"]')?.getAttribute('aria-busy'),
      ).toBe('true');
      expect(root().querySelector('[data-testid="interventions-export-status"]')).not.toBeNull();
    });
  });

  describe('tabs', () => {
    it('should default to the List tab when no ?view= is present', async () => {
      fixture = await createPage();

      expect(fixture.componentInstance['activeView']()).toBe('list');
      expect((fixture.nativeElement as HTMLElement).querySelector('#interventions')).not.toBeNull();
    });

    it('should read the Board tab from ?view=board', async () => {
      fixture = await createPage({ view: 'board' });

      expect(fixture.componentInstance['activeView']()).toBe('board');
    });

    it('should fall back to List for an unrecognised ?view= value', async () => {
      fixture = await createPage({ view: 'bogus' });

      expect(fixture.componentInstance['activeView']()).toBe('list');
    });

    it('should write ?view=board while keeping a status the Board does not honour', async () => {
      fixture = await createPage({ status: 'planned' });

      fixture.componentInstance['switchView']('board');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { view: 'board' } }),
      );
      expect(navigate).not.toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ status: null }) }),
      );
    });

    it("should carry no reason in the chip's accessible name even for a field the Board does not honour", async () => {
      fixture = await createPage({ status: 'planned', view: 'board' });

      const name: string = fixture.componentInstance['chipAccessibleName']('status');

      expect(fixture.componentInstance['honouredFilterKeys']().has('status')).toBe(false);
      expect(name).not.toContain('Ignored');
    });

    it('should leave the accessible name reason-free on a tab that honours the field', async () => {
      fixture = await createPage({ status: 'planned' });

      expect(fixture.componentInstance['chipAccessibleName']('status')).not.toContain('Ignored');
    });

    it('should offer every field in the "+ Filter" menu on the List', async () => {
      fixture = await createPage();

      const offered: readonly string[] = fixture.componentInstance['offeredFilterFields']().map(
        (field: { key: string }): string => field.key,
      );

      expect(offered).toEqual([
        'status',
        'type',
        'priority',
        'site',
        'responsible',
        'label',
        'dueRange',
        'plannedStartRange',
        'dueWindow',
      ]);
    });

    it('should withhold status from the "+ Filter" menu on the Board rather than offering it disabled', async () => {
      fixture = await createPage({ view: 'board' });

      const offered: readonly string[] = fixture.componentInstance['offeredFilterFields']().map(
        (field: { key: string }): string => field.key,
      );

      expect(offered).not.toContain('status');
      expect(offered).toContain('type');
    });

    it('should offer only status, type, site and responsible on the Calendar', async () => {
      fixture = await createPage({ view: 'calendar' });

      const offered: readonly string[] = fixture.componentInstance['offeredFilterFields']().map(
        (field: { key: string }): string => field.key,
      );

      expect(offered).toEqual(['status', 'type', 'site', 'responsible']);
    });

    it('should leave an unhonoured narrowing out of the Filters badge while still charting it', async () => {
      fixture = await createPage({ status: 'planned', view: 'board' });

      expect(fixture.componentInstance['activeFilterKeys']()).toContain('status');
      expect(fixture.componentInstance['honouredActiveFilterKeys']()).toEqual([]);
    });

    it('should count only what the active tab applies when both kinds are set', async () => {
      fixture = await createPage({ status: 'planned', type: 'inventory', view: 'board' });

      expect(fixture.componentInstance['activeFilterKeys']()).toHaveLength(2);
      expect(fixture.componentInstance['honouredActiveFilterKeys']()).toEqual(['type']);
    });

    it('should keep the chip on screen after an operator switch drops its value', async () => {
      fixture = await createPage({ dueAfter: '2026-08-01' });

      fixture.componentInstance['onFilterOperatorChanged']({
        key: 'dueRange',
        operator: 'between',
      });
      await fixture.whenStable();

      expect(fixture.componentInstance['openFilterKey']()).toBe('dueRange');
    });

    it('should carry a single value from "is" to "is any of"', async () => {
      fixture = await createPage({ status: 'planned' });

      fixture.componentInstance['onFilterOperatorChanged']({
        key: 'status',
        operator: 'isAnyOf',
      });
      await fixture.whenStable();

      expect(fixture.componentInstance['enumFieldOperator']('status')).toBe('isAnyOf');
      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ status: 'planned' }) }),
      );
    });

    it('should drop a multi-value narrowing that "is" cannot represent', async () => {
      fixture = await createPage({ status: 'planned,submitted' });

      fixture.componentInstance['onFilterOperatorChanged']({ key: 'status', operator: 'equals' });
      await fixture.whenStable();

      expect(fixture.componentInstance['enumFieldOperator']('status')).toBe('equals');
      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ status: null }) }),
      );
    });

    it('should let a picked operator outrank the value shape the URL round-trips to', async () => {
      fixture = await createPage({ status: 'planned' });

      expect(fixture.componentInstance['enumFieldOperator']('status')).toBe('equals');

      fixture.componentInstance['onFilterOperatorChanged']({
        key: 'status',
        operator: 'isAnyOf',
      });
      await fixture.whenStable();

      expect(fixture.componentInstance['enumFieldOperator']('status')).toBe('isAnyOf');
    });

    it('should count and clear the named due window, which had no chip at all', async () => {
      fixture = await createPage({ due: 'overdue' });

      expect(fixture.componentInstance['activeFilterKeys']()).toContain('dueWindow');

      fixture.componentInstance['onFieldRemoved']('dueWindow');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: expect.objectContaining({ due: null }) }),
      );
    });

    it('should keep an unhonoured field out of the catalog even while it is still set from another tab', async () => {
      fixture = await createPage({ status: 'planned', view: 'board' });

      expect(
        fixture.componentInstance['offeredFilterFields']().map(
          (field: { key: string }): string => field.key,
        ),
      ).not.toContain('status');
    });

    it('should write ?view=null (dropped) when switching back to List', async () => {
      fixture = await createPage({ view: 'board' });

      fixture.componentInstance['switchView']('list');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { view: null } }),
      );
    });

    it('should honour every filter field on the List tab', async () => {
      fixture = await createPage();
      const honoured: ReadonlySet<string> = fixture.componentInstance['honouredFilterKeys']();

      expect(honoured.has('status')).toBe(true);
      expect(honoured.has('dueRange')).toBe(true);
    });

    it('should not honour status on the Board tab', async () => {
      fixture = await createPage({ view: 'board' });
      const honoured: ReadonlySet<string> = fixture.componentInstance['honouredFilterKeys']();

      expect(honoured.has('status')).toBe(false);
      expect(honoured.has('type')).toBe(true);
    });

    it('should ignore priority, label and both date ranges on the Calendar tab', async () => {
      fixture = await createPage({ view: 'calendar' });
      const honoured: ReadonlySet<string> = fixture.componentInstance['honouredFilterKeys']();

      expect(honoured.has('priority')).toBe(false);
      expect(honoured.has('label')).toBe(false);
      expect(honoured.has('dueRange')).toBe(false);
      expect(honoured.has('status')).toBe(true);
    });

    it('should not render Display or Export outside the List tab', async () => {
      fixture = await createPage({ view: 'board' });
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('[data-testid="interventions-display"]')).toBeNull();
      expect(root.querySelector('[data-testid="interventions-export"]')).toBeNull();
    });

    it('should render the Recurrences tab trigger for a viewer with INTERVENTIONS_READ', async () => {
      fixture = await createPage();

      expect(
        renderPageActions().querySelector('[data-testid="interventions-tab-recurrences"]'),
      ).not.toBeNull();
    });

    it('should hide the Recurrences tab trigger for a viewer without INTERVENTIONS_READ', async () => {
      TestBed.overrideProvider(OrganizationPermissionService, {
        useValue: { hasAnyPermission: (): boolean => true, hasPermission: (): boolean => false },
      });
      fixture = await createPage();

      expect(
        renderPageActions().querySelector('[data-testid="interventions-tab-recurrences"]'),
      ).toBeNull();
    });
  });

  describe('page header', () => {
    it('should render the tab selector and "New intervention" through the shared page-actions template, on every tab', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const header: HTMLElement = renderPageActions();

      expect(header.querySelector('[data-testid="intervention-view-toggle"]')).not.toBeNull();
      expect(header.querySelector('[data-testid="intervention-view-toggle-list"]')).not.toBeNull();
      expect(header.querySelector('[data-testid="intervention-view-toggle-board"]')).not.toBeNull();
      expect(
        header.querySelector('[data-testid="intervention-view-toggle-calendar"]'),
      ).not.toBeNull();
      expect(header.querySelector('[data-testid="interventions-new"]')).not.toBeNull();
    });

    it('should keep no toolbar, mine toggle or filters toggle on the Recurrences tab', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('[data-testid="interventions-mine-toggle"]')).toBeNull();
      expect(root.querySelector('[data-testid="interventions-filters-toggle"]')).toBeNull();
      expect(root.querySelector('[data-testid="interventions-filter-chips"]')).toBeNull();
    });

    it('should keep the search box off the Calendar toolbar while keeping the mine toggle', async () => {
      fixture = await createPage({ view: 'calendar' });
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('[data-testid="interventions-search"]')).toBeNull();
      expect(root.querySelector('[data-testid="interventions-mine-toggle"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="interventions-filters-toggle"]')).not.toBeNull();
    });

    it('should render the search box and the filters toggle on the Board tab', async () => {
      fixture = await createPage({ view: 'board' });
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('[data-testid="interventions-search"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="interventions-filters-toggle"]')).not.toBeNull();
    });
  });

  describe('board', () => {
    it('should load one large page, status excluded, while the Board tab is active', async () => {
      fixture = await createPage({ view: 'board' });

      const boardCall = load.mock.calls.find((call) => call[0].options.itemsPerPage === 200);
      expect(boardCall).toBeDefined();
      expect(boardCall?.[0].options.status).toBeUndefined();
      expect(boardCall?.[0].options.page).toBe(1);
    });

    it('should never send a status narrowing to the Board even when the URL still carries one', async () => {
      fixture = await createPage({ view: 'board', status: 'planned' });

      const boardCall = load.mock.calls.find((call) => call[0].options.itemsPerPage === 200);
      expect(boardCall?.[0].options.status).toBeUndefined();
    });

    it('should send a legal move from the Board straight to the store, trusting the board already validated it', async () => {
      fixture = await createPage({ view: 'board' });

      fixture.componentInstance['applyTransition']({
        intervention: intervention({ id: 'i-9', revision: 7 }),
        status: 'planned',
      });

      expect(transition).toHaveBeenCalledWith({ id: 'i-9', status: 'planned', revision: 7 });
    });
  });

  describe('calendar', () => {
    it('should not fetch the calendar window before the Calendar tab first activates', async () => {
      fixture = await createPage({ view: 'board' });

      const calendarService = TestBed.inject(InterventionService);
      expect(calendarService.listCalendarWindow).not.toHaveBeenCalled();
    });

    it('should fetch the calendar window once InterventionCalendar mounts and reports its first anchor', async () => {
      fixture = await createPage({ view: 'calendar' });

      const calendarService = TestBed.inject(InterventionService);
      expect(calendarService.listCalendarWindow).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['calendarMonth']()).not.toBeNull();
    });

    it('should re-fetch the calendar window on calendarReload', async () => {
      fixture = await createPage({ view: 'calendar' });
      const calendarService = TestBed.inject(InterventionService);
      (calendarService.listCalendarWindow as ReturnType<typeof vi.fn>).mockClear();

      fixture.componentInstance['calendarReload']();
      await fixture.whenStable();

      expect(calendarService.listCalendarWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('recurrences', () => {
    it('should show the tab content and load the list once when the Recurrences tab activates', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const recurrenceService = TestBed.inject(InterventionRecurrenceService);
      const root = fixture.nativeElement as HTMLElement;

      expect(root.querySelector('[data-testid="intervention-recurrences-new"]')).not.toBeNull();
      expect(recurrenceService.list).toHaveBeenCalledTimes(1);
    });

    it('should not refetch the list when switching away from and back to the Recurrences tab', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const recurrenceService = TestBed.inject(InterventionRecurrenceService);

      fixture.componentRef.setInput('view', 'list');
      await fixture.whenStable();
      fixture.componentRef.setInput('view', 'recurrences');
      await fixture.whenStable();

      expect(recurrenceService.list).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the List tab for a viewer without INTERVENTIONS_READ', async () => {
      TestBed.overrideProvider(OrganizationPermissionService, {
        useValue: { hasAnyPermission: (): boolean => true, hasPermission: (): boolean => false },
      });
      fixture = await createPage({ view: 'recurrences' });

      expect(fixture.componentInstance['activeView']()).toBe('list');
    });

    it('should open the recurrence sheet on a blank draft when "New recurrence" is clicked', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const root = fixture.nativeElement as HTMLElement;

      const newButton: HTMLButtonElement | null = root.querySelector(
        '[data-testid="intervention-recurrences-new"]',
      );
      newButton?.dispatchEvent(new Event('click', { bubbles: true }));
      await fixture.whenStable();

      expect(fixture.componentInstance['recurrenceTarget']()).toBe('create');
    });

    it('should raise the delete confirmation with the row the table asked to remove', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const row: InterventionRecurrenceOutput = recurrence({ id: 'rec-2' });

      fixture.debugElement
        .query(By.directive(InterventionRecurrenceTable))
        .componentInstance.removed.emit(row);
      await fixture.whenStable();

      expect(fixture.componentInstance['pendingRecurrenceDelete']()).toEqual(row);
      expect(
        fixture.debugElement
          .query(By.directive(InterventionRecurrenceDeleteDialog))
          .componentInstance.recurrence(),
      ).toEqual(row);
    });

    it('should send the confirmed recurrence to the store for deletion', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const recurrenceService = TestBed.inject(InterventionRecurrenceService);
      const row: InterventionRecurrenceOutput = recurrence({ id: 'rec-3' });

      fixture.componentInstance['requestRecurrenceDelete'](row);
      await fixture.whenStable();
      fixture.componentInstance['confirmRecurrenceDelete']();
      await fixture.whenStable();

      expect(recurrenceService.remove).toHaveBeenCalledWith('rec-3');
    });

    it('should close the delete dialog once the removal succeeds', async () => {
      fixture = await createPage({ view: 'recurrences' });
      const recurrenceService = TestBed.inject(InterventionRecurrenceService);
      const removeSubject = new Subject<void>();
      (recurrenceService.remove as ReturnType<typeof vi.fn>).mockReturnValue(removeSubject);
      const row: InterventionRecurrenceOutput = recurrence({ id: 'rec-4' });

      fixture.componentInstance['requestRecurrenceDelete'](row);
      await fixture.whenStable();
      fixture.componentInstance['confirmRecurrenceDelete']();
      await fixture.whenStable();
      expect(fixture.componentInstance['pendingRecurrenceDelete']()).toEqual(row);

      removeSubject.next();
      removeSubject.complete();
      await fixture.whenStable();

      expect(fixture.componentInstance['pendingRecurrenceDelete']()).toBeNull();
    });
  });

  describe('query-param filtering', () => {
    it("should load the overdue due window when the URL carries ?due=overdue — the KPI strip's overdue tile link", async () => {
      fixture = await createPage({ due: 'overdue' });

      expect(load).toHaveBeenCalledTimes(1);
      const options = load.mock.calls[0][0].options;
      expect(options.status).toBeUndefined();
      expect(options.due).toBe('overdue');
      expect(options.dueAtBefore).toBeUndefined();
    });

    it("should load the submitted status when the URL carries ?status=submitted — the KPI strip's awaiting-review tile link", async () => {
      fixture = await createPage({ status: 'submitted' });

      expect(load).toHaveBeenCalledTimes(1);
      expect(load.mock.calls[0][0].options).toMatchObject({ status: 'submitted' });
    });

    it('should load an unfiltered list when neither query param is present', async () => {
      fixture = await createPage();

      expect(load).toHaveBeenCalledTimes(1);
      const options = load.mock.calls[0][0].options;
      expect(options.status).toBeUndefined();
      expect(options.dueAtBefore).toBeUndefined();
    });
  });
});
