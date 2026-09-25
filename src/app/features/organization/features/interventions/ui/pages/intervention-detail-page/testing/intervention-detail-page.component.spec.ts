import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  input as inputSignal,
  provideZonelessChangeDetection,
  signal,
  type DebugElement,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, type Event as RouterEvent } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import {
  provideInteractionCapabilities,
  INTERACTION_CAPABILITIES_PORT,
} from '@core/interaction-capabilities';
import { PageActionsService } from '@core/page-actions';
import { PageTabsService } from '@core/page-tabs';
import {
  errorCallState,
  successCallState,
  idleCallState,
  pendingCallState,
  type CallState,
} from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { TeamService } from '@features/organization/data-access';
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';
import { MessageThreadStore } from '@features/organization/features/collaboration/state';
import { SubjectDiscussion } from '@features/organization/features/collaboration/ui/components';
import {
  InterventionLabelService,
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionActivityOutput,
  InterventionAllowedActionsOutput,
  InterventionAttachmentOutput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionQueuedAttachment,
  InterventionScanResult,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { interventionSyncEvents } from '@features/organization/features/interventions/services';
import {
  BrowserDownloadService,
  InterventionFieldExecutionService,
  InterventionPhotoCompressorService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import {
  InterventionStore,
  InterventionTimeStore,
} from '@features/organization/features/interventions/state';
import { InterventionTableQueryStore } from '@features/organization/features/interventions/state/intervention-table-query';
import { allowedTransitions } from '@features/organization/features/interventions/utils';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
} from '@features/organization/ports';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { InterventionLinkedResourcesStore } from '../../../../state/intervention-linked-resources';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import {
  InterventionWorkspaceStore,
  interventionWorkspaceStoreEvents,
} from '../../../../state/intervention-workspace';
import { InterventionDetailPage } from '../intervention-detail-page.component';

const MEMBER_IRI: string = '/api/organizations/org-1/members/member-1';

/**
 * The `allowedActions` block the backend would compute for a fully-entitled
 * responsible caller in the given status — what these page tests assume,
 * since they grant every intervention permission and make the caller the
 * responsible agent.
 */
const actionsFor = (status: InterventionOutput['status']): InterventionAllowedActionsOutput => {
  const schedulable: boolean =
    status === 'draft' ||
    status === 'planned' ||
    status === 'in_progress' ||
    status === 'changes_requested';

  return {
    canEditDetails: status !== 'published' && status !== 'abandoned',
    canEditSite: status === 'draft',
    canEditResponsible: status === 'draft' || status === 'planned',
    canEditPlanning: schedulable,
    canMutateWorkItems: schedulable,
    canMutateChanges: status === 'in_progress' || status === 'changes_requested',
    canAssignTeam: schedulable,
    canManageAttachments: schedulable,
    canSubmit: status === 'planned' || status === 'in_progress' || status === 'changes_requested',
    canWithdraw: status === 'submitted',
    canDelete: status === 'draft' || status === 'abandoned',
    canPublish: status === 'submitted',
  };
};

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'intervention-1',
    organization: '/api/organizations/org-1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly sweep',
    description: null,
    status: 'draft',
    allowedTransitions: allowedTransitions(overrides.status ?? 'draft'),
    allowedActions: actionsFor(overrides.status ?? 'draft'),
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
    hasSignature: false,
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
    evidenceCount: 0,
    revision: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionWorkItemOutput;

const attachment = (
  overrides: Partial<InterventionAttachmentOutput> = {},
): InterventionAttachmentOutput =>
  ({
    '@id': '/api/intervention-attachments/attachment-1',
    '@type': 'InterventionAttachment',
    id: 'attachment-1',
    interventionId: 'intervention-1',
    fileName: 'evidence.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    label: null,
    kind: 'file',
    revision: 1,
    uploadedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionAttachmentOutput;

const change = (overrides: Partial<InterventionChangeOutput> = {}): InterventionChangeOutput =>
  ({
    '@id': '/api/intervention-changes/change-1',
    '@type': 'InterventionChange',
    id: 'change-1',
    intervention: '/api/interventions/intervention-1',
    workItem: null,
    resource: '/api/facilities/facility-1',
    patch: { name: 'North wing' },
    status: 'proposed',
    revision: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionChangeOutput;

const inBody = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement;

const dispatchRecordShortcut = (options: KeyboardEventInit = {}): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true, ...options }));
};

/**
 * Stands in for the shell's `DashboardPageActions`. Discussion and the
 * "more actions" menu are registered as a `TemplateRef` on the real
 * `PageActionsService` (never mocked, so the constructor effect and the
 * teardown clear behave exactly as in production) rather than rendered in
 * the page's own template — a spec that needs to interact with either
 * renders the currently registered template through this outlet, the same
 * way the shell does. This is the approach every migrated page's spec
 * reuses (`InterventionsPage`'s spec is the other example).
 */
@Component({
  selector: 'app-page-actions-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageActionsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    inputSignal<TemplateRef<unknown> | null>(null);
}

const renderPageActions = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageActionsService).actions());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

const renderPageTabs = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageTabsService).tabs());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

const byPageActionsTestId = (id: string): HTMLElement | null =>
  renderPageActions().querySelector(`[data-testid="${id}"]`);

const createPage = async (): Promise<ComponentFixture<InterventionDetailPage>> => {
  const created: ComponentFixture<InterventionDetailPage> =
    TestBed.createComponent(InterventionDetailPage);
  created.componentRef.setInput('organizationId', 'org-1');
  created.componentRef.setInput('interventionId', 'intervention-1');
  await created.whenStable();
  (created.nativeElement as HTMLElement).appendChild(renderPageActions());
  (created.nativeElement as HTMLElement).appendChild(renderPageTabs());
  document.body.appendChild(created.nativeElement as HTMLElement);

  return created;
};

