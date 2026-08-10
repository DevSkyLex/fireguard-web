import {
  provideZonelessChangeDetection,
  signal,
  type DebugElement,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { EMPTY } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionActivityOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionDiscoveryService,
  InterventionFieldExecutionService,
  InterventionPhotoCompressorService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { InterventionLinkedResourcesStore } from '../../../../state/intervention-linked-resources';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import { InterventionWorkspaceStore } from '../../../../state/intervention-workspace';
import { InterventionDetailPage } from '../intervention-detail-page.component';

const MEMBER_IRI: string = '/api/organizations/org-1/members/member-1';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'intervention-1',
    organization: '/api/organizations/org-1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly sweep',
    description: null,
    status: 'draft',
    allowedTransitions: ['planned', 'abandoned'],
    site: '/api/facilities/facility-1',
    responsible: MEMBER_IRI,
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: '2026-03-02T09:00:00Z',
    dueAt: '2026-03-09T17:00:00Z',
    reviewNote: null,
    revision: 3,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 4,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-02-11T14:30:00Z',
    ...overrides,
  }) as InterventionOutput;

const workItem = (
  overrides: Partial<InterventionWorkItemOutput> = {},
): InterventionWorkItemOutput =>
  ({
    id: 'wi-1',
    intervention: '/api/interventions/intervention-1',
    action: 'inspection',
    target: null,
    targetSummary: null,
    resultResource: null,
    assignee: null,
    assigneeProfile: null,
    source: 'planned',
    status: 'planned',
    required: true,
    skipReason: null,
    revision: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionWorkItemOutput;

const inBody = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement;

const createPage = async (): Promise<ComponentFixture<InterventionDetailPage>> => {
  const created: ComponentFixture<InterventionDetailPage> =
    TestBed.createComponent(InterventionDetailPage);
  created.componentRef.setInput('organizationId', 'org-1');
  created.componentRef.setInput('interventionId', 'intervention-1');
  await created.whenStable();

  return created;
};

describe('InterventionDetailPage', () => {
  let fixture: ComponentFixture<InterventionDetailPage>;

  let current: WritableSignal<InterventionOutput | null>;
  let workItems: WritableSignal<readonly InterventionWorkItemOutput[]>;
  let issues: WritableSignal<readonly InterventionIssueOutput[]>;
  let activities: WritableSignal<readonly InterventionActivityOutput[]>;
  let saving: WritableSignal<boolean>;
  let updateDetailsCallState: WritableSignal<CallState>;
  let loadError: WritableSignal<string | null>;
  let loadFailed: WritableSignal<boolean>;
  let hasOlderActivities: WritableSignal<boolean>;
  let blockerCount: WritableSignal<number>;
  let orderedIds: WritableSignal<readonly string[]>;
  let online: WritableSignal<boolean>;
  let unsynced: WritableSignal<boolean>;

  let load: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let loadActivities: ReturnType<typeof vi.fn>;
  let loadOlderActivities: ReturnType<typeof vi.fn>;
  let addComment: ReturnType<typeof vi.fn>;
  let transition: ReturnType<typeof vi.fn>;
  let updateDetails: ReturnType<typeof vi.fn>;
  let setWorkItemStatus: ReturnType<typeof vi.fn>;
  let deleteWorkItems: ReturnType<typeof vi.fn>;
  let createWorkItem: ReturnType<typeof vi.fn>;
  let workspaceDelete: ReturnType<typeof vi.fn>;
  let listDelete: ReturnType<typeof vi.fn>;
  let publish: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let permitted: Set<string>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement =>
    root().querySelector(`[data-testid="${id}"]`) as HTMLElement;

  beforeEach(() => {
    current = signal<InterventionOutput | null>(intervention());
    workItems = signal<readonly InterventionWorkItemOutput[]>([]);
    issues = signal<readonly InterventionIssueOutput[]>([]);
    activities = signal<readonly InterventionActivityOutput[]>([]);
    saving = signal(false);
    updateDetailsCallState = signal<CallState>(idleCallState());
    loadError = signal<string | null>(null);
    loadFailed = signal(false);
    hasOlderActivities = signal(false);
    blockerCount = signal(0);
    orderedIds = signal<readonly string[]>([]);
    online = signal(true);
    unsynced = signal(false);
    permitted = new Set<string>([
      'organization.interventions.plan',
      'organization.interventions.execute',
      'organization.interventions.review',
      'organization.interventions.publish',
    ]);

    load = vi.fn();
    reload = vi.fn();
    loadActivities = vi.fn();
    loadOlderActivities = vi.fn();
    addComment = vi.fn();
    transition = vi.fn();
    updateDetails = vi.fn();
    setWorkItemStatus = vi.fn();
    deleteWorkItems = vi.fn();
    createWorkItem = vi.fn();
    workspaceDelete = vi.fn();
    listDelete = vi.fn();
    publish = vi.fn().mockResolvedValue({ status: 'completed', error: null });
    navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: InterventionStore,
          useValue: { orderedIds, delete: listDelete },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (name: string): boolean => permitted.has(name) },
        },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { profile: signal({ id: 'member-1' }) },
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
          provide: InterventionFieldExecutionService,
          useValue: { scanSupported: (): boolean => false, scan: vi.fn() },
        },
        {
          provide: InterventionDiscoveryService,
          useValue: { normalizeScannedTarget: (value: string): string => value },
        },
        {
          provide: InterventionPhotoCompressorService,
          useValue: { compress: vi.fn((file: File) => Promise.resolve(file)) },
        },
        { provide: ConnectivityService, useValue: { online } },
        { provide: InterventionOfflineService, useValue: { hasUnsyncedChanges: unsynced } },
        { provide: InterventionPublicationService, useValue: { publish } },
        { provide: FeedbackService, useValue: { success: vi.fn() } },
        { provide: Events, useValue: { on: (): typeof EMPTY => EMPTY } },
        { provide: Router, useValue: { navigate } },
      ],
    });

    TestBed.overrideComponent(InterventionDetailPage, {
      remove: {
        providers: [
          InterventionWorkspaceStore,
          InterventionPlanningOptionsStore,
          InterventionLinkedResourcesStore,
        ],
      },
      add: {
        providers: [
          {
            provide: InterventionWorkspaceStore,
            useValue: {
              intervention: current,
              workItems,
              changes: signal([]),
              issues,
              activities,
              activityCallState: signal(idleCallState()),
              activityOldestPage: signal(null),
              hasOlderActivities,
              loading: signal(false),
              saving,
              error: loadError,
              loadFailed,
              transitionCallState: signal(idleCallState()),
              updateDetailsCallState,
              createWorkItemCallState: signal(idleCallState()),
              workItemWriteCallState: signal(idleCallState()),
              pendingWorkItemIds: signal(new Set<string>()),
              deleteWorkItemsCallState: signal(idleCallState()),
              rejectChangeCallState: signal(idleCallState()),
              pendingChangeIds: signal(new Set<string>()),
              deleteCallState: signal(idleCallState()),
              addCommentCallState: signal(idleCallState()),
              attachments: signal([]),
              attachmentsCallState: signal(idleCallState()),
              attachmentWriteCallState: signal(idleCallState()),
              pendingAttachmentIds: signal(new Set<string>()),
              loadAttachments: vi.fn(),
              uploadAttachment: vi.fn(),
              removeAttachment: vi.fn(),
              blockerCount,
              nextWorkItem: signal(null),
              load,
              reload,
              loadActivities,
              loadOlderActivities,
              addComment,
              transition,
              updateDetails,
              setWorkItemStatus,
              deleteWorkItems,
              createWorkItem,
              rejectChange: vi.fn(),
              delete: workspaceDelete,
              clearError: vi.fn(),
            },
          },
          {
            provide: InterventionPlanningOptionsStore,
            useValue: {
              sites: signal([]),
              members: signal([]),
              labels: signal([]),
              targets: signal([]),
              loadWorkspaceOptions: vi.fn(),
            },
          },
          {
            provide: InterventionLinkedResourcesStore,
            useValue: {
              facilities: signal([]),
              facilitiesLoading: signal(false),
              facilitiesError: signal(null),
              equipment: signal([]),
              equipmentLoading: signal(false),
              equipmentError: signal(null),
              inspections: signal([]),
              inspectionsLoading: signal(false),
              inspectionsError: signal(null),
              ensureFacilitiesLoaded: vi.fn(),
              ensureEquipmentLoaded: vi.fn(),
              ensureInspectionsLoaded: vi.fn(),
            },
          },
        ],
      },
    });
  });

  it('should load the workspace and its activity timeline on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledWith('intervention-1');
    expect(loadActivities).toHaveBeenCalledWith('intervention-1');
  });

  it('should show the properties on arrival, as a labelled group rather than a card', async () => {
    fixture = await createPage();

    const properties = byTestId('intervention-detail-properties') as HTMLElement;

    expect(properties).not.toBeNull();
    expect(properties.tagName).toBe('SECTION');
    expect(
      properties.querySelector(`#${properties.getAttribute('aria-labelledby')}`)?.textContent,
    ).toContain('Properties');
  });

  it('should render every section at once, with nothing hidden behind a tab', async () => {
    fixture = await createPage();

    expect((byTestId('intervention-detail-field-work') as HTMLElement).hidden).toBe(false);
    expect(byTestId('intervention-detail-properties')).not.toBeNull();
  });

  it('should show a meta line naming when the intervention was last touched', async () => {
    fixture = await createPage();

    expect(byTestId('intervention-detail-meta').textContent).toContain('v3');
  });

  describe('the phase action', () => {
    it('should offer planning once every prerequisite is met', async () => {
      fixture = await createPage();

      expect(byTestId('intervention-detail-command').textContent).toContain('Plan intervention');
      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should disable planning while a prerequisite is missing, and let the checklist say which', async () => {
      current.set(intervention({ dueAt: null }));
      fixture = await createPage();

      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(true);
      expect(byTestId('intervention-getting-started-item')).not.toBeNull();
      expect(root().textContent).toContain('Set a due date');
    });

    it('should send the operator to the work rather than to a submit they cannot use', async () => {
      current.set(intervention({ status: 'in_progress' }));
      workItems.set([workItem()]);
      fixture = await createPage();

      expect(byTestId('intervention-detail-command').textContent).toContain(
        'Complete 1 remaining item',
      );
    });

    it('should scroll to and focus the work items section when that action is invoked', async () => {
      current.set(intervention({ status: 'in_progress' }));
      workItems.set([workItem()]);
      fixture = await createPage();

      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(document.activeElement).toBe(byTestId('intervention-detail-field-work'));
    });

    it('should become the submit gate once all the work is resolved', async () => {
      current.set(intervention({ status: 'in_progress' }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();

      expect(byTestId('intervention-detail-command').textContent).toContain('Submit for review');
    });

    it('should refuse a submit from anyone but the responsible agent', async () => {
      current.set(intervention({ status: 'in_progress', responsible: '/api/other/member-9' }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();

      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(true);
      expect(root().textContent).toContain('Only the responsible agent can submit.');
    });

    it('should refuse publication while offline', async () => {
      current.set(intervention({ status: 'submitted' }));
      online.set(false);
      fixture = await createPage();

      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(true);
      expect(root().textContent).toContain('Connect to the network to publish.');
    });

    it('should refuse publication while a compliance point is unresolved', async () => {
      current.set(intervention({ status: 'submitted' }));
      blockerCount.set(2);
      fixture = await createPage();

      expect(root().textContent).toContain('2 blocking issues to clear.');
    });

    it('should offer nothing without the permission for the phase', async () => {
      permitted.delete('organization.interventions.plan');
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-detail-command"]')).toBeNull();
    });

    it('should stay at the same address across phases', async () => {
      fixture = await createPage();
      const prepareBox: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-action-box"]',
      );

      current.set(intervention({ status: 'submitted' }));
      await fixture.whenStable();
      const reviewBox: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-action-box"]',
      );

      expect(prepareBox).not.toBeNull();
      expect(reviewBox).toBe(prepareBox);
    });
  });

  describe('publication recap', () => {
    it('should show no publication recap before the intervention reaches review', async () => {
      fixture = await createPage();

      expect(
        root().querySelector('[data-testid="intervention-detail-publication-summary"]'),
      ).toBeNull();
    });

    it('should show the recap and the blockers once ready for review', async () => {
      current.set(intervention({ status: 'submitted' }));
      issues.set([
        {
          '@id': '/api/issues/1',
          '@type': 'InterventionIssue',
          severity: 'blocker',
          resource: '/api/facilities/1',
          field: null,
          message: 'Missing sign-off.',
        } as InterventionIssueOutput,
      ]);
      fixture = await createPage();

      expect(byTestId('intervention-detail-publication-summary')).not.toBeNull();
      expect(byTestId('intervention-detail-blockers').textContent).toContain('Missing sign-off.');
    });
  });

  describe('notices', () => {
    it('should offer a retry when the failure was a load, which re-running load repairs', async () => {
      loadError.set('The workspace could not be loaded.');
      loadFailed.set(true);
      fixture = await createPage();

      expect(byTestId('intervention-detail-error').textContent).toContain(
        'The workspace could not be loaded.',
      );

      byTestId('intervention-detail-retry').click();

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('should state a write failure without offering a retry that would discard it', async () => {
      // `retryLoad` re-runs the fetch. Offering it here would silently throw the
      // rejected write away, so the alert reports and stops.
      loadError.set('The site could not be changed.');
      loadFailed.set(false);
      fixture = await createPage();

      expect(byTestId('intervention-detail-error').textContent).toContain(
        'The site could not be changed.',
      );
      expect(root().querySelector('[data-testid="intervention-detail-retry"]')).toBeNull();
    });

    it('should render a failed load as its own state, not as "not found"', async () => {
      // `load` nulls the intervention *and* errors, so an alert nested inside the
      // loaded-intervention branch could never appear on this path.
      current.set(null);
      loadFailed.set(true);
      loadError.set('This intervention has not been saved on this device.');
      fixture = await createPage();

      const failed: HTMLElement = byTestId('intervention-detail-load-failed');

      expect(failed).not.toBeNull();
      expect(failed.textContent).toContain('This intervention has not been saved on this device.');
      expect(root().querySelector('[data-testid="intervention-detail-not-found"]')).toBeNull();

      byTestId('intervention-detail-load-failed-retry').click();

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('should show the reviewer note atop the field work it concerns', async () => {
      current.set(
        intervention({ status: 'changes_requested', reviewNote: 'Re-check the third floor.' }),
      );
      fixture = await createPage();

      expect(byTestId('intervention-detail-review-note').textContent).toContain(
        'Re-check the third floor.',
      );
    });

    it('should surface unsynced changes through the sync chip, not a dismissable banner', async () => {
      unsynced.set(true);
      fixture = await createPage();

      expect(byTestId('intervention-sync-status')).not.toBeNull();
    });
  });

  describe('the status menu', () => {
    it('should never offer abandonment, which has its own confirmed action', async () => {
      current.set(
        intervention({
          status: 'changes_requested',
          allowedTransitions: ['in_progress', 'submitted', 'abandoned'],
        }),
      );
      fixture = await createPage();
      byTestId('intervention-detail-status-menu').click();
      await fixture.whenStable();

      const entries: HTMLElement[] = Array.from(
        document.querySelectorAll('[data-testid="intervention-detail-transition"]'),
      );

      expect(entries.some((entry) => entry.textContent?.includes('Abandoned'))).toBe(false);
      expect(entries.some((entry) => entry.textContent?.includes('In progress'))).toBe(true);
    });

    it('should not offer the forward move the action box gates', async () => {
      // The action box refuses to submit while work items are open. A menu entry
      // doing it anyway would make that gate advisory.
      current.set(
        intervention({
          status: 'changes_requested',
          allowedTransitions: ['in_progress', 'submitted', 'abandoned'],
        }),
      );
      fixture = await createPage();
      byTestId('intervention-detail-status-menu').click();
      await fixture.whenStable();

      const entries: HTMLElement[] = Array.from(
        document.querySelectorAll('[data-testid="intervention-detail-transition"]'),
      );

      expect(entries.some((entry) => entry.textContent?.includes('Submitted'))).toBe(false);
    });

    it('should hide itself entirely when the action box owns every remaining move', async () => {
      // A draft can only go to `planned` (the action box's job) or `abandoned`
      // (the overflow menu's), so there is nothing left for this menu to offer.
      current.set(intervention({ status: 'draft', allowedTransitions: ['planned', 'abandoned'] }));
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-detail-status-menu"]')).toBeNull();
    });

    it('should drop a target the member lacks the capability for', async () => {
      permitted.delete('organization.interventions.plan');
      permitted.delete('organization.interventions.execute');
      current.set(intervention({ status: 'draft', allowedTransitions: ['planned'] }));
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-detail-status-menu"]')).toBeNull();
    });
  });

  describe('prev / next', () => {
    it('should walk the order the list established', async () => {
      orderedIds.set(['a', 'intervention-1', 'z']);
      fixture = await createPage();

      byTestId('intervention-detail-next').click();

      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'z']);
    });

    it('should hide itself on a deep link, rather than lying about a position', async () => {
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-detail-next"]')).toBeNull();
    });

    it('should ignore the j/k shortcut on a deep link, where there is no order to walk', async () => {
      orderedIds.set(['a', 'b']);
      fixture = await createPage();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
      await fixture.whenStable();

      expect(navigate).not.toHaveBeenCalled();
      expect(root().querySelector('[data-testid="intervention-detail-next"]')).toBeNull();
    });
  });

  describe('in-place editing', () => {
    const grid = (): DebugElement =>
      fixture.debugElement.query(By.css('app-intervention-properties-grid'));

    it('should route a patch from the open field to the store', async () => {
      fixture = await createPage();

      byTestId('intervention-field-priority').querySelector('button')?.click();
      await fixture.whenStable();
      grid().triggerEventHandler('detailsChanged', { priority: 'urgent' });

      expect(updateDetails).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        input: { priority: 'urgent' },
      });
    });

    it('should ignore a patch that belongs to no open field', async () => {
      fixture = await createPage();

      grid().triggerEventHandler('detailsChanged', { priority: 'urgent' });

      expect(updateDetails).not.toHaveBeenCalled();
    });

    it('should open the editor a getting-started item points at, on the always-visible properties card', async () => {
      current.set(intervention({ site: null }));
      fixture = await createPage();

      byTestId('intervention-getting-started-item').click();
      await fixture.whenStable();

      const trigger: HTMLElement = byTestId('intervention-field-site').querySelector(
        'button',
      ) as HTMLElement;

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('should keep a rejected field open and attribute the failure to it', async () => {
      fixture = await createPage();

      byTestId('intervention-field-priority').querySelector('button')?.click();
      await fixture.whenStable();
      grid().triggerEventHandler('detailsChanged', { priority: 'urgent' });
      updateDetailsCallState.set(pendingCallState());
      await fixture.whenStable();
      updateDetailsCallState.set(
        errorCallState({
          error: null,
          message: 'The priority could not be saved.',
          code: null,
          retryable: true,
          timestamp: 0,
        }),
      );
      await fixture.whenStable();

      expect(
        byTestId('intervention-field-priority').querySelector('[role="alert"]')?.textContent,
      ).toContain('The priority could not be saved.');
    });
  });

  describe('confirmations', () => {
    it('should abandon only after the confirmation is accepted', async () => {
      fixture = await createPage();

      byTestId('intervention-detail-menu').click();
      await fixture.whenStable();
      (inBody('intervention-detail-abandon') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(transition).not.toHaveBeenCalled();

      (inBody('intervention-detail-confirm-accept') as HTMLButtonElement).click();

      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'abandoned',
      });
    });

    it('should delete through the list store, the only one that repairs the collection', async () => {
      fixture = await createPage();

      byTestId('intervention-detail-menu').click();
      await fixture.whenStable();
      (inBody('intervention-detail-delete') as HTMLButtonElement).click();
      await fixture.whenStable();
      (inBody('intervention-detail-confirm-accept') as HTMLButtonElement).click();

      expect(listDelete).toHaveBeenCalledWith({ interventionId: 'intervention-1', revision: 3 });
      expect(workspaceDelete).not.toHaveBeenCalled();
    });
  });

  describe('publication', () => {
    it('should never publish straight from the phase action', async () => {
      current.set(intervention({ status: 'submitted' }));
      fixture = await createPage();

      byTestId('intervention-detail-command').click();
      await fixture.whenStable();

      expect(publish).not.toHaveBeenCalled();
      expect(inBody('intervention-detail-publish-dialog')).not.toBeNull();
    });

    it('should recap exactly what it is about to write', async () => {
      current.set(intervention({ status: 'submitted' }));
      fixture = await createPage();

      byTestId('intervention-detail-command').click();
      await fixture.whenStable();

      const dialog: HTMLElement = inBody('intervention-detail-publish-dialog');

      expect(dialog.textContent).toContain('4');
      expect(dialog.textContent).toContain('v3');
      expect(dialog.textContent).toContain('Either everything succeeds, or no record is modified.');
    });

    it('should publish from the confirmation and reload without blanking the page', async () => {
      current.set(intervention({ status: 'submitted' }));
      fixture = await createPage();

      byTestId('intervention-detail-command').click();
      await fixture.whenStable();
      (inBody('intervention-detail-publish-confirm') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(publish).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledWith('intervention-1');
      expect(load).toHaveBeenCalledTimes(1);
      expect(inBody('intervention-detail-publish-dialog')).toBeNull();
    });

    it('should surface a failed publication and keep the confirmation open to retry', async () => {
      publish.mockResolvedValue({ status: 'failed', error: 'A facility was locked.' });
      current.set(intervention({ status: 'submitted' }));
      fixture = await createPage();

      byTestId('intervention-detail-command').click();
      await fixture.whenStable();
      (inBody('intervention-detail-publish-confirm') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(reload).not.toHaveBeenCalled();
      expect(inBody('intervention-detail-publish-dialog').textContent).toContain(
        'A facility was locked.',
      );
    });

    it('should show a locked terminal state once published, with no button', async () => {
      current.set(intervention({ status: 'published' }));
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-detail-command"]')).toBeNull();
      expect(root().textContent).toContain('v3');
    });
  });

  describe('adding work to the scope', () => {
    it('should open the sheet from the checklist rather than dead-ending on the button', async () => {
      fixture = await createPage();

      (byTestId('intervention-work-items-add') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(inBody('intervention-work-item-sheet')).not.toBeNull();
    });

    it('should open the sheet when the scope item sends an empty scope to the work', async () => {
      fixture = await createPage();

      const rows: HTMLElement[] = Array.from(
        root().querySelectorAll('[data-testid="intervention-getting-started-item"]'),
      );
      rows[rows.length - 1]?.click();
      await fixture.whenStable();

      expect(inBody('intervention-work-item-sheet')).not.toBeNull();
    });

    it('should send an item with only the fields the planner filled', async () => {
      fixture = await createPage();

      (byTestId('intervention-work-items-add') as HTMLButtonElement).click();
      await fixture.whenStable();
      (
        inBody('intervention-work-item-sheet').querySelector('form') as HTMLFormElement
      ).dispatchEvent(new Event('submit'));

      expect(createWorkItem).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        input: {
          intervention: '/api/interventions/intervention-1',
          action: 'inventory',
          target: undefined,
          assignee: undefined,
          source: 'planned',
          required: true,
        },
      });
    });

    it('should offer no add affordance once the intervention leaves draft', async () => {
      current.set(intervention({ status: 'in_progress' }));
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-work-items-add"]')).toBeNull();
    });
  });

  describe('proposed changes', () => {
    it('should render nothing when there is nothing proposed', async () => {
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-change-list"]')).toBeNull();
    });
  });

  describe('activity and comments', () => {
    it('should render the loaded activity timeline', async () => {
      activities.set([
        {
          '@id': '/api/intervention-activities/1',
          '@type': 'InterventionActivity',
          id: 'activity-1',
          intervention: '/api/interventions/intervention-1',
          kind: 'comment',
          event: 'comment',
          actor: MEMBER_IRI,
          body: 'Checked the panel.',
          payload: null,
          createdAt: '2026-02-11T14:00:00Z',
        } as InterventionActivityOutput,
      ]);
      fixture = await createPage();

      expect(root().textContent).toContain('Checked the panel.');
    });

    it('should post a comment from the composer', async () => {
      fixture = await createPage();

      const textarea: HTMLTextAreaElement = byTestId(
        'intervention-comment-body',
      ) as HTMLTextAreaElement;
      textarea.value = 'Looks fine.';
      textarea.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      (root().querySelector('form') as HTMLFormElement | null)?.dispatchEvent(new Event('submit'));

      expect(addComment).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        body: 'Looks fine.',
      });
    });
  });

  describe('not found', () => {
    it('should offer a way back when the intervention is unavailable', async () => {
      current.set(null);
      fixture = await createPage();

      expect(byTestId('intervention-detail-not-found').textContent).toContain(
        'Intervention not found',
      );
    });
  });
});
