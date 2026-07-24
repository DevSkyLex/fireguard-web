import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import {
  InterventionFieldExecutionService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import { InterventionDiscoveryService } from '@features/organization/features/interventions/services/intervention-discovery';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import {
  ActiveInterventionStore,
  InterventionStore,
} from '@features/organization/features/interventions/state';
import { InterventionPlanningOptionsStore } from '@features/organization/features/interventions/state/intervention-planning-options';
import { InterventionWorkspaceStore } from '@features/organization/features/interventions/state/intervention-workspace';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import { InterventionDetailPage } from '../intervention-detail.component';

/**
 * Base {@link InterventionOutput} fixture for the rendering describe block:
 * every field is populated so the real template (identity block, stage
 * progress, checklist, rail) renders every branch without hitting `undefined`
 * property reads. Individual tests override only the fields relevant to the
 * scenario under test.
 */
function buildIntervention(overrides: Partial<InterventionOutput> = {}): InterventionOutput {
  return {
    '@id': '/api/interventions/i-1',
    '@type': 'Intervention',
    id: 'i-1',
    organization: '/api/organizations/org-1',
    number: 42,
    type: 'inspection_campaign',
    name: 'Roof inspection',
    description: 'Check the roof access hatches.',
    status: 'draft',
    allowedTransitions: ['planned', 'abandoned'],
    site: '/api/facilities/site-1',
    responsible: '/api/organizations/org-1/members/member-1',
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: '2026-01-10T09:00:00Z',
    dueAt: '2026-01-20T17:00:00Z',
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  } as InterventionOutput;
}

interface ConfirmConfig {
  readonly header?: string;
  readonly accept?: () => void;
}

type InterventionDetailPageHarness = {
  readonly phase: () => 'prepare' | 'execute' | 'review';
  readonly showPrevNext: () => boolean;
  readonly prevInterventionId: () => string | null;
  readonly nextInterventionId: () => string | null;
  readonly transitionMenuItems: () => MenuItem[];
  readonly blockerIssues: () => readonly InterventionIssueOutput[];
  readonly pendingChangesCount: () => number;
  readonly readyToPublish: () => boolean;
  readonly canRequestChanges: () => boolean;
  readonly showPlanningGuide: () => boolean;
  readonly activityExpanded: { (): boolean; set(value: boolean): void };
  readonly workItemsExpanded: { (): boolean; set(value: boolean): void };
  saveGuideStep(values: Record<string, unknown>): void;
  readonly requestChangesDrawerVisible: { (): boolean; set(value: boolean): void };
  readonly editDrawerVisible: { (): boolean; set(value: boolean): void };
  readonly labelsEditorOpen: { (): boolean; set(value: boolean): void };
  readonly labelSelectionControl: { value: string[]; setValue(value: string[]): void };
  planIntervention(): void;
  updateWorkItem(event: InterventionWorkItemStatusChange): void;
  confirmDeleteWorkItems(workItems: readonly InterventionWorkItemOutput[]): void;
  isWorkItemDone(item: InterventionWorkItemOutput): boolean;
  toggleWorkItemComplete(item: InterventionWorkItemOutput): void;
  checklistRowHasActions(item: InterventionWorkItemOutput): boolean;
  readonly canAddDiscovery: () => boolean;
  readonly canEditPlanning: () => boolean;
  readonly canEditDetails: () => boolean;
  readonly descriptionEditorOpen: { (): boolean; set(value: boolean): void };
  readonly descriptionControl: { value: string; setValue(value: string): void };
  openDescriptionEditor(): void;
  saveDescription(): void;
  onTransitionSelect(status: InterventionOutput['status']): void;
  navigatePrev(): void;
  navigateNext(): void;
  readonly listPosition: () => string | null;
  readonly stageDetail: () => string | null;
  addComment(body: string): void;
  openLabelsEditor(): void;
  saveLabels(): void;
  savePlanningDetails(values: {
    site: string;
    responsible: string;
    participants: readonly string[];
    priority: InterventionOutput['priority'];
    plannedStartAt: Date | null;
    dueAt: Date | null;
    description: string;
  }): void;
};

describe('InterventionDetailPage', () => {
  let store: {
    intervention: ReturnType<typeof signal<InterventionOutput | null>>;
    workItems: ReturnType<typeof signal<readonly InterventionWorkItemOutput[]>>;
    issues: ReturnType<typeof signal<readonly InterventionIssueOutput[]>>;
    changes: ReturnType<typeof signal<readonly unknown[]>>;
    activities: ReturnType<typeof signal<readonly unknown[]>>;
    activityCallState: ReturnType<typeof signal<{ status: string }>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    progress: ReturnType<typeof signal<number>>;
    blockerCount: ReturnType<typeof signal<number>>;
    nextWorkItem: ReturnType<typeof signal<InterventionWorkItemOutput | null>>;
    transition: ReturnType<typeof vi.fn>;
    setWorkItemStatus: ReturnType<typeof vi.fn>;
    deleteWorkItems: ReturnType<typeof vi.fn>;
    updateDetails: ReturnType<typeof vi.fn>;
    addComment: ReturnType<typeof vi.fn>;
    loadActivities: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };
  let interventionListStore: { orderedIds: ReturnType<typeof signal<readonly string[]>> };
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function build(): InterventionDetailPageHarness {
    const fixture = TestBed.createComponent(InterventionDetailPage);
    fixture.componentRef.setInput('interventionId', 'i-1');
    return fixture.componentInstance as unknown as InterventionDetailPageHarness;
  }

  beforeAll(() => {
    const windowWithResizeObserver = window as Window & {
      ResizeObserver?: typeof ResizeObserver;
    };
    if (typeof windowWithResizeObserver.ResizeObserver === 'undefined') {
      class ResizeObserverMock {
        public readonly observe = vi.fn();
        public readonly unobserve = vi.fn();
        public readonly disconnect = vi.fn();
      }
      windowWithResizeObserver.ResizeObserver =
        ResizeObserverMock as unknown as typeof ResizeObserver;
    }
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });
  });

  beforeEach(() => {
    store = {
      intervention: signal<InterventionOutput | null>(null),
      workItems: signal<readonly InterventionWorkItemOutput[]>([]),
      issues: signal<readonly InterventionIssueOutput[]>([]),
      changes: signal<readonly unknown[]>([]),
      activities: signal<readonly unknown[]>([]),
      activityCallState: signal<{ status: string }>({ status: 'idle' }),
      loading: signal(false),
      saving: signal(false),
      error: signal<string | null>(null),
      progress: signal(0),
      blockerCount: signal(0),
      nextWorkItem: signal<InterventionWorkItemOutput | null>(null),
      transition: vi.fn(),
      setWorkItemStatus: vi.fn(),
      deleteWorkItems: vi.fn(),
      updateDetails: vi.fn(),
      addComment: vi.fn(),
      loadActivities: vi.fn(),
      load: vi.fn(),
      clearError: vi.fn(),
    };
    interventionListStore = { orderedIds: signal<readonly string[]>([]) };
    confirmationService = { confirm: vi.fn() };
    router = { navigate: vi.fn() };

    const planningOptions = {
      sites: signal([]),
      members: signal([]),
      targets: signal([]),
      equipmentTypes: signal([]),
      labels: signal([]),
      loadWorkspaceOptions: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [InterventionDetailPage],
      providers: [
        provideRouter([]),
        { provide: ConfirmationService, useValue: confirmationService },
        {
          provide: ConnectivityService,
          useValue: { online: signal(true), isOffline: () => false },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        { provide: InterventionOfflineService, useValue: { hasUnsyncedChanges: () => false } },
        {
          provide: InterventionSyncCoordinatorService,
          useValue: {
            discardBlocked: vi.fn(),
            blockedOperations: () => 0,
            problem: () => null,
            syncing: () => false,
            retryBlocked: vi.fn(),
            syncAll: vi.fn(),
          },
        },
        {
          provide: InterventionFieldExecutionService,
          useValue: { scanSupported: () => false, scan: vi.fn(), attachPhoto: vi.fn() },
        },
        {
          provide: InterventionDiscoveryService,
          useValue: { create: vi.fn(), normalizeScannedTarget: (value: string) => value },
        },
        { provide: InterventionPublicationService, useValue: { publish: vi.fn() } },
        { provide: ActiveInterventionStore, useValue: { setIntervention: vi.fn() } },
        { provide: InterventionStore, useValue: interventionListStore },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
        { provide: OrganizationMemberAccessStore, useValue: { profile: signal(null) } },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(EMPTY) } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).overrideComponent(InterventionDetailPage, {
      set: {
        providers: [
          { provide: InterventionWorkspaceStore, useValue: store },
          { provide: InterventionPlanningOptionsStore, useValue: planningOptions },
        ],
      },
    });
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('should derive the workspace phase from the intervention status', () => {
    const harness = build();

    expect(harness.phase()).toBe('prepare');

    store.intervention.set({ status: 'planned' } as InterventionOutput);
    expect(harness.phase()).toBe('execute');

    store.intervention.set({ status: 'in_progress' } as InterventionOutput);
    expect(harness.phase()).toBe('execute');

    store.intervention.set({ status: 'submitted' } as InterventionOutput);
    expect(harness.phase()).toBe('review');
  });

  it('should transition the intervention to planned', () => {
    build().planIntervention();

    expect(store.transition).toHaveBeenCalledWith({ interventionId: 'i-1', status: 'planned' });
  });

  it('should forward a work-item status change to the store', () => {
    build().updateWorkItem({ workItemId: 'wi-1', status: 'completed' });

    expect(store.setWorkItemStatus).toHaveBeenCalledWith({
      interventionId: 'i-1',
      workItemId: 'wi-1',
      status: 'completed',
    });
  });

  it('should toggle a checklist row between completed and planned', () => {
    const harness = build();
    const item = { id: 'wi-1', status: 'planned' } as InterventionWorkItemOutput;

    expect(harness.isWorkItemDone(item)).toBe(false);
    harness.toggleWorkItemComplete(item);
    expect(store.setWorkItemStatus).toHaveBeenCalledWith({
      interventionId: 'i-1',
      workItemId: 'wi-1',
      status: 'completed',
    });

    const done = { id: 'wi-1', status: 'completed' } as InterventionWorkItemOutput;
    expect(harness.isWorkItemDone(done)).toBe(true);
    harness.toggleWorkItemComplete(done);
    expect(store.setWorkItemStatus).toHaveBeenLastCalledWith({
      interventionId: 'i-1',
      workItemId: 'wi-1',
      status: 'planned',
    });
  });

  it('exposes checklist row actions in draft so the row menu renders (regression: it was gated on the active item)', () => {
    store.intervention.set({ status: 'draft' } as InterventionOutput);
    const harness = build();
    const item = { id: 'wi-1', status: 'planned', target: null } as InterventionWorkItemOutput;

    // Draft + can plan + online → the delete action alone makes the row menu non-empty.
    expect(harness.checklistRowHasActions(item)).toBe(true);
  });

  it('offers checklist row actions (photo, skip) for work items during execution', () => {
    store.intervention.set({ status: 'planned' } as InterventionOutput); // execute phase
    const harness = build();
    const equipment = {
      id: 'wi-1',
      status: 'planned',
      target: '/api/equipment/eq-1',
    } as InterventionWorkItemOutput;
    const siteLevel = { id: 'wi-2', status: 'planned', target: null } as InterventionWorkItemOutput;

    expect(harness.canAddDiscovery()).toBe(true);
    expect(harness.checklistRowHasActions(equipment)).toBe(true); // attach photo + skip
    expect(harness.checklistRowHasActions(siteLevel)).toBe(true); // skip
  });

  it('exposes no checklist row actions for a resolved item outside draft and execution', () => {
    store.intervention.set({ status: 'published' } as InterventionOutput); // review phase, not draft
    const harness = build();
    const resolved = {
      id: 'wi-1',
      status: 'completed',
      target: null,
    } as InterventionWorkItemOutput;

    expect(harness.canAddDiscovery()).toBe(false);
    expect(harness.checklistRowHasActions(resolved)).toBe(false);
  });

  it('should freeze planning edits once the intervention leaves draft', () => {
    store.intervention.set({ status: 'draft' } as InterventionOutput);
    const harness = build();

    expect(harness.canEditPlanning()).toBe(true);
    expect(harness.canEditDetails()).toBe(true);

    // The backend rejects planning-field patches after planning (409), but
    // keeps description and labels mutable until a terminal status.
    store.intervention.set({ status: 'in_progress' } as InterventionOutput);
    expect(harness.canEditPlanning()).toBe(false);
    expect(harness.canEditDetails()).toBe(true);

    store.intervention.set({ status: 'published' } as InterventionOutput);
    expect(harness.canEditDetails()).toBe(false);
  });

  it('should merge-patch only the description from the inline editor', () => {
    store.intervention.set({
      status: 'in_progress',
      description: 'Old notes',
    } as InterventionOutput);
    const harness = build();

    harness.openDescriptionEditor();
    expect(harness.descriptionEditorOpen()).toBe(true);
    expect(harness.descriptionControl.value).toBe('Old notes');

    harness.descriptionControl.setValue('  New notes  ');
    harness.saveDescription();

    expect(store.updateDetails).toHaveBeenCalledWith({
      interventionId: 'i-1',
      input: { description: 'New notes' },
    });
    expect(harness.descriptionEditorOpen()).toBe(false);
  });

  it('should confirm before deleting work items and delete on accept', () => {
    const workItems = [{ id: 'wi-1' }] as unknown as readonly InterventionWorkItemOutput[];

    build().confirmDeleteWorkItems(workItems);

    expect(confirmationService.confirm).toHaveBeenCalledTimes(1);
    const config = confirmationService.confirm.mock.calls[0][0] as ConfirmConfig;
    expect(config.header).toBe('Delete work item');
    expect(store.deleteWorkItems).not.toHaveBeenCalled();

    config.accept?.();
    expect(store.deleteWorkItems).toHaveBeenCalledWith({ interventionId: 'i-1', workItems });
  });

  it('should not open a confirmation for an empty deletion request', () => {
    build().confirmDeleteWorkItems([]);

    expect(confirmationService.confirm).not.toHaveBeenCalled();
  });

  it('should hide prev/next when the current id is not in the cached list ordering', () => {
    interventionListStore.orderedIds.set(['other-1', 'other-2']);
    const harness = build();

    expect(harness.showPrevNext()).toBe(false);
    expect(harness.prevInterventionId()).toBeNull();
    expect(harness.nextInterventionId()).toBeNull();
  });

  it('should expose and navigate to the neighbour ids from the cached list ordering', () => {
    interventionListStore.orderedIds.set(['i-0', 'i-1', 'i-2']);
    const harness = build();

    expect(harness.showPrevNext()).toBe(true);
    expect(harness.prevInterventionId()).toBe('i-0');
    expect(harness.nextInterventionId()).toBe('i-2');

    harness.navigateNext();
    expect(router.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'i-2',
    ]);

    harness.navigatePrev();
    expect(router.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'i-0',
    ]);
  });

  it('should expose the list position only when the id is in the cached ordering', () => {
    interventionListStore.orderedIds.set(['i-0', 'i-1', 'i-2']);
    expect(build().listPosition()).toBe('2 / 3');

    interventionListStore.orderedIds.set(['other']);
    expect(build().listPosition()).toBeNull();
  });

  it('should expose the work-item counter as the active stage detail during execution', () => {
    store.intervention.set({ status: 'in_progress' } as InterventionOutput);
    store.workItems.set([
      { id: 'wi-1', status: 'completed' },
      { id: 'wi-2', status: 'planned' },
    ] as unknown as readonly InterventionWorkItemOutput[]);
    const harness = build();

    expect(harness.stageDetail()).toBe('1/2');

    store.intervention.set({ status: 'submitted' } as InterventionOutput);
    expect(harness.stageDetail()).toBeNull();
  });

  it('should list the allowed transitions in the status menu, excluding abandoned', () => {
    store.intervention.set({
      status: 'draft',
      allowedTransitions: ['planned', 'abandoned'],
    } as unknown as InterventionOutput);
    const harness = build();

    const labels = harness.transitionMenuItems().map((item) => item.label);
    expect(labels).toContain('Planned');
    expect(labels).not.toContain('Abandoned');
  });

  it('should open the request-changes drawer instead of transitioning directly for changes_requested', () => {
    const harness = build();

    harness.onTransitionSelect('changes_requested');

    expect(store.transition).not.toHaveBeenCalled();
    expect(harness.requestChangesDrawerVisible()).toBe(true);
  });

  it('should transition directly for any other status selection', () => {
    const harness = build();

    harness.onTransitionSelect('planned');

    expect(store.transition).toHaveBeenCalledWith({ interventionId: 'i-1', status: 'planned' });
  });

  it('should flag ready-to-publish only when submitted with no blockers left', () => {
    const harness = build();

    expect(harness.readyToPublish()).toBe(false);

    store.intervention.set({ status: 'submitted' } as InterventionOutput);
    expect(harness.readyToPublish()).toBe(true);

    store.blockerCount.set(2);
    expect(harness.readyToPublish()).toBe(false);

    store.blockerCount.set(0);
    store.intervention.set({ status: 'published' } as InterventionOutput);
    expect(harness.readyToPublish()).toBe(false);
  });

  it('should count only proposed changes as pending', () => {
    store.changes.set([{ status: 'proposed' }, { status: 'applied' }, { status: 'proposed' }]);

    expect(build().pendingChangesCount()).toBe(2);
  });

  it('should surface the request-changes action only while the intervention awaits review', () => {
    const harness = build();

    expect(harness.canRequestChanges()).toBe(false);

    store.intervention.set({ status: 'submitted' } as InterventionOutput);
    expect(harness.canRequestChanges()).toBe(true);

    store.intervention.set({ status: 'published' } as InterventionOutput);
    expect(harness.canRequestChanges()).toBe(false);
  });

  it('should show the guided planning surface only for drafts', () => {
    const harness = build();

    expect(harness.showPlanningGuide()).toBe(false);

    store.intervention.set({ status: 'draft' } as InterventionOutput);
    expect(harness.showPlanningGuide()).toBe(true);

    store.intervention.set({ status: 'planned' } as InterventionOutput);
    expect(harness.showPlanningGuide()).toBe(false);
  });

  it('should collapse activity during preparation and the checklist during review', () => {
    store.intervention.set({ status: 'draft' } as InterventionOutput);
    const harness = build();

    expect(harness.activityExpanded()).toBe(false);
    expect(harness.workItemsExpanded()).toBe(true);

    store.intervention.set({ status: 'submitted' } as InterventionOutput);
    expect(harness.activityExpanded()).toBe(true);
    expect(harness.workItemsExpanded()).toBe(false);
  });

  it('should merge-patch the fields edited on a guided step', () => {
    build().saveGuideStep({ site: '/api/facilities/f-1' });

    expect(store.updateDetails).toHaveBeenCalledWith({
      interventionId: 'i-1',
      input: { site: '/api/facilities/f-1' },
    });
  });

  it('should surface blocker-severity issues in the blockers banner', () => {
    store.issues.set([
      { severity: 'blocker', message: 'Missing sign-off', resource: '/api/x' },
      { severity: 'warning', message: 'Low priority note', resource: '/api/y' },
    ] as InterventionIssueOutput[]);
    const harness = build();

    expect(harness.blockerIssues()).toEqual([
      { severity: 'blocker', message: 'Missing sign-off', resource: '/api/x' },
    ]);
  });

  it('should post a comment through the workspace store', () => {
    const harness = build();

    harness.addComment('Looks good');

    expect(store.addComment).toHaveBeenCalledWith({ interventionId: 'i-1', body: 'Looks good' });
  });

  it('should save the draft label selection as the intervention label set', () => {
    store.intervention.set({
      labels: [{ id: 'label-1', name: 'A', color: '#fff' }],
    } as unknown as InterventionOutput);
    const harness = build();

    harness.openLabelsEditor();
    expect(harness.labelSelectionControl.value).toEqual(['label-1']);

    harness.labelSelectionControl.setValue(['label-1', 'label-2']);
    harness.saveLabels();

    expect(store.updateDetails).toHaveBeenCalledWith({
      interventionId: 'i-1',
      input: { labelIds: ['label-1', 'label-2'] },
    });
    expect(harness.labelsEditorOpen()).toBe(false);
  });

  it('should save the description (and other planning details) through the edit drawer', () => {
    const harness = build();

    harness.savePlanningDetails({
      site: '/api/facilities/site-1',
      responsible: '/api/organizations/org-1/members/member-1',
      participants: [],
      priority: 'high',
      plannedStartAt: null,
      dueAt: null,
      description: '  Some scope notes  ',
    });

    expect(store.updateDetails).toHaveBeenCalledWith({
      interventionId: 'i-1',
      input: expect.objectContaining({
        site: '/api/facilities/site-1',
        description: 'Some scope notes',
      }),
    });
    expect(harness.editDrawerVisible()).toBe(false);
  });

  it('should normalize a blank description to null', () => {
    const harness = build();

    harness.savePlanningDetails({
      site: '/api/facilities/site-1',
      responsible: '/api/organizations/org-1/members/member-1',
      participants: [],
      priority: 'high',
      plannedStartAt: null,
      dueAt: null,
      description: '   ',
    });

    expect(store.updateDetails).toHaveBeenCalledWith({
      interventionId: 'i-1',
      input: expect.objectContaining({ description: null }),
    });
  });

  describe('rendering', () => {
    function render(): ReturnType<typeof TestBed.createComponent<InterventionDetailPage>> {
      const fixture = TestBed.createComponent(InterventionDetailPage);
      fixture.componentRef.setInput('interventionId', 'i-1');
      fixture.detectChanges();
      return fixture;
    }

    it('should render the loading skeleton while the workspace is loading', () => {
      store.loading.set(true);
      const fixture = render();

      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    });

    it('should render the not-found empty state when no intervention is loaded', () => {
      store.intervention.set(null);
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Intervention not found');
    });

    it('should render the draft workspace with the guided planning surface', () => {
      store.intervention.set(buildIntervention({ status: 'draft' }));
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Check the roof access hatches.');
      expect(fixture.nativeElement.querySelector('app-intervention-planning-guide')).toBeTruthy();
    });

    it('should render the work-item checklist during execution with items listed', () => {
      store.intervention.set(buildIntervention({ status: 'in_progress' }));
      store.workItems.set([
        { id: 'wi-1', status: 'completed', action: 'inspect', target: null } as unknown as InterventionWorkItemOutput,
        { id: 'wi-2', status: 'planned', action: 'inspect', target: null } as unknown as InterventionWorkItemOutput,
      ]);
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Work items');
      expect(fixture.nativeElement.querySelectorAll('li').length).toBeGreaterThan(0);
    });

    it('should render the empty checklist state when there are no work items', () => {
      store.intervention.set(buildIntervention({ status: 'planned' }));
      store.workItems.set([]);
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('No work items yet');
    });

    it('should render the proposed-changes and publication summary sections while submitted', () => {
      store.intervention.set(buildIntervention({ status: 'submitted' }));
      store.changes.set([
        { id: 'ch-1', resource: '/api/facilities/site-1', status: 'proposed', patch: { name: 'New' } },
        { id: 'ch-2', resource: '/api/facilities/site-2', status: 'applied', patch: { name: 'Old' } },
      ]);
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Proposed changes');
      expect(fixture.nativeElement.textContent).toContain('Publication summary');
    });

    it('should render the review banners: blockers, ready-to-publish and published', () => {
      store.intervention.set(buildIntervention({ status: 'submitted' }));
      store.issues.set([
        { severity: 'blocker', message: 'Missing sign-off', resource: '/api/x' },
      ] as InterventionIssueOutput[]);
      store.blockerCount.set(1);
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Missing sign-off');

      store.issues.set([]);
      store.blockerCount.set(0);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Execution complete');

      store.intervention.set(buildIntervention({ status: 'published' }));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Published');
    });

    it('should render the changes-requested review note banner', () => {
      store.intervention.set(
        buildIntervention({ status: 'changes_requested', reviewNote: 'Please redo the roof check.' }),
      );
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Please redo the roof check.');
    });

    it('should render the top-level error banner and clear it on dismiss', () => {
      store.intervention.set(buildIntervention());
      store.error.set('Something went wrong');
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Something went wrong');

      const closeButton: HTMLButtonElement | null =
        fixture.nativeElement.querySelector('[aria-label="Close"]');
      closeButton?.click();
      fixture.detectChanges();
      expect(store.clearError).toHaveBeenCalled();
    });

    it('should render the offline unsynced-changes banner', () => {
      TestBed.overrideProvider(InterventionOfflineService, {
        useValue: { hasUnsyncedChanges: () => true },
      });
      store.intervention.set(buildIntervention());
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('saved offline');
    });

    it('should render the mobile command bar when a command action is available', () => {
      store.intervention.set(buildIntervention({ status: 'draft' }));
      const fixture = render();

      expect(fixture.nativeElement.textContent).toContain('Plan intervention');
    });

    it('should open the inline description editor and render the textarea', () => {
      store.intervention.set(buildIntervention({ status: 'in_progress' }));
      const fixture = render();
      const harness = fixture.componentInstance as unknown as InterventionDetailPageHarness;

      harness.openDescriptionEditor();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('textarea')).toBeTruthy();
    });

    it('should open the labels editor and render the multiselect', () => {
      store.intervention.set(
        buildIntervention({ labels: [{ id: 'label-1', name: 'Roof', color: '#fff' }] }),
      );
      const fixture = render();
      const harness = fixture.componentInstance as unknown as InterventionDetailPageHarness;

      harness.openLabelsEditor();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('p-multiselect')).toBeTruthy();
    });

    it('should publish the list position to the header store when the id is cached', () => {
      interventionListStore.orderedIds.set(['i-0', 'i-1', 'i-2']);
      store.intervention.set(buildIntervention());
      const fixture = render();
      const harness = fixture.componentInstance as unknown as InterventionDetailPageHarness;

      expect(harness.listPosition()).toBe('2 / 3');
    });

    it('should render the abandoned workspace without the stage progress row', () => {
      store.intervention.set(buildIntervention({ status: 'abandoned' }));
      const fixture = render();

      expect(
        fixture.nativeElement.querySelector('app-intervention-phase-stepper'),
      ).toBeFalsy();
    });
  });
});