describe('InterventionDetailPage', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<InterventionDetailPage>;

  let current: WritableSignal<InterventionOutput | null>;
  let workItems: WritableSignal<readonly InterventionWorkItemOutput[]>;
  let issues: WritableSignal<readonly InterventionIssueOutput[]>;
  let servedFromLocalCache: WritableSignal<boolean>;
  let activities: WritableSignal<readonly InterventionActivityOutput[]>;
  let attachments: WritableSignal<readonly InterventionAttachmentOutput[]>;
  let changes: WritableSignal<readonly InterventionChangeOutput[]>;
  let saving: WritableSignal<boolean>;
  let updateDetailsCallState: WritableSignal<CallState>;
  let workItemWriteCallState: WritableSignal<CallState>;
  let attachmentWriteCallState: WritableSignal<CallState>;
  let loadError: WritableSignal<string | null>;
  let loadFailed: WritableSignal<boolean>;
  let hasOlderActivities: WritableSignal<boolean>;
  let blockerCount: WritableSignal<number>;
  let orderedIds: WritableSignal<readonly string[]>;
  let online: WritableSignal<boolean>;
  let syncing: WritableSignal<boolean>;
  let syncBlockedCount: WritableSignal<number>;
  let syncProblem: WritableSignal<string | null>;
  let retryBlocked: ReturnType<typeof vi.fn>;
  let listOutbox: ReturnType<typeof vi.fn>;

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
  let setPendingDuplicatePrefill: ReturnType<typeof vi.fn>;
  let publish: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let permitted: Set<string>;
  let openSubjectThread: ReturnType<typeof vi.fn>;
  let downloadAttachment: ReturnType<typeof vi.fn>;
  let exportReport: ReturnType<typeof vi.fn>;
  let browserDownloadTrigger: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;
  let uploadAttachment: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement =>
    (root().querySelector(`[data-testid="${id}"]`) ??
      document.querySelector(`[data-testid="${id}"]`)) as HTMLElement;

  const openPageMenu = async (): Promise<void> => {
    byTestId('intervention-detail-menu').click();
    await fixture.whenStable();
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      public observe(): void {}
      public unobserve(): void {}
      public disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    mobile.set(false);
    current = signal<InterventionOutput | null>(intervention());
    workItems = signal<readonly InterventionWorkItemOutput[]>([]);
    issues = signal<readonly InterventionIssueOutput[]>([]);
    servedFromLocalCache = signal<boolean>(false);
    activities = signal<readonly InterventionActivityOutput[]>([]);
    attachments = signal<readonly InterventionAttachmentOutput[]>([]);
    changes = signal<readonly InterventionChangeOutput[]>([]);
    saving = signal(false);
    updateDetailsCallState = signal<CallState>(idleCallState());
    workItemWriteCallState = signal<CallState>(idleCallState());
    attachmentWriteCallState = signal<CallState>(idleCallState());
    loadError = signal<string | null>(null);
    loadFailed = signal(false);
    hasOlderActivities = signal(false);
    blockerCount = signal(0);
    orderedIds = signal<readonly string[]>([]);
    online = signal(true);
    syncing = signal(false);
    syncBlockedCount = signal(0);
    syncProblem = signal<string | null>(null);
    retryBlocked = vi.fn().mockResolvedValue(undefined);
    listOutbox = vi.fn().mockResolvedValue([]);
    permitted = new Set<string>([
      'organization.interventions.plan',
      'organization.interventions.execute',
      'organization.interventions.review',
      'organization.interventions.publish',
      'organization.messaging.read',
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
    setPendingDuplicatePrefill = vi.fn();
    publish = vi.fn().mockResolvedValue({
      intervention: '/api/interventions/intervention-1',
      status: 'completed',
      error: null,
    });
    openSubjectThread = vi.fn().mockReturnValue(of({ id: 'conversation-1' } as ConversationOutput));
    downloadAttachment = vi
      .fn()
      .mockReturnValue(of(new Blob(['file-bytes'], { type: 'application/pdf' })));
    exportReport = vi
      .fn()
      .mockReturnValue(of(new Blob(['pdf-bytes'], { type: 'application/pdf' })));
    browserDownloadTrigger = vi.fn();
    feedbackError = vi.fn();
    uploadAttachment = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideInteractionCapabilities(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobile,
            mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
          },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: InterventionStore,
          useValue: {
            orderedIds,
            delete: listDelete,
            deleteCallState: signal(idleCallState()),
            setPendingDuplicatePrefill,
          },
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
          provide: InterventionFieldExecutionService,
          useValue: { scanSupported: (): boolean => false, scanToWorkItem: vi.fn() },
        },
        {
          provide: InterventionPhotoCompressorService,
          useValue: {
            prepareAll: vi.fn((files: readonly File[]) =>
              Promise.resolve({ ready: [...files], failed: [] }),
            ),
          },
        },
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: InterventionSyncCoordinatorService,
          useValue: {
            syncing,
            blockedOperations: syncBlockedCount,
            problem: syncProblem,
            retryBlocked,
            syncIntervention: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: InterventionOfflineService,
          useValue: {
            listOutbox,
            pendingCount: signal(0),
            publicationOwner: vi.fn().mockReturnValue('account-1'),
            loadPublicationTracking: vi.fn().mockResolvedValue(null),
            savePublicationTracking: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: InterventionService,
          useValue: {
            downloadAttachment,
            exportReport,
            get: vi.fn().mockImplementation(() => of(current())),
            listIssues: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            listWorkItems: vi
              .fn()
              .mockImplementation(
                (_interventionId: string, options?: { readonly status?: readonly string[] }) =>
                  of({
                    member: options?.status
                      ? workItems().filter((item) => options.status?.includes(item.status))
                      : workItems(),
                    totalItems: workItems().filter(
                      (item) => !options?.status || options.status.includes(item.status),
                    ).length,
                  }),
              ),
            listAllChanges: vi
              .fn()
              .mockImplementation(
                (_interventionId: string, options?: { readonly status?: string }) =>
                  of(
                    options?.status
                      ? changes().filter((item) => item.status === options.status)
                      : changes(),
                  ),
              ),
          },
        },
        {
          provide: TeamService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            listMembers: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
          },
        },
        {
          provide: InterventionLabelService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            create: vi
              .fn()
              .mockReturnValue(of({ id: 'label-1', name: 'Urgent', color: '#ff0000' })),
            update: vi
              .fn()
              .mockReturnValue(of({ id: 'label-1', name: 'Renamed', color: '#00ff00' })),
            remove: vi.fn().mockReturnValue(of(undefined)),
          },
        },
        { provide: BrowserDownloadService, useValue: { trigger: browserDownloadTrigger } },
        {
          provide: InterventionPublicationService,
          useValue: {
            start: publish,
            observe: vi.fn().mockImplementation((value: unknown) => Promise.resolve(value)),
          },
        },
        { provide: FeedbackService, useValue: { success: vi.fn(), error: feedbackError } },
        { provide: TitleService, useValue: { setTitle: vi.fn() } },
        provideRouter([]),
        { provide: ConversationService, useValue: { openSubjectThread } },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: signal(new Map()),
            isAvailable: signal(true),
            isLoading: signal(false),
            ensureLoaded: vi.fn(),
            displayNameFor: (value: string): string => value,
          },
        },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            profile: signal({ id: 'member-1', organizationId: 'org-1' }),
            roles: signal([]),
            permissions: signal([]),
            isLoadingAccess: signal(false),
            accessError: signal(null),
          },
        },
      ],
    });

    TestBed.overrideComponent(SubjectDiscussion, {
      remove: { providers: [MessageThreadStore] },
      add: {
        providers: [
          {
            provide: MessageThreadStore,
            useValue: {
              reset: vi.fn(),
              load: vi.fn(),
              connect: vi.fn(),
              markRead: vi.fn(),
              send: vi.fn(),
              loadOlder: vi.fn(),
              retryFailed: vi.fn(),
              toggleReaction: vi.fn(),
              sortedMessages: vi.fn(() => []),
              pendingMessageIds: vi.fn(() => []),
              failedMessageIds: vi.fn(() => []),
              isLoading: vi.fn(() => false),
              isPosting: vi.fn(() => false),
              hasMore: vi.fn(() => false),
              loadError: vi.fn(() => null),
            },
          },
        ],
      },
    });

    TestBed.overrideComponent(InterventionDetailPage, {
      remove: {
        providers: [
          InterventionTimeStore,
          InterventionWorkspaceStore,
          InterventionPlanningOptionsStore,
          InterventionLinkedResourcesStore,
        ],
      },
      add: {
        providers: [
          { provide: InterventionTimeStore, useValue: { load: vi.fn(), scope: signal(null) } },
          {
            provide: InterventionWorkspaceStore,
            useValue: {
              intervention: current,
              workItems,
              changes,
              issues,
              servedFromLocalCache,
              activities,
              activityCallState: signal(idleCallState()),
              activityOldestPage: signal(null),
              hasOlderActivities,
              loading: signal(false),
              saving,
              error: loadError,
              loadFailed,
              transitionCallState: signal(idleCallState()),
              planningConfirmation: signal(null),
              updateDetailsCallState,
              workItemErrors: signal({}),
              changeErrors: signal({}),
              issuesCallState: signal(successCallState(null)),
              createWorkItemCallState: signal(idleCallState()),
              workItemWriteCallState,
              pendingWorkItemIds: signal(new Set<string>()),
              deleteWorkItemsCallState: signal(idleCallState()),
              rejectChangeCallState: signal(idleCallState()),
              pendingChangeIds: signal(new Set<string>()),
              deleteCallState: signal(idleCallState()),
              assignTeamCallState: signal(idleCallState()),
              assignTeam: vi.fn(),
              addCommentCallState: signal(idleCallState()),
              attachments,
              queuedAttachments: signal([]),
              removeQueuedAttachment: vi.fn(),
              attachmentsCallState: signal(idleCallState()),
              attachmentWriteCallState,
              attachmentDeleteCallState: signal(idleCallState()),
              pendingAttachmentIds: signal(new Set<string>()),
              loadAttachments: vi.fn(),
              uploadAttachment,
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
              catalogues: signal({}),
              loadMore: vi.fn(),
              sites: signal([]),
              members: signal([]),
              labels: signal([]),
              targets: signal([]),
              loadWorkspaceOptions: vi.fn(),
              ensureSelected: vi.fn(),
              selectionFailed: signal(false),
            },
          },
          {
            provide: InterventionLinkedResourcesStore,
            useValue: {
              setContext: vi.fn(),
              setOnline: vi.fn(),
              facilitiesSource: signal('api'),
              equipmentSource: signal('api'),
              inspectionsSource: signal('api'),
              retryFacilities: vi.fn(),
              retryEquipment: vi.fn(),
              retryInspections: vi.fn(),
              invalidate: vi.fn(),
              deactivate: vi.fn(),
              facilitiesQuery: signal({ search: '', type: null, status: null }),
              equipmentQuery: signal({ search: '', type: null, status: null }),
              inspectionsQuery: signal({ search: '', status: null, result: null }),
              facilities: signal([]),
              facilitiesCallState: signal({ data: null }),
              facilitiesLoading: signal(false),
              facilitiesLoadingMore: signal(false),
              facilitiesTotalItems: signal(0),
              facilitiesError: signal(null),
              queryFacilities: vi.fn(),
              loadMoreFacilities: vi.fn(),
              equipment: signal([]),
              equipmentCallState: signal({ data: null }),
              equipmentLoading: signal(false),
              equipmentLoadingMore: signal(false),
              equipmentTotalItems: signal(0),
              equipmentError: signal(null),
              queryEquipment: vi.fn(),
              loadMoreEquipment: vi.fn(),
              inspections: signal([]),
              inspectionsCallState: signal({ data: null }),
              inspectionsLoading: signal(false),
              inspectionsLoadingMore: signal(false),
              inspectionsTotalItems: signal(0),
              inspectionsError: signal(null),
              queryInspections: vi.fn(),
              loadMoreInspections: vi.fn(),
              ensureFacilitiesLoaded: vi.fn(),
              ensureEquipmentLoaded: vi.fn(),
              ensureInspectionsLoaded: vi.fn(),
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('coordinates real activity invalidation without inventing work-item events', async () => {
    fixture = await createPage();
    const dispatcher = TestBed.inject(Dispatcher);
    loadActivities.mockClear();
    dispatcher.dispatch(
      interventionWorkspaceStoreEvents.mutationSucceeded({
        interventionId: 'intervention-1',
        source: 'remote',
        collections: ['workItems'],
      }),
    );
    expect(loadActivities).not.toHaveBeenCalled();
    dispatcher.dispatch(
      interventionWorkspaceStoreEvents.mutationSucceeded({
        interventionId: 'intervention-1',
        source: 'remote',
        collections: ['activity'],
      }),
    );
    expect(loadActivities).toHaveBeenCalledTimes(1);
    dispatcher.dispatch(
      interventionWorkspaceStoreEvents.mutationSucceeded({
        interventionId: 'other',
        source: 'remote',
        collections: ['activity'],
      }),
    );
    expect(loadActivities).toHaveBeenCalledTimes(1);
  });

  it('reconciles queued row changes locally and closes the edited effort without fetching activity', async () => {
    fixture = await createPage();
    const page = fixture.componentInstance;
    const queries = fixture.debugElement.injector.get(InterventionTableQueryStore);
    const linked = fixture.debugElement.injector.get(InterventionLinkedResourcesStore);
    const setOffline = vi.spyOn(queries, 'setOffline');
    const reconcileWorkItem = vi.spyOn(queries, 'reconcileWorkItem');
    const reconcileChange = vi.spyOn(queries, 'reconcileChange');
    const removeWorkItems = vi.spyOn(queries, 'removeWorkItems');
    const updatedItem = workItem({ status: 'completed' });
    const proposedChange = change();
    page['effortItem'].set({ item: updatedItem, mode: 'planning' });
    loadActivities.mockClear();

    TestBed.inject(Dispatcher).dispatch(
      interventionWorkspaceStoreEvents.mutationSucceeded({
        interventionId: 'intervention-1',
        source: 'queued',
        collections: ['workItems', 'changes', 'activity'],
        workItem: updatedItem,
        change: proposedChange,
        deletedWorkItemIds: ['wi-2'],
      }),
    );

    expect(setOffline).toHaveBeenCalledWith(true, false);
    expect(reconcileWorkItem).toHaveBeenCalledExactlyOnceWith(updatedItem);
    expect(reconcileChange).toHaveBeenCalledExactlyOnceWith(proposedChange);
    expect(removeWorkItems).toHaveBeenCalledExactlyOnceWith('intervention-1', ['wi-2']);
    expect(linked.invalidate).toHaveBeenCalledWith('intervention-1', [
      'workItems',
      'changes',
      'activity',
    ]);
    expect(page['effortItem']()).toBeNull();
    expect(loadActivities).not.toHaveBeenCalled();
  });

  it('reloads the workspace before replay-invalidated queries and ignores a different intervention', async () => {
    fixture = await createPage();
    const queries = fixture.debugElement.injector.get(InterventionTableQueryStore);
    const invalidated = vi.spyOn(queries, 'invalidate');
    const dispatcher = TestBed.inject(Dispatcher);
    dispatcher.dispatch(
      interventionSyncEvents.replaySucceeded({
        interventionId: 'other',
        source: 'replayed',
        collections: ['changes'],
      }),
    );
    expect(reload).not.toHaveBeenCalled();
    dispatcher.dispatch(
      interventionSyncEvents.replaySucceeded({
        interventionId: 'intervention-1',
        source: 'replayed',
        collections: ['changes'],
      }),
    );
    expect(reload).toHaveBeenCalledWith('intervention-1');
    expect(invalidated).not.toHaveBeenCalled();
    dispatcher.dispatch(
      interventionWorkspaceStoreEvents.reloadSucceeded({ interventionId: 'intervention-1' }),
    );
    expect(invalidated).toHaveBeenCalledWith('intervention-1', ['changes']);
  });

  it('refreshes dependent collections after reconnecting before leaving offline query mode', async () => {
    online.set(false);
    fixture = await createPage();
    const queries = fixture.debugElement.injector.get(InterventionTableQueryStore);
    const linked = fixture.debugElement.injector.get(InterventionLinkedResourcesStore);
    const workspace = fixture.debugElement.injector.get(InterventionWorkspaceStore);
    const queryOffline = vi.spyOn(queries, 'setOffline');
    const queryInvalidated = vi.spyOn(queries, 'invalidate');
    const linkedInvalidated = vi.mocked(linked.invalidate);
    vi.mocked(workspace.loadAttachments).mockClear();
    loadActivities.mockClear();
    reload.mockClear();

    online.set(true);
    await fixture.whenStable();
    expect(reload).toHaveBeenCalledExactlyOnceWith('intervention-1');
    expect(queryOffline).toHaveBeenCalledWith(true, false);
    expect(queryInvalidated).not.toHaveBeenCalled();

    TestBed.inject(Dispatcher).dispatch(
      interventionWorkspaceStoreEvents.reloadSucceeded({ interventionId: 'intervention-1' }),
    );
    expect(queryOffline).toHaveBeenLastCalledWith(false, false);
    expect(queryInvalidated).toHaveBeenCalledWith(
      'intervention-1',
      expect.arrayContaining(['workItems', 'activity', 'attachments']),
    );
    expect(linkedInvalidated).toHaveBeenCalledWith(
      'intervention-1',
      expect.arrayContaining(['facilities', 'equipment', 'inspections']),
    );
    expect(loadActivities).toHaveBeenCalledExactlyOnceWith('intervention-1');
    expect(workspace.loadAttachments).toHaveBeenCalledExactlyOnceWith('intervention-1');
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

  it('should keep the properties group free of the desktop divider', async () => {
    fixture = await createPage();

    const properties = byTestId('intervention-detail-properties');
    const aside = properties?.parentElement;

    expect(aside?.classList.contains('@4xl/detail:border-s')).toBe(false);
    expect(aside?.classList.contains('@4xl/detail:ps-6')).toBe(false);
  });

  it('should keep the desktop properties rail below the sticky page chrome', async () => {
    fixture = await createPage();

    const properties = byTestId('intervention-detail-properties');
    const aside = properties?.parentElement;

    expect(aside?.classList.contains('@4xl/detail:sticky')).toBe(true);
    expect(aside?.classList.contains('@4xl/detail:top-40')).toBe(true);
    expect(aside?.classList.contains('@4xl/detail:top-4')).toBe(false);
  });

  it('should render every section at once, with nothing hidden behind a tab', async () => {
    fixture = await createPage();

    expect((byTestId('intervention-detail-field-work') as HTMLElement).hidden).toBe(false);
    expect(byTestId('intervention-detail-properties')).not.toBeNull();
  });

  it('should preserve the shared page-header breathing room', async () => {
    fixture = await createPage();

    const detail = root().querySelector('#intervention-detail');

    expect(detail?.classList.contains('-mt-4')).toBe(false);
    expect(detail?.classList.contains('md:-mt-6')).toBe(false);
  });

  it('should use the compact rhythm between overview sections', async () => {
    fixture = await createPage();

    const overview = root().querySelector('#brn-tabs-content-overview > div');

    expect(overview?.classList.contains('gap-4')).toBe(true);
    expect(overview?.classList.contains('gap-6')).toBe(false);
  });

  it('should keep activity metadata out of the properties surface', async () => {
    fixture = await createPage();

    expect(byTestId('intervention-detail-meta')).toBeNull();
    expect(byTestId('intervention-detail-about')).toBeNull();
  });

  describe('the phase action', () => {
    it('moves the single workflow action to the mobile footer without replacing the comment form', async () => {
      fixture = await createPage();
      const commentForm = root().querySelector('app-intervention-comment-form');
      mobile.set(true);
      await fixture.whenStable();
      const footer = root().querySelector('[data-testid="intervention-mobile-workflow-footer"]');
      expect(
        footer?.querySelector('[data-testid="intervention-detail-command"]')?.textContent,
      ).toContain('Plan intervention');
      expect(root().querySelectorAll('[data-testid="intervention-detail-command"]')).toHaveLength(
        1,
      );
      expect(root().querySelector('app-intervention-comment-form')).toBe(commentForm);
      mobile.set(false);
      await fixture.whenStable();
      expect(
        root().querySelector('[data-testid="intervention-mobile-workflow-footer"]'),
      ).toBeNull();
      expect(root().querySelectorAll('[data-testid="intervention-detail-command"]')).toHaveLength(
        1,
      );
      expect(root().querySelector('app-intervention-comment-form')).toBe(commentForm);
    });

    it('should offer planning once every prerequisite is met', async () => {
      fixture = await createPage();

      expect(byTestId('intervention-detail-command').textContent).toContain('Plan intervention');
      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should disable planning while a prerequisite is missing, and keep the checklist as the guide', async () => {
      current.set(intervention({ dueAt: null }));
      fixture = await createPage();

      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(true);
      expect(byTestId('intervention-getting-started-item')).not.toBeNull();
      expect(root().textContent).toContain('Set a due date');
      expect(byTestId('intervention-detail-status-band').textContent).not.toContain(
        'Set a due date',
      );
      expect(root().querySelector('#intervention-command-reason')).toBeNull();
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
      current.set(
        intervention({
          status: 'in_progress',
          responsible: '/api/other/member-9',
          allowedActions: { ...actionsFor('in_progress'), canSubmit: false },
        }),
      );
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();

      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(true);
      expect(byTestId('intervention-detail-status-band').textContent).not.toContain(
        'Submission is not currently available.',
      );
    });

    it('should refuse publication while offline', async () => {
      current.set(intervention({ status: 'submitted' }));
      online.set(false);
      fixture = await createPage();

      expect((byTestId('intervention-detail-command') as HTMLButtonElement).disabled).toBe(true);
      expect(byTestId('intervention-detail-status-band').textContent).not.toContain(
        'Connect to the network to publish.',
      );
    });

    it('should refuse publication while a compliance point is unresolved', async () => {
      current.set(intervention({ status: 'submitted' }));
      blockerCount.set(2);
      fixture = await createPage();

      expect(byTestId('intervention-detail-status-band').textContent).not.toContain(
        '2 blocking issues to clear.',
      );
    });

    it('should keep the review action in the overflow menu beside publication', async () => {
      current.set(intervention({ status: 'submitted' }));
      fixture = await createPage();

      expect(byTestId('intervention-detail-command').textContent).toContain('Publish intervention');
      expect(root().querySelector('[data-testid="intervention-command-secondary"]')).toBeNull();

      await openPageMenu();

      expect(
        Array.from(
          document.querySelectorAll('[data-testid="intervention-detail-transition"]'),
        ).some((entry) => entry.textContent?.includes('Changes requested')),
      ).toBe(true);
    });

    it('should offer nothing without the permission for the phase', async () => {
      permitted.delete('organization.interventions.plan');
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-detail-command"]')).toBeNull();
    });

    it('should stay at the same address across phases', async () => {
      fixture = await createPage();
      const prepareBand: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-detail-status-band"]',
      );

      current.set(intervention({ status: 'submitted' }));
      await fixture.whenStable();
      const reviewBand: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-detail-status-band"]',
      );

      expect(prepareBand).not.toBeNull();
      expect(reviewBand).toBe(prepareBand);
    });
  });

  describe('the status band', () => {
    it("should render the page's status, phase, action and blockers as the band's own inputs", async () => {
      current.set(
        intervention({
          status: 'changes_requested',
          reviewNote: 'Re-check the third floor.',
          blockersCount: 1,
        }),
      );
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
      blockerCount.set(1);
      fixture = await createPage();

      const band: HTMLElement = byTestId('intervention-detail-status-band');

      expect(band.textContent).not.toContain('Changes requested');
      expect(byTestId('intervention-property-status').textContent).toContain('Changes requested');
      expect(byTestId('intervention-detail-command').textContent).toContain('Record field work');
      await openPageMenu();
      expect(byTestId('intervention-detail-blockers').textContent).toContain('1');
    });

    it('should keep the blockers pill on the live issue count, not the stale intervention snapshot', async () => {
      current.set(intervention({ status: 'submitted', blockersCount: 2 }));
      blockerCount.set(2);
      fixture = await createPage();
      await openPageMenu();

      expect(byTestId('intervention-detail-blockers').textContent).toContain('2');

      blockerCount.set(1);
      await fixture.whenStable();

      expect(byTestId('intervention-detail-blockers').textContent).toContain('1');

      blockerCount.set(0);
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="intervention-detail-blockers"]')).toBeNull();
    });

    it("should dispatch the page's own transition when the band's action is invoked", async () => {
      fixture = await createPage();

      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'planned',
      });
    });

    it('should scroll to and focus the issues checklist when the band asks to see the blockers', async () => {
      current.set(intervention({ status: 'submitted', blockersCount: 1 }));
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
      blockerCount.set(1);
      fixture = await createPage();
      const originalScrollIntoView: (options?: boolean | ScrollIntoViewOptions) => void =
        HTMLElement.prototype.scrollIntoView;
      const scrollIntoView: ReturnType<
        typeof vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>
      > = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoView;

      try {
        await openPageMenu();
        byTestId('intervention-detail-blockers').click();
        await fixture.whenStable();
        await new Promise<void>((resolve) => setTimeout(resolve));

        const checklistWrapper: HTMLElement | null = root()
          .querySelector('app-intervention-issues-checklist')
          ?.closest('[tabindex="-1"]') as HTMLElement | null;

        expect(checklistWrapper).not.toBeNull();
        expect(scrollIntoView.mock.instances[0]).toBe(checklistWrapper);
        expect(document.activeElement).toBe(checklistWrapper);
      } finally {
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      }
    });
  });

  describe('completion signature', () => {
    it('should interpose the signature dialog on submit when the intervention is unsigned', async () => {
      current.set(intervention({ status: 'in_progress', hasSignature: false }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();

      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(inBody('intervention-signature-dialog')).not.toBeNull();
      expect(transition).not.toHaveBeenCalled();
    });

    it('should cancel without submitting when the signature is dismissed', async () => {
      current.set(intervention({ status: 'in_progress', hasSignature: false }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();
      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();
      (inBody('intervention-signature-cancel') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(inBody('intervention-signature-dialog')).toBeNull();
      expect(transition).not.toHaveBeenCalled();
    });

    it('should submit unsigned when the dialog is skipped', async () => {
      current.set(intervention({ status: 'in_progress', hasSignature: false }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();

      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();
      (
        document.querySelector('[data-testid="intervention-signature-skip"]') as HTMLButtonElement
      ).click();
      await fixture.whenStable();

      expect(inBody('intervention-signature-dialog')).toBeNull();
      expect(uploadAttachment).not.toHaveBeenCalled();
      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'submitted',
      });
      // Skip emits `dismissed` itself AND the closing dialog echoes it — one transition only.
      expect(transition).toHaveBeenCalledTimes(1);
    });

    it('should upload the signature then submit only once the upload has landed', async () => {
      current.set(intervention({ status: 'in_progress', hasSignature: false }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();
      const dispatcher: Dispatcher = TestBed.inject(Dispatcher);

      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();

      const canvas: HTMLCanvasElement = document.querySelector(
        '[data-testid="intervention-signature-canvas"]',
      ) as HTMLCanvasElement;
      canvas.setPointerCapture = (): void => undefined;
      canvas.releasePointerCapture = (): void => undefined;
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { clientX: 5, clientY: 5, pointerId: 1 }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 15, clientY: 15, pointerId: 1 }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointerup', { clientX: 15, clientY: 15, pointerId: 1 }),
      );
      await fixture.whenStable();

      const blob = new Blob(['signature'], { type: 'image/png' });
      canvas.toBlob = (callback: BlobCallback): void => callback(blob);
      (
        document.querySelector(
          '[data-testid="intervention-signature-confirm"]',
        ) as HTMLButtonElement
      ).click();
      await fixture.whenStable();

      expect(uploadAttachment).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        file: blob,
        fileName: 'signature.png',
        kind: 'signature',
      });
      expect(inBody('intervention-signature-dialog')).not.toBeNull();
      expect(transition).not.toHaveBeenCalled();

      dispatcher.dispatch(
        interventionWorkspaceStoreEvents.attachmentUploadSucceeded({
          attachment: attachment({ kind: 'signature' }),
        }),
      );
      await fixture.whenStable();

      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'submitted',
      });
    });

    it('keeps signature submission recoverable after an unrelated upload and a failed signature upload', async () => {
      current.set(intervention({ status: 'in_progress', hasSignature: false }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();
      const page = fixture.componentInstance;
      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();

      page['onSignatureCaptured'](new Blob(['signature'], { type: 'image/png' }));
      page['onSignatureDismissed']();
      expect(page['signingSubmitPending']()).toBe(true);
      expect(page['signatureDialogVisible']()).toBe(true);
      TestBed.inject(Dispatcher).dispatch(
        interventionWorkspaceStoreEvents.attachmentUploadSucceeded({ attachment: attachment() }),
      );
      expect(transition).not.toHaveBeenCalled();

      attachmentWriteCallState.set(
        errorCallState({
          error: null,
          message: 'Signature upload failed',
          code: null,
          retryable: true,
          timestamp: 0,
        }),
      );
      await fixture.whenStable();
      expect(page['signingSubmitPending']()).toBe(false);
      expect(page['signatureDialogVisible']()).toBe(true);
      expect(transition).not.toHaveBeenCalled();

      page['onSignatureSkipped']();
      expect(transition).toHaveBeenCalledExactlyOnceWith({
        interventionId: 'intervention-1',
        status: 'submitted',
      });
    });

    it('should submit directly without a dialog once already signed', async () => {
      current.set(intervention({ status: 'in_progress', hasSignature: true }));
      workItems.set([workItem({ status: 'completed' })]);
      fixture = await createPage();

      (byTestId('intervention-detail-command') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(inBody('intervention-signature-dialog')).toBeNull();
      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'submitted',
      });
    });
  });

  describe('publication recap', () => {
    it('should show the recap only inside the publish confirmation, never inline on the page', async () => {
      current.set(intervention({ status: 'submitted' }));
      fixture = await createPage();

      expect(root().querySelector('app-intervention-publication-summary')).toBeNull();

      byTestId('intervention-detail-command').click();
      await fixture.whenStable();

      expect(document.querySelector('app-intervention-publication-summary')).not.toBeNull();
    });

    it('should count the blockers on the status band and list them in the issues checklist', async () => {
      current.set(intervention({ status: 'submitted', blockersCount: 1 }));
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
      blockerCount.set(1);
      fixture = await createPage();

      await openPageMenu();
      expect(byTestId('intervention-detail-blockers').textContent).toContain('1');
      expect(root().textContent).toContain('Missing sign-off.');
    });
  });

  describe('notices', () => {
    it('should report each failed work mutation through feedback without an inline page alert', async () => {
      fixture = await createPage();
      const state = workItemWriteCallState;
      const failure = errorCallState({
        error: null,
        message: 'This work item is no longer editable.',
        code: 403,
        retryable: false,
        timestamp: 0,
      });
      state.set(failure);
      await fixture.whenStable();
      expect(feedbackError).toHaveBeenCalledWith('This work item is no longer editable.');
      expect(root().querySelector('[data-testid="intervention-detail-error"]')).toBeNull();
      state.set(pendingCallState());
      await fixture.whenStable();
      state.set(failure);
      await fixture.whenStable();
      expect(feedbackError).toHaveBeenCalledTimes(2);
    });

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

      expect(root().querySelector('[data-testid="intervention-detail-error"]')).toBeNull();
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

    it('should render the reviewer note in the page content, not inside the fixed bottom bar', async () => {
      current.set(
        intervention({ status: 'changes_requested', reviewNote: 'Re-check the third floor.' }),
      );
      fixture = await createPage();

      const note: HTMLElement = byTestId('intervention-detail-review-note');

      expect(note.textContent).toContain('Re-check the third floor.');
      // The band is a fixed thumb-zone bar on mobile; an unbounded note there
      // overran the work surface, so it lives in scrollable page flow now.
      expect(byTestId('intervention-detail-status-band').contains(note)).toBe(false);
    });
  });

  describe('blocked synchronization', () => {
    it('should show nothing while the device has nothing blocked', async () => {
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-sync-blocked-alert"]')).toBeNull();
      expect(listOutbox).toHaveBeenCalledWith('intervention-1');
    });

    it('should surface the blocked operations of THIS intervention on the page', async () => {
      syncBlockedCount.set(2);
      syncProblem.set('Replay stopped after a conflict.');
      listOutbox.mockResolvedValue([
        {
          id: 'op-1',
          interventionId: 'intervention-1',
          type: 'comment.create',
          payload: { body: 'Riser valve replaced.' },
          createdAt: '2026-08-28T09:00:00.000Z',
          status: 'failed',
          error: 'The server refused the comment.',
        },
        {
          id: 'op-2',
          interventionId: 'intervention-1',
          type: 'work-item.create',
          payload: { action: 'inspect' },
          createdAt: '2026-08-28T09:01:00.000Z',
          status: 'pending',
        },
      ]);
      fixture = await createPage();

      expect(listOutbox).toHaveBeenCalledWith('intervention-1');

      const alert: HTMLElement = byTestId('intervention-sync-blocked-alert');

      expect(alert).not.toBeNull();
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.textContent).toContain('New comment');
      expect(alert.textContent).toContain('The server refused the comment.');
      expect(alert.textContent).not.toContain('Replay stopped after a conflict.');
      expect(alert.textContent).not.toContain('New work item');
    });

    it('should replay the queue from the page instead of sending the agent to the header', async () => {
      syncBlockedCount.set(1);
      listOutbox.mockResolvedValue([
        {
          id: 'op-1',
          interventionId: 'intervention-1',
          type: 'work-item.update',
          payload: { workItemId: 'wi-1', status: 'completed' },
          createdAt: '2026-08-28T09:00:00.000Z',
          status: 'conflict',
          error: null,
        },
      ]);
      fixture = await createPage();

      byTestId('intervention-sync-blocked-alert-retry').click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(retryBlocked).not.toHaveBeenCalled();
      expect(
        document.querySelector('[data-testid="intervention-operations-sheet"]'),
      ).not.toBeNull();
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
      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      const entries: HTMLElement[] = Array.from(
        document.querySelectorAll('[data-testid="intervention-detail-transition"]'),
      );

      expect(entries.some((entry) => entry.textContent?.includes('Abandoned'))).toBe(false);
      expect(entries.some((entry) => entry.textContent?.includes('In progress'))).toBe(true);
    });

    it('should not offer the forward move the status band gates, which would make its readiness check advisory', async () => {
      current.set(
        intervention({
          status: 'changes_requested',
          allowedTransitions: ['in_progress', 'submitted', 'abandoned'],
        }),
      );
      fixture = await createPage();
      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      const entries: HTMLElement[] = Array.from(
        document.querySelectorAll('[data-testid="intervention-detail-transition"]'),
      );

      expect(entries.some((entry) => entry.textContent?.includes('Submitted'))).toBe(false);
    });

    it('should offer no transition group when the band owns every remaining move, even with the overflow menu still present for Duplicate', async () => {
      current.set(intervention({ status: 'draft', allowedTransitions: ['planned', 'abandoned'] }));
      fixture = await createPage();
      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="intervention-detail-transition"]')).toBeNull();
      expect(root().textContent).not.toContain('Send it to');
    });

    it('should drop a target the member lacks the capability for, keeping the overflow trigger for Export report alone', async () => {
      permitted.delete('organization.interventions.plan');
      permitted.delete('organization.interventions.execute');
      current.set(
        intervention({
          status: 'draft',
          allowedTransitions: ['planned'],
          allowedActions: {
            ...actionsFor('published'),
            canPublish: false,
          },
        }),
      );
      fixture = await createPage();

      expect(byPageActionsTestId('intervention-detail-menu')).not.toBeNull();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="intervention-detail-transition"]')).toBeNull();
      expect(document.querySelector('[data-testid="intervention-detail-duplicate"]')).toBeNull();
      expect(
        document.querySelector('[data-testid="intervention-detail-export-report"]'),
      ).not.toBeNull();
    });

    it('should still offer the menu and its transition group to a member with only transition rights, and dispatch the exact move on pick', async () => {
      permitted.delete('organization.interventions.plan');
      permitted.delete('organization.interventions.review');
      current.set(
        intervention({
          status: 'changes_requested',
          allowedTransitions: ['in_progress', 'submitted', 'abandoned'],
        }),
      );
      fixture = await createPage();

      expect(byPageActionsTestId('intervention-detail-menu')).not.toBeNull();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      const entries: HTMLElement[] = Array.from(
        document.querySelectorAll('[data-testid="intervention-detail-transition"]'),
      );

      expect(entries).toHaveLength(1);
      expect(inBody('intervention-detail-duplicate')).toBeNull();
      expect(inBody('intervention-detail-abandon')).toBeNull();
      expect(inBody('intervention-detail-delete')).toBeNull();

      entries[0].click();

      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'in_progress',
      });
    });
  });

  describe('prev / next', () => {
    it('should walk the order the list established', async () => {
      orderedIds.set(['a', 'intervention-1', 'z']);
      fixture = await createPage();

      byTestId('intervention-detail-next').click();

      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'z'], {
        queryParamsHandling: 'preserve',
      });
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

    it('uses j/k for neighbouring records without intercepting typing in form controls', async () => {
      orderedIds.set(['previous', 'intervention-1', 'next']);
      fixture = await createPage();
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      root().append(input, textarea, select);

      for (const control of [input, textarea, select]) {
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
      }
      expect(navigate).not.toHaveBeenCalled();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));

      expect(navigate).toHaveBeenNthCalledWith(
        1,
        ['/organizations', 'org-1', 'interventions', 'next'],
        { queryParamsHandling: 'preserve' },
      );
      expect(navigate).toHaveBeenNthCalledWith(
        2,
        ['/organizations', 'org-1', 'interventions', 'previous'],
        { queryParamsHandling: 'preserve' },
      );
    });

    it('keeps record shortcuts inactive during editing, confirmation and modified key presses', async () => {
      orderedIds.set(['previous', 'intervention-1', 'next']);
      fixture = await createPage();

      dispatchRecordShortcut({ ctrlKey: true });
      dispatchRecordShortcut({ metaKey: true });
      dispatchRecordShortcut({ altKey: true });
      const alreadyHandled = new KeyboardEvent('keydown', {
        key: 'j',
        bubbles: true,
        cancelable: true,
      });
      alreadyHandled.preventDefault();
      document.dispatchEvent(alreadyHandled);

      const page = fixture.componentInstance;
      page['pendingConfirm'].set({ kind: 'deleteIntervention' });
      dispatchRecordShortcut();
      page['pendingConfirm'].set(null);
      page['editState'].set({ open: 'priority', saving: null, failed: null, failure: null });
      dispatchRecordShortcut();
      page['editState'].set({ open: null, saving: null, failed: null, failure: null });
      page['discussionSheetVisible'].set(true);
      dispatchRecordShortcut();
      page['discussionSheetVisible'].set(false);
      expect(navigate).not.toHaveBeenCalled();

      dispatchRecordShortcut();
      expect(navigate).toHaveBeenCalledExactlyOnceWith(
        ['/organizations', 'org-1', 'interventions', 'next'],
        { queryParamsHandling: 'preserve' },
      );
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

    it('should open the editor a getting-started item points at, on the always-visible properties rail', async () => {
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

  describe('the rail tab in the URL', () => {
    it('should scroll the main region after mounting a tab without stealing focus', async () => {
      fixture = await createPage();
      const main = document.createElement('main');
      main.id = 'dashboard-main';
      main.append(root());
      main.scrollTo = vi.fn();
      const focused = document.activeElement;
      fixture.componentInstance['onLinkedTabActivated']('changes');
      await fixture.whenStable();
      expect(main.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
      expect(document.activeElement).toBe(focused);
    });

    it('does not scroll the old intervention when a tab switch is overtaken by route navigation', async () => {
      fixture = await createPage();
      const main = document.createElement('main');
      main.id = 'dashboard-main';
      main.append(root());
      main.scrollTo = vi.fn();

      fixture.componentInstance['onLinkedTabActivated']('changes');
      fixture.componentRef.setInput('interventionId', 'intervention-2');
      await fixture.whenStable();

      expect(main.scrollTo).not.toHaveBeenCalled();
      expect(load).toHaveBeenCalledWith('intervention-2');
    });

    it('should restore the loaded name after internal navigation and ignore another intervention', async () => {
      fixture = await createPage();
      const title = TestBed.inject(TitleService);
      const events = TestBed.inject(Router).events as Subject<RouterEvent>;
      vi.mocked(title.setTitle).mockClear();
      events.next(new NavigationEnd(1, '?tab=changes', '?tab=changes'));
      await Promise.resolve();
      expect(title.setTitle).toHaveBeenLastCalledWith(current()?.name);
      vi.mocked(title.setTitle).mockClear();
      events.next(new NavigationEnd(2, '?tab=equipment', '?tab=equipment'));
      fixture.componentRef.setInput('interventionId', 'another-intervention');
      await Promise.resolve();
      expect(title.setTitle).not.toHaveBeenCalled();
    });

    it('should default to overview when the URL asks for nothing', async () => {
      fixture = await createPage();

      expect(fixture.componentInstance['activeLinkedTab']()).toBe('overview');
    });

    it('should open the tab the URL names', async () => {
      fixture = await createPage();
      fixture.componentRef.setInput('tab', 'changes');
      await fixture.whenStable();

      expect(fixture.componentInstance['activeLinkedTab']()).toBe('changes');
    });

    it('should fall back to overview on an unknown tab id', async () => {
      fixture = await createPage();
      fixture.componentRef.setInput('tab', 'not-a-tab');
      await fixture.whenStable();

      expect(fixture.componentInstance['activeLinkedTab']()).toBe('overview');
    });

    it('should mirror an activated tab into ?tab= and drop the param on overview', async () => {
      fixture = await createPage();
      navigate.mockClear();

      fixture.componentInstance['onLinkedTabActivated']('changes');

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { tab: 'changes' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );

      navigate.mockClear();
      fixture.componentInstance['onLinkedTabActivated']('overview');

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: null } }),
      );
    });

    it('loads each linked resource only when its tab is visited and queries applied changes after publication', async () => {
      current.set(intervention({ status: 'published' }));
      fixture = await createPage();
      const page = fixture.componentInstance;
      const linked = fixture.debugElement.injector.get(InterventionLinkedResourcesStore);
      const queries = fixture.debugElement.injector.get(InterventionTableQueryStore);
      const changesActivated = vi.spyOn(queries, 'activateChanges');
      expect(linked.ensureFacilitiesLoaded).not.toHaveBeenCalled();
      expect(linked.ensureEquipmentLoaded).not.toHaveBeenCalled();
      expect(linked.ensureInspectionsLoaded).not.toHaveBeenCalled();

      page['onLinkedTabActivated']('changes');
      await fixture.whenStable();
      expect(changesActivated).toHaveBeenCalledWith('intervention-1', {
        search: '',
        status: 'applied',
      });

      page['onLinkedTabActivated']('facilities');
      await fixture.whenStable();
      expect(linked.ensureFacilitiesLoaded).toHaveBeenCalledExactlyOnceWith('intervention-1');
      page['onLinkedTabActivated']('equipment');
      await fixture.whenStable();
      expect(linked.ensureEquipmentLoaded).toHaveBeenCalledExactlyOnceWith('intervention-1');
      page['onLinkedTabActivated']('inspections');
      await fixture.whenStable();
      expect(linked.ensureInspectionsLoaded).toHaveBeenCalledExactlyOnceWith('intervention-1');
    });
  });

  describe('confirmations', () => {
    it('should abandon only after its own confirmation is accepted', async () => {
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      (inBody('intervention-detail-abandon') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(transition).not.toHaveBeenCalled();
      expect(document.querySelector('[data-testid="intervention-abandon-dialog"]')).not.toBeNull();

      (inBody('intervention-abandon-confirm') as HTMLButtonElement).click();

      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'abandoned',
      });
    });

    it('should delete through the list store, the only one that repairs the collection', async () => {
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      (inBody('intervention-detail-delete') as HTMLButtonElement).click();
      await fixture.whenStable();
      (inBody('intervention-detail-confirm-accept') as HTMLButtonElement).click();

      expect(listDelete).toHaveBeenCalledWith({ interventionId: 'intervention-1', revision: 3 });
      expect(workspaceDelete).not.toHaveBeenCalled();
    });
  });

  describe('duplicate', () => {
    it('should hand a prefill to the list store and navigate there with ?create=1', async () => {
      current.set(intervention({ name: 'Quarterly sweep', type: 'inventory', priority: 'normal' }));
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      (inBody('intervention-detail-duplicate') as HTMLButtonElement).click();

      expect(setPendingDuplicatePrefill).toHaveBeenCalledWith({
        name: 'Quarterly sweep (copy)',
        type: 'inventory',
        priority: 'normal',
        site: '/api/facilities/facility-1',
        responsible: MEMBER_IRI,
      });
      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions'], {
        queryParams: { create: '1' },
      });
    });

    it('should not offer Duplicate without the plan permission', async () => {
      permitted.delete('organization.interventions.plan');
      current.set(intervention({ status: 'in_progress' }));
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      expect(inBody('intervention-detail-duplicate')).toBeNull();
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

      (byTestId('intervention-work-items-empty-add') as HTMLButtonElement).click();
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

      (byTestId('intervention-work-items-empty-add') as HTMLButtonElement).click();
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
          estimatedMinutes: null,
          workStartsOn: null,
          workEndsOn: null,
          source: 'planned',
          required: true,
        },
      });
    });

    it('should keep the add affordance while the server advertises mutable work items', async () => {
      current.set(intervention({ status: 'in_progress' }));
      fixture = await createPage();

      expect(
        root().querySelector('[data-testid="intervention-work-items-empty-add"]'),
      ).not.toBeNull();
    });

    it('should offer no add affordance once the server stops advertising mutable work items', async () => {
      current.set(
        intervention({
          status: 'in_progress',
          allowedActions: { ...actionsFor('in_progress'), canMutateWorkItems: false },
        }),
      );
      fixture = await createPage();

      expect(root().querySelector('[data-testid="intervention-work-items-add"]')).toBeNull();
    });
  });

  describe('proposed changes', () => {
    it('should show zero on the changes tab trigger and mount nothing until that tab activates', async () => {
      fixture = await createPage();

      expect(byTestId('intervention-tab-changes').textContent).toContain('0');
      expect(root().querySelector('[data-testid="intervention-change-table"]')).toBeNull();

      byTestId('intervention-tab-changes').click();
      await fixture.whenStable();

      const list: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-change-table"]',
      );

      expect(list).not.toBeNull();
      expect(list?.querySelectorAll('[data-testid="intervention-change-row"]')).toHaveLength(0);
    });

    it('should count only the still-proposed changes on the trigger, once activated', async () => {
      changes.set([
        change({ id: 'change-1', status: 'proposed' }),
        change({ id: 'change-2', status: 'rejected' }),
        change({ id: 'change-3', status: 'proposed' }),
      ]);
      fixture = await createPage();

      expect(byTestId('intervention-tab-changes').textContent).toContain('2');

      byTestId('intervention-tab-changes').click();
      await fixture.whenStable();

      const list: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-change-table"]',
      );

      expect(list?.querySelectorAll('[data-testid="intervention-change-row"]')).toHaveLength(2);
    });
  });

  describe('linked tabs', () => {
    it('should render linked resource totals as secondary badges on their triggers', async () => {
      fixture = await createPage();

      const expectedCounts: Readonly<Record<string, number>> = {
        'intervention-tab-changes': 0,
        'intervention-tab-attachments': 0,
        'intervention-tab-facilities': 0,
        'intervention-tab-equipment': 0,
        'intervention-tab-inspections': 4,
      };

      for (const [testId, expectedCount] of Object.entries(expectedCounts)) {
        const badge: HTMLElement | null = byTestId(testId).querySelector('[data-slot="badge"]');

        expect(badge?.getAttribute('data-variant')).toBe('secondary');
        expect(badge?.textContent?.trim()).toBe(String(expectedCount));
      }
    });

    it('should mount attachments only once its tab activates, and show the total count on the trigger', async () => {
      attachments.set([attachment(), attachment({ id: 'attachment-2' })]);
      fixture = await createPage();

      expect(byTestId('intervention-tab-attachments').textContent).toContain('2');
      expect(root().querySelector('app-intervention-attachments')).toBeNull();

      byTestId('intervention-tab-attachments').click();
      await fixture.whenStable();

      expect(root().querySelector('app-intervention-attachments')).not.toBeNull();
    });

    it('should ignore an activated id outside the known tab union and keep the overview tab showing', async () => {
      fixture = await createPage();
      const tabsHost: DebugElement = fixture.debugElement.query(By.css('hlm-tabs'));

      tabsHost.triggerEventHandler('tabActivated', 'bogus');
      await fixture.whenStable();

      expect(byTestId('intervention-tab-overview').getAttribute('data-state')).toBe('active');
      expect(byTestId('intervention-tab-changes').getAttribute('data-state')).not.toBe('active');
      expect((byTestId('intervention-detail-field-work') as HTMLElement).hidden).toBe(false);
      expect(root().querySelector('app-intervention-attachments')).toBeNull();
      expect(root().querySelector('[data-testid="intervention-change-table"]')).toBeNull();
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

    it('should not add a second padding block above the comment composer', async () => {
      fixture = await createPage();

      const composer = root().querySelector('app-intervention-comment-form');

      expect(composer?.parentElement?.classList.contains('pt-4')).toBe(false);
      expect(
        root().querySelector('#intervention-activity-content')?.classList.contains('pt-3'),
      ).toBe(false);
    });

    it('should keep the comment composer inside the activity section', async () => {
      fixture = await createPage();

      const activity = byTestId('intervention-activity-thread');

      expect(activity?.getAttribute('data-slot')).toBeNull();
      expect(activity?.querySelector(':scope > [data-slot="card"]')).toBeNull();
      expect(activity?.querySelector('app-intervention-comment-form')).not.toBeNull();
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

  describe('discussion', () => {
    it('should offer the Discussion trigger when messaging.read is granted', async () => {
      fixture = await createPage();

      await openPageMenu();
      expect(byTestId('intervention-detail-discussion-trigger').textContent).toContain(
        'Intervention activity',
      );
    });

    it('should keep intervention activity available without team messaging access', async () => {
      permitted.delete('organization.messaging.read');
      fixture = await createPage();

      await openPageMenu();
      expect(byTestId('intervention-detail-discussion-trigger').textContent).toContain(
        'Intervention activity',
      );
    });

    it('should open the activity and focus the comment from Discussion', async () => {
      fixture = await createPage();
      expect(root().querySelector('#intervention-activity-content')).not.toBeNull();
      await openPageMenu();
      const trigger = byTestId('intervention-detail-discussion-trigger');
      document.body.appendChild(root());
      trigger?.click();
      await fixture.whenStable();
      await new Promise<void>((resolve) => setTimeout(resolve));
      expect(root().querySelector('[data-testid="intervention-activity-toggle"]')).toBeNull();
      expect(document.activeElement?.getAttribute('data-testid')).toBe('intervention-comment-body');
      expect(openSubjectThread).not.toHaveBeenCalled();
    });

    it('should retain live team messaging in the secondary menu', async () => {
      fixture = await createPage();
      expect(openSubjectThread).not.toHaveBeenCalled();
      fixture.componentInstance['discussionSheetVisible'].set(true);
      await fixture.whenStable();
      expect(openSubjectThread).toHaveBeenCalledWith({
        organization: 'org-1',
        subjectType: 'intervention',
        subject: 'intervention-1',
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

  describe('attachment download', () => {
    it('should fetch the attachment and hand the blob to the browser download service', async () => {
      attachments.set([attachment()]);
      fixture = await createPage();
      byTestId('intervention-tab-attachments').click();
      await fixture.whenStable();

      byTestId('intervention-attachment-download').dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(downloadAttachment).toHaveBeenCalledWith('attachment-1');
      expect(browserDownloadTrigger).toHaveBeenCalledWith(expect.any(Blob), 'evidence.pdf');
    });

    it('should clear the pending state and report a failure when the fetch errors', async () => {
      downloadAttachment.mockReturnValue(throwError(() => new Error('network down')));
      attachments.set([attachment()]);
      fixture = await createPage();
      byTestId('intervention-tab-attachments').click();
      await fixture.whenStable();

      byTestId('intervention-attachment-download').dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(browserDownloadTrigger).not.toHaveBeenCalled();
      expect(feedbackError).toHaveBeenCalledTimes(1);
    });
  });

  describe('report export', () => {
    it('should fetch the report and hand the blob to the browser download service with the FG filename', async () => {
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      (inBody('intervention-detail-export-report') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(exportReport).toHaveBeenCalledWith('intervention-1');
      expect(browserDownloadTrigger).toHaveBeenCalledWith(
        expect.any(Blob),
        'intervention-FG-42-report.pdf',
      );
    });

    it('should disable the entry and mark it aria-busy while the export is in flight', async () => {
      exportReport.mockReturnValue(new Subject<Blob>());
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      (inBody('intervention-detail-export-report') as HTMLButtonElement).click();
      await fixture.whenStable();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      const reopened = inBody('intervention-detail-export-report') as HTMLButtonElement;

      expect(reopened.disabled).toBe(true);
      expect(reopened.getAttribute('aria-busy')).toBe('true');
    });

    it('should clear the pending state and report a failure when the export errors', async () => {
      exportReport.mockReturnValue(throwError(() => new Error('network down')));
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();
      (inBody('intervention-detail-export-report') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(browserDownloadTrigger).not.toHaveBeenCalled();
      expect(feedbackError).toHaveBeenCalledTimes(1);
    });

    it('should offer Export report regardless of phase, even with no other menu entries available', async () => {
      permitted.delete('organization.interventions.plan');
      permitted.delete('organization.interventions.execute');
      current.set(
        intervention({
          status: 'draft',
          allowedTransitions: ['planned'],
          allowedActions: {
            ...actionsFor('published'),
            canPublish: false,
          },
        }),
      );
      fixture = await createPage();

      byPageActionsTestId('intervention-detail-menu')?.click();
      await fixture.whenStable();

      expect(inBody('intervention-detail-export-report')).not.toBeNull();
    });
  });

  describe('work-item evidence intake', () => {
    it('should open the evidence intake and upload with the row’s workItemId', async () => {
      workItems.set([workItem({ id: 'wi-1' })]);
      fixture = await createPage();

      byTestId('intervention-work-item-evidence').dispatchEvent(new Event('click'));
      await fixture.whenStable();

      const photo = new File(['jpeg-bytes'], 'evidence.jpg', { type: 'image/jpeg' });
      const input = fixture.nativeElement.querySelector(
        '[data-testid="intervention-work-item-evidence-input"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { 0: photo, length: 1, item: (i: number) => (i === 0 ? photo : null) }, // `DataTransfer` is absent from the test DOM and `input.files` is read-only.
      });
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(uploadAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ interventionId: 'intervention-1', workItemId: 'wi-1' }),
      );
    });
  });
  it('opens saved operations only after the mobile actions drawer closes', async () => {
    mobile.set(true);
    fixture = await createPage();
    root()
      .querySelector<HTMLButtonElement>('[data-testid="intervention-detail-mobile-actions"]')
      ?.click();
    await fixture.whenStable();

    const action = Array.from(
      document.querySelectorAll<HTMLButtonElement>('hlm-drawer-content button'),
    ).find((button) => button.textContent?.includes('View saved operations'));
    expect(action).toBeDefined();
    action?.click();
    expect(fixture.componentInstance['operationsVisible']()).toBe(false);
    await fixture.whenStable();

    expect(document.querySelector('hlm-drawer-content')).toBeNull();
    expect(fixture.componentInstance['operationsVisible']()).toBe(true);
  });

  it('opens permitted secondary mobile actions only after a loaded intervention exists', async () => {
    mobile.set(true);
    permitted.add('organization.teams.read');
    fixture = await createPage();
    const page = fixture.componentInstance;

    page['onMobileActionsClosed']('discussion');
    expect(page['discussionSheetVisible']()).toBe(true);
    page['onMobileActionsClosed']('team');
    expect(page['teamAssignVisible']()).toBe(true);
    page['onMobileActionsClosed']('delete');
    expect(page['pendingConfirm']()).toEqual({ kind: 'deleteIntervention' });
    expect(listDelete).not.toHaveBeenCalled();

    current.set(null);
    await fixture.whenStable();
    page['pendingConfirm'].set(null);
    page['teamAssignVisible'].set(false);
    page['discussionSheetVisible'].set(false);
    page['onMobileActionsClosed']('delete');
    page['onMobileActionsClosed']('team');
    page['onMobileActionsClosed']('discussion');
    expect(page['pendingConfirm']()).toBeNull();
    expect(page['teamAssignVisible']()).toBe(false);
    expect(page['discussionSheetVisible']()).toBe(false);
  });

  it('defers a mobile request for changes until the drawer reports that it closed', async () => {
    mobile.set(true);
    current.set(intervention({ status: 'submitted' }));
    fixture = await createPage();
    const page = fixture.componentInstance;
    const drawer = { close: vi.fn() };

    page['onMobileTransitionSelected']('changes_requested', drawer as never);
    expect(drawer.close).toHaveBeenCalledExactlyOnceWith('requestChanges');
    expect(page['requestChangesVisible']()).toBe(false);
    expect(transition).not.toHaveBeenCalled();

    page['onMobileActionsClosed']('requestChanges');
    expect(page['requestChangesVisible']()).toBe(true);
    expect(transition).not.toHaveBeenCalled();

    drawer.close.mockClear();
    page['onMobileTransitionSelected']('draft', drawer as never);
    expect(drawer.close).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  describe('secondary workflow commands', () => {
    it('refreshes label choices after a label is created, updated and removed in the manage dialog', async () => {
      fixture = await createPage();
      const service = TestBed.inject(InterventionLabelService);
      const options = fixture.debugElement.injector.get(InterventionPlanningOptionsStore);
      const grid = fixture.debugElement.query(By.css('app-intervention-properties-grid'));
      grid.triggerEventHandler('manageLabelsRequested');
      await fixture.whenStable();
      expect(fixture.componentInstance['manageLabelsVisible']()).toBe(true);
      expect(service.list).toHaveBeenCalledWith('/api/organizations/org-1');

      const dialog = fixture.debugElement.query(By.css('app-intervention-label-manage-dialog'));
      dialog.triggerEventHandler('created', { name: 'Urgent', color: '#ff0000' });
      await fixture.whenStable();
      expect(service.create).toHaveBeenCalledWith({
        organization: '/api/organizations/org-1',
        name: 'Urgent',
        color: '#ff0000',
      });
      expect(options.loadWorkspaceOptions).toHaveBeenCalledWith('org-1');

      vi.mocked(options.loadWorkspaceOptions).mockClear();
      dialog.triggerEventHandler('updated', {
        labelId: 'label-1',
        name: 'Renamed',
        color: '#00ff00',
      });
      await fixture.whenStable();
      expect(service.update).toHaveBeenCalledWith('label-1', {
        name: 'Renamed',
        color: '#00ff00',
      });
      expect(options.loadWorkspaceOptions).toHaveBeenCalledWith('org-1');

      vi.mocked(options.loadWorkspaceOptions).mockClear();
      dialog.triggerEventHandler('removed', 'label-1');
      await fixture.whenStable();
      expect(service.remove).toHaveBeenCalledWith('label-1');
      expect(options.loadWorkspaceOptions).toHaveBeenCalledWith('org-1');
      dialog.triggerEventHandler('closed');
      expect(fixture.componentInstance['manageLabelsVisible']()).toBe(false);
    });

    it('retries selected resources and activity pages without changing the draft', async () => {
      current.set(intervention({ participants: ['/api/organizations/org-1/members/member-2'] }));
      fixture = await createPage();
      const page = fixture.componentInstance;
      const options = fixture.debugElement.injector.get(InterventionPlanningOptionsStore);
      page['retrySelectedResources']();
      page['loadOlderActivities']();
      page['reloadActivities']();
      expect(options.ensureSelected).toHaveBeenLastCalledWith('org-1', [
        '/api/facilities/facility-1',
        MEMBER_IRI,
        '/api/organizations/org-1/members/member-2',
      ]);
      expect(loadOlderActivities).toHaveBeenCalledWith('intervention-1');
      expect(loadActivities).toHaveBeenLastCalledWith('intervention-1');
      expect(updateDetails).not.toHaveBeenCalled();
    });

    it('routes publication issues to their editor or resource tab', async () => {
      fixture = await createPage();
      const page = fixture.componentInstance;
      page['onIssueActivated']({ kind: 'railTab', tab: 'equipment' });
      expect(page['activeLinkedTab']()).toBe('equipment');
      page['onIssueActivated']({ kind: 'edit', target: 'description' });
      expect(page['editState']().open).toBe('description');
      page['onIssueActivated']({ kind: 'workItems' });
      expect(page['activeLinkedTab']()).toBe('overview');
      expect(publish).not.toHaveBeenCalled();
    });

    it('forwards progress and review reasons to the owning workspace', async () => {
      fixture = await createPage();
      const page = fixture.componentInstance;
      const store = fixture.debugElement.injector.get(InterventionWorkspaceStore);
      page['onWorkItemStatusChanged']({ workItemId: 'wi-1', status: 'completed' });
      page['rejectChange']('change-1');
      page['requestChanges']({ note: 'Please attach the missing certificate.' });
      expect(setWorkItemStatus).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        workItemId: 'wi-1',
        status: 'completed',
      });
      expect(store.rejectChange).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        changeId: 'change-1',
      });
      expect(transition).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        status: 'changes_requested',
        reviewNote: 'Please attach the missing certificate.',
      });
    });

    it('requires confirmation for work deletion and skipping, and preserves the skip reason', async () => {
      fixture = await createPage();
      const page = fixture.componentInstance;
      const item = workItem();
      page['requestDeleteWorkItem'](item);
      expect(deleteWorkItems).not.toHaveBeenCalled();
      expect(page['pendingConfirm']()).toEqual({ kind: 'deleteWorkItem', workItem: item });
      page['onConfirmDismissed']();
      expect(page['pendingConfirm']()).toBeNull();
      page['requestSkipWorkItem'](item);
      expect(setWorkItemStatus).not.toHaveBeenCalled();
      page['onConfirmAccepted']({
        kind: 'skipWorkItem',
        workItem: item,
        reason: 'Room inaccessible',
      });
      expect(setWorkItemStatus).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        workItemId: item.id,
        status: 'skipped',
        skipReason: 'Room inaccessible',
      });
      page['requestDeleteWorkItem'](item);
      page['onConfirmAccepted']({ kind: 'deleteWorkItem', workItem: item });
      expect(deleteWorkItems).toHaveBeenCalledWith({
        interventionId: 'intervention-1',
        workItems: [item],
      });
      expect(page['pendingConfirm']()).toBeNull();
    });

    it('cancels abandonment and preserves list filters when navigating away', async () => {
      orderedIds.set(['previous', 'intervention-1']);
      fixture = await createPage();
      const page = fixture.componentInstance;
      page['requestAbandon']();
      page['onAbandonDismissed']();
      expect(page['pendingAbandon']()).toBeNull();
      expect(transition).not.toHaveBeenCalled();
      page['navigatePrev']();
      expect(navigate).toHaveBeenCalledWith(
        ['/organizations', 'org-1', 'interventions', 'previous'],
        { queryParamsHandling: 'preserve' },
      );
      page['navigateToList']();
      expect(navigate).toHaveBeenLastCalledWith(['/organizations', 'org-1', 'interventions'], {
        queryParams: { tab: null },
        queryParamsHandling: 'merge',
      });
    });
  });

  describe('attachment preparation and removal', () => {
    it('uploads prepared files and reports each failed preparation', async () => {
      const good = new File(['photo'], 'ready.jpg', { type: 'image/jpeg' });
      const bad = new File(['invalid'], 'bad.jpg');
      vi.mocked(TestBed.inject(InterventionPhotoCompressorService).prepareAll).mockResolvedValue({
        ready: [good],
        failed: [bad.name],
      });
      fixture = await createPage();
      fixture.componentInstance['uploadAttachments']([good, bad]);
      await fixture.whenStable();
      expect(uploadAttachment).toHaveBeenCalledExactlyOnceWith({
        interventionId: 'intervention-1',
        file: good,
        fileName: good.name,
      });
      expect(feedbackError).toHaveBeenCalledWith(expect.stringContaining(bad.name));
    });

    it('deletes server attachments with their revision and discards only confirmed local uploads', async () => {
      fixture = await createPage();
      const page = fixture.componentInstance;
      const store = fixture.debugElement.injector.get(InterventionWorkspaceStore);
      const uploaded = attachment({ revision: 8 });
      page['pendingAttachmentDelete'].set(uploaded);
      page['confirmAttachmentDelete'](uploaded);
      expect(store.removeAttachment).toHaveBeenCalledWith({
        attachmentId: uploaded.id,
        revision: 8,
      });
      expect(page['pendingAttachmentDelete']()).toBeNull();
      page['confirmQueuedAttachmentDelete']();
      expect(store.removeQueuedAttachment).not.toHaveBeenCalled();
      const queued: InterventionQueuedAttachment = {
        id: 'operation-1',
        clientId: 'client-1',
        interventionId: 'intervention-1',
        fileName: 'offline.jpg',
        mimeType: 'image/jpeg',
        size: 5,
        queuedAt: '2026-09-20T10:00:00Z',
      };
      page['pendingQueuedAttachmentDelete'].set(queued);
      page['confirmQueuedAttachmentDelete']();
      expect(store.removeQueuedAttachment).toHaveBeenCalledExactlyOnceWith(queued);
      expect(page['pendingQueuedAttachmentDelete']()).toBeNull();
    });
  });

  describe('team assignment', () => {
    it('loads team previews once, bounds membership previews and tolerates one unavailable team', async () => {
      const service = TestBed.inject(TeamService);
      const team = {
        '@id': '/api/organizations/org-1/teams/team-1',
        '@type': 'Team',
        id: 'team-1',
        organizationId: 'org-1',
        name: 'North',
        description: '',
        memberCount: 8,
        createdAt: '2026-09-20',
        updatedAt: '2026-09-20',
      };
      vi.mocked(service.list).mockReturnValue(
        of({
          '@id': '/api/organizations/org-1/teams',
          '@type': 'Collection',
          member: [team, { ...team, id: 'team-2' }],
          totalItems: 2,
        }),
      );
      vi.mocked(service.listMembers).mockImplementation((_org, id) =>
        id === 'team-2'
          ? throwError(() => new Error('Unavailable'))
          : of({
              '@id': '/api/organizations/org-1/teams/team-1/members',
              '@type': 'Collection',
              member: [
                'member-1',
                '/api/organizations/org-1/members/member-2',
                'member-3',
                'member-4',
              ].map((memberId) => ({
                '@id': `/api/organizations/org-1/teams/team-1/members/${memberId}`,
                '@type': 'TeamMember',
                memberId,
                addedAt: '2026-09-20',
              })),
              totalItems: 8,
            }),
      );
      fixture = await createPage();
      const page = fixture.componentInstance;
      const options = fixture.debugElement.injector.get(InterventionPlanningOptionsStore);
      expect(service.list).not.toHaveBeenCalled();
      page['openTeamAssign']();
      expect(service.list).toHaveBeenCalledExactlyOnceWith('org-1');
      expect(service.listMembers).toHaveBeenCalledWith('org-1', 'team-1', { itemsPerPage: 3 });
      expect(page['teamMemberIds']()).toEqual({
        'team-1': ['member-1', '/api/organizations/org-1/members/member-2', 'member-3'],
        'team-2': [],
      });
      expect(options.ensureSelected).toHaveBeenLastCalledWith('org-1', [
        '/api/organizations/org-1/members/member-1',
        '/api/organizations/org-1/members/member-2',
        '/api/organizations/org-1/members/member-3',
      ]);
      expect(page['teamsLoading']()).toBe(false);
      page['submitTeamAssign']('team-1');
      expect(
        fixture.debugElement.injector.get(InterventionWorkspaceStore).assignTeam,
      ).toHaveBeenCalledWith({ interventionId: 'intervention-1', input: { teamId: 'team-1' } });
      expect(page['teamAssignVisible']()).toBe(true);
      page['closeTeamAssign']();
      expect(page['teamAssignVisible']()).toBe(false);
      page['openTeamAssign']();
      expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('keeps failed team discovery retryable and caches a complete empty catalogue', async () => {
      const service = TestBed.inject(TeamService);
      vi.mocked(service.list).mockReturnValueOnce(throwError(() => new Error('Unavailable')));
      fixture = await createPage();
      const page = fixture.componentInstance;
      page['openTeamAssign']();
      expect(page['teamsLoading']()).toBe(false);
      expect(page['teamMemberIds']()).toEqual({});
      expect(feedbackError).toHaveBeenCalledWith(expect.stringContaining('teams'));
      page['openTeamAssign']();
      page['closeTeamAssign']();
      page['openTeamAssign']();
      expect(service.list).toHaveBeenCalledTimes(2);
      expect(service.listMembers).not.toHaveBeenCalled();
    });
  });

  describe('QR capture feedback', () => {
    it.each([
      ['unreadable', 'No QR code'],
      ['noMatch', 'No work item'],
    ] as const)('keeps %s scans recoverable beside the work list', async (kind, message) => {
      const scanner = TestBed.inject(InterventionFieldExecutionService);
      vi.mocked(scanner.scanToWorkItem).mockResolvedValue({ kind });
      fixture = await createPage();
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'value', { value: 'C:\\fakepath\\qr.jpg', writable: true });
      const file = new File(['capture'], 'qr.jpg');
      Object.defineProperty(input, 'files', { value: [file] });
      fixture.componentInstance['onScanFileSelected']({ target: input } as unknown as Event);
      await fixture.whenStable();
      expect(scanner.scanToWorkItem).toHaveBeenCalledWith(file, workItems());
      expect(input.value).toBe('');
      expect(fixture.componentInstance['scanProblem']()).toContain(message);
      expect(feedbackError).toHaveBeenCalledWith(expect.stringContaining(message));
    });

    it('ignores a late capture result after navigation to another intervention', async () => {
      let resolveCapture!: (result: InterventionScanResult) => void;
      const capture = new Promise<InterventionScanResult>((resolve) => {
        resolveCapture = resolve;
      });
      vi.mocked(TestBed.inject(InterventionFieldExecutionService).scanToWorkItem).mockReturnValue(
        capture,
      );
      fixture = await createPage();
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [new File(['qr'], 'qr.jpg')] });
      fixture.componentInstance['onScanFileSelected']({ target: input } as unknown as Event);
      fixture.componentRef.setInput('interventionId', 'intervention-2');
      resolveCapture({ kind: 'noMatch' });
      await fixture.whenStable();
      expect(fixture.componentInstance['scanProblem']()).toBeNull();
      expect(feedbackError).not.toHaveBeenCalled();
    });

    it('handles decoder rejection without discarding the manual work list', async () => {
      vi.mocked(TestBed.inject(InterventionFieldExecutionService).scanToWorkItem).mockRejectedValue(
        new Error('decoder failed'),
      );
      workItems.set([workItem()]);
      fixture = await createPage();
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [new File(['qr'], 'qr.jpg')] });
      fixture.componentInstance['onScanFileSelected']({ target: input } as unknown as Event);
      await fixture.whenStable();
      expect(fixture.componentInstance['scanProblem']()).toContain('No QR code');
      expect(workItems()).toHaveLength(1);
      expect(setWorkItemStatus).not.toHaveBeenCalled();
    });

    it('reveals a matched work item and hands keyboard focus back to the work list', async () => {
      const matched = workItem({
        targetSummary: {
          resource: '/api/facilities/north-riser',
          kind: 'facility',
          label: 'North riser',
        },
      });
      workItems.set([matched]);
      vi.mocked(TestBed.inject(InterventionFieldExecutionService).scanToWorkItem).mockResolvedValue(
        { kind: 'matched', item: matched },
      );
      fixture = await createPage();
      const page = fixture.componentInstance;
      page['setLinkedTab']('equipment');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [new File(['qr'], 'qr.jpg')] });

      page['onScanFileSelected']({ target: input } as unknown as Event);
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      expect(page['activeLinkedTab']()).toBe('overview');
      expect(page['scanProblem']()).toBeNull();
      expect(TestBed.inject(FeedbackService).success).toHaveBeenCalledWith(
        expect.stringContaining('North riser'),
      );
      expect(page['workItemTable']()?.['focusedItemId']()).toBe(matched.id);
    });
  });

  it('refuses publication when the fresh server response removes the capability', async () => {
    current.set(intervention({ status: 'submitted' }));
    fixture = await createPage();
    const denied = intervention({
      status: 'submitted',
      allowedActions: { ...actionsFor('submitted'), canPublish: false },
    });
    vi.mocked(TestBed.inject(InterventionService).get).mockReturnValue(of(denied));
    await fixture.componentInstance['confirmPublish']();
    expect(publish).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledWith('intervention-1');
    expect(fixture.componentInstance['offlineBlockReason']()).toContain(
      'Publication is unavailable',
    );
    expect(fixture.componentInstance['publicationPreparing']()).toBe(false);
  });

  it('blocks publication while local operations remain unsynchronized', async () => {
    current.set(intervention({ status: 'submitted' }));
    listOutbox.mockResolvedValue([
      {
        id: 'pending-offline-change',
        interventionId: 'intervention-1',
        type: 'comment.create',
        payload: { body: 'Saved offline comment' },
        createdAt: '2026-09-20T10:00:00Z',
        status: 'pending',
      },
    ]);
    fixture = await createPage();
    listOutbox.mockClear();

    await fixture.componentInstance['confirmPublish']();

    expect(listOutbox).toHaveBeenCalledWith('intervention-1');
    expect(publish).not.toHaveBeenCalled();
    expect(fixture.componentInstance['offlineBlockReason']()).toContain('local operations');
    expect(fixture.componentInstance['publicationPreparing']()).toBe(false);
  });

  it('does not publish an old intervention after the route changes during synchronization', async () => {
    current.set(intervention({ status: 'submitted' }));
    let finishSync!: () => void;
    const pendingSync = new Promise<void>((resolve) => {
      finishSync = resolve;
    });
    vi.mocked(TestBed.inject(InterventionSyncCoordinatorService).syncIntervention).mockReturnValue(
      pendingSync,
    );
    fixture = await createPage();
    listOutbox.mockClear();

    const publication = fixture.componentInstance['confirmPublish']();
    fixture.componentRef.setInput('interventionId', 'intervention-2');
    fixture.detectChanges();
    finishSync();
    await publication;

    expect(listOutbox).not.toHaveBeenCalledWith('intervention-1');
    expect(publish).not.toHaveBeenCalled();
    expect(fixture.componentInstance['publicationPreparing']()).toBe(false);
  });

  it('rechecks server blockers before publishing a previously ready intervention', async () => {
    current.set(intervention({ status: 'submitted' }));
    fixture = await createPage();
    vi.mocked(TestBed.inject(InterventionService).listIssues).mockReturnValue(
      of({
        '@id': '/api/interventions/intervention-1/issues',
        '@type': 'Collection',
        member: [
          {
            '@id': '/api/issues/new-blocker',
            '@type': 'InterventionIssue',
            severity: 'blocker',
            resource: '/api/facilities/facility-1',
            field: null,
            message: 'Fresh server blocker',
          } as InterventionIssueOutput,
        ],
        totalItems: 1,
      }),
    );

    await fixture.componentInstance['confirmPublish']();

    expect(publish).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledWith('intervention-1');
    expect(fixture.componentInstance['offlineBlockReason']()).toContain(
      'Publication is unavailable',
    );
  });

  it('refuses publication when the network drops during synchronization', async () => {
    current.set(intervention({ status: 'submitted' }));
    let finishSync!: () => void;
    const pendingSync = new Promise<void>((resolve) => {
      finishSync = resolve;
    });
    vi.mocked(TestBed.inject(InterventionSyncCoordinatorService).syncIntervention).mockReturnValue(
      pendingSync,
    );
    fixture = await createPage();

    const publication = fixture.componentInstance['confirmPublish']();
    online.set(false);
    finishSync();
    await publication;

    expect(publish).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledWith('intervention-1');
    expect(fixture.componentInstance['offlineBlockReason']()).toContain(
      'Publication is unavailable',
    );
    expect(fixture.componentInstance['publicationPreparing']()).toBe(false);
  });
});
