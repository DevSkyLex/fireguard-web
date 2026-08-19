import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
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
import { provideRouter, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
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
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionActivityOutput,
  InterventionAttachmentOutput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import {
  BrowserDownloadService,
  InterventionFieldExecutionService,
  InterventionPhotoCompressorService,
} from '@features/organization/features/interventions/services';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import { InterventionStore } from '@features/organization/features/interventions/state';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { InterventionLinkedResourcesStore } from '../../../../state/intervention-linked-resources';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import {
  InterventionWorkspaceStore,
  interventionWorkspaceStoreEvents,
} from '../../../../state/intervention-workspace';
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

const byPageActionsTestId = (id: string): HTMLElement | null =>
  renderPageActions().querySelector(`[data-testid="${id}"]`);

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
  let attachments: WritableSignal<readonly InterventionAttachmentOutput[]>;
  let changes: WritableSignal<readonly InterventionChangeOutput[]>;
  let saving: WritableSignal<boolean>;
  let updateDetailsCallState: WritableSignal<CallState>;
  let loadError: WritableSignal<string | null>;
  let loadFailed: WritableSignal<boolean>;
  let hasOlderActivities: WritableSignal<boolean>;
  let blockerCount: WritableSignal<number>;
  let orderedIds: WritableSignal<readonly string[]>;
  let online: WritableSignal<boolean>;

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
  let browserDownloadTrigger: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;
  let uploadAttachment: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement =>
    root().querySelector(`[data-testid="${id}"]`) as HTMLElement;

  beforeEach(() => {
    current = signal<InterventionOutput | null>(intervention());
    workItems = signal<readonly InterventionWorkItemOutput[]>([]);
    issues = signal<readonly InterventionIssueOutput[]>([]);
    activities = signal<readonly InterventionActivityOutput[]>([]);
    attachments = signal<readonly InterventionAttachmentOutput[]>([]);
    changes = signal<readonly InterventionChangeOutput[]>([]);
    saving = signal(false);
    updateDetailsCallState = signal<CallState>(idleCallState());
    loadError = signal<string | null>(null);
    loadFailed = signal(false);
    hasOlderActivities = signal(false);
    blockerCount = signal(0);
    orderedIds = signal<readonly string[]>([]);
    online = signal(true);
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
    publish = vi.fn().mockResolvedValue({ status: 'completed', error: null });
    openSubjectThread = vi.fn().mockReturnValue(of({ id: 'conversation-1' } as ConversationOutput));
    downloadAttachment = vi
      .fn()
      .mockReturnValue(of(new Blob(['file-bytes'], { type: 'application/pdf' })));
    browserDownloadTrigger = vi.fn();
    feedbackError = vi.fn();
    uploadAttachment = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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
        { provide: InterventionService, useValue: { downloadAttachment } },
        {
          provide: TeamService,
          useValue: { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) },
        },
        {
          provide: InterventionLabelService,
          useValue: { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) },
        },
        { provide: BrowserDownloadService, useValue: { trigger: browserDownloadTrigger } },
        { provide: InterventionPublicationService, useValue: { publish } },
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
              changes,
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
              assignTeamCallState: signal(idleCallState()),
              assignTeam: vi.fn(),
              addCommentCallState: signal(idleCallState()),
              attachments,
              attachmentsCallState: signal(idleCallState()),
              attachmentWriteCallState: signal(idleCallState()),
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

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
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
    it("should render the page's status, phase, action, blockers and review note as the band's own inputs", async () => {
      current.set(
        intervention({ status: 'changes_requested', reviewNote: 'Re-check the third floor.' }),
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
      fixture = await createPage();

      const band: HTMLElement = byTestId('intervention-detail-status-band');

      expect(band.textContent).toContain('Changes requested');
      expect(band.textContent).toContain('Field work');
      expect(byTestId('intervention-detail-command').textContent).toContain('Record field work');
      expect(byTestId('intervention-detail-blockers').textContent).toContain('1');
      expect(byTestId('intervention-detail-review-note').textContent).toContain(
        'Re-check the third floor.',
      );
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
      const originalScrollIntoView: (options?: boolean | ScrollIntoViewOptions) => void =
        HTMLElement.prototype.scrollIntoView;
      const scrollIntoView: ReturnType<
        typeof vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>
      > = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoView;

      try {
        byTestId('intervention-detail-blockers').click();
        await fixture.whenStable();

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
      expect(inBody('intervention-signature-dialog')).toBeNull();
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

      expect(byTestId('intervention-detail-blockers').textContent).toContain('1');
      expect(root().textContent).toContain('Missing sign-off.');
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

    it('should show the reviewer note as a strip inside the status band', async () => {
      current.set(
        intervention({ status: 'changes_requested', reviewNote: 'Re-check the third floor.' }),
      );
      fixture = await createPage();

      expect(byTestId('intervention-detail-review-note').textContent).toContain(
        'Re-check the third floor.',
      );
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

    it('should drop a target the member lacks the capability for, and hide the overflow trigger with nothing left to offer', async () => {
      permitted.delete('organization.interventions.plan');
      permitted.delete('organization.interventions.execute');
      current.set(intervention({ status: 'draft', allowedTransitions: ['planned'] }));
      fixture = await createPage();

      expect(byPageActionsTestId('intervention-detail-menu')).toBeNull();
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

      byPageActionsTestId('intervention-detail-menu')?.click();
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
    it('should show zero on the changes tab trigger and mount nothing until that tab activates', async () => {
      fixture = await createPage();

      expect(byTestId('intervention-tab-changes').textContent).toContain('0');
      expect(root().querySelector('[data-testid="intervention-change-list"]')).toBeNull();

      byTestId('intervention-tab-changes').click();
      await fixture.whenStable();

      const list: HTMLElement | null = root().querySelector(
        '[data-testid="intervention-change-list"]',
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
        '[data-testid="intervention-change-list"]',
      );

      expect(list?.querySelectorAll('[data-testid="intervention-change-row"]')).toHaveLength(2);
    });
  });

  describe('linked tabs', () => {
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

  describe('discussion', () => {
    it('should offer the Discussion trigger when messaging.read is granted', async () => {
      fixture = await createPage();

      expect(byPageActionsTestId('intervention-detail-discussion-trigger')).toBeTruthy();
    });

    it('should hide the Discussion trigger without messaging.read', async () => {
      permitted.delete('organization.messaging.read');
      fixture = await createPage();

      expect(byPageActionsTestId('intervention-detail-discussion-trigger')).toBeNull();
    });

    it('should open the discussion sheet and defer the thread load until then', async () => {
      fixture = await createPage();

      expect(openSubjectThread).not.toHaveBeenCalled();

      byPageActionsTestId('intervention-detail-discussion-trigger')?.dispatchEvent(
        new Event('click'),
      );
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
});
