import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, type MenuItem } from 'primeng/api';
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
  onTransitionSelect(status: InterventionOutput['status']): void;
  navigatePrev(): void;
  navigateNext(): void;
  navigateBack(): void;
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

  beforeEach(() => {
    store = {
      intervention: signal<InterventionOutput | null>(null),
      workItems: signal<readonly InterventionWorkItemOutput[]>([]),
      issues: signal<readonly InterventionIssueOutput[]>([]),
      changes: signal<readonly unknown[]>([]),
      activities: signal<readonly unknown[]>([]),
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
        { provide: ConfirmationService, useValue: confirmationService },
        {
          provide: ConnectivityService,
          useValue: { online: signal(true), isOffline: () => false },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        { provide: InterventionOfflineService, useValue: {} },
        { provide: InterventionSyncCoordinatorService, useValue: { discardBlocked: vi.fn() } },
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

  it('should navigate back to the interventions list', () => {
    const harness = build();

    harness.navigateBack();

    expect(router.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions']);
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
});
