import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  LOCALE_ID,
  signal,
  untracked,
  viewChild,
  type ElementRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideClock,
  lucideCloudUpload,
  lucideCompass,
  lucideCopy,
  lucideEllipsis,
  lucideMessagesSquare,
  lucideScanLine,
  lucideTrash2,
} from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import { isCallError, isCallPending, type CallState, type StoreError } from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { SubjectDiscussion } from '@features/organization/features/collaboration/ui/components';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionAttachmentOutput,
  InterventionCapabilities,
  InterventionCommandAction,
  InterventionConfirmAcceptedEvent,
  InterventionConfirmRequest,
  InterventionEditState,
  InterventionEditTarget,
  InterventionIssueOutput,
  InterventionIssueTarget,
  InterventionLinkedResourceTabId,
  InterventionOutput,
  InterventionPhase,
  InterventionReadinessItem,
  InterventionReadinessTarget,
  InterventionScanResult,
  InterventionStatus,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';
import {
  BrowserDownloadService,
  InterventionFieldExecutionService,
  InterventionPhotoCompressorService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import {
  InterventionStore,
  interventionStoreEvents,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import {
  InterventionLinkedResourcesStore,
  type InterventionLinkedResourcesStoreType,
} from '@features/organization/features/interventions/state/intervention-linked-resources';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionPublicationStore,
  interventionPublicationStoreEvents,
  type InterventionPublicationStoreType,
} from '@features/organization/features/interventions/state/intervention-publication';
import {
  InterventionWorkspaceStore,
  interventionWorkspaceStoreEvents,
  type InterventionWorkspaceStoreType,
} from '@features/organization/features/interventions/state/intervention-workspace';
import {
  buildInterventionDuplicatePrefill,
  buildInterventionMetaLine,
  createInterventionCapabilities,
  formatInterventionScheduleLabel,
  resolveInterventionResponsibleLabel,
  summarizeInterventionLabels,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationMemberAccessStore,
  type OrganizationMemberAccessStoreType,
} from '@features/organization/state';
import { EmptyState } from '@shared/empty-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTabsImports } from '@shared/ui/tabs';
import { InterventionAbout } from '../../components/intervention-about';
import { InterventionActivityThread } from '../../components/intervention-activity-thread';
import { InterventionAttachments } from '../../components/intervention-attachments';
import { InterventionChangeList } from '../../components/intervention-change-list';
import { InterventionGettingStarted } from '../../components/intervention-getting-started';
import { InterventionIssuesChecklist } from '../../components/intervention-issues-checklist';
import { InterventionPropertiesGrid } from '../../components/intervention-properties-grid';
import { InterventionPublicationSummary } from '../../components/intervention-publication-summary';
import { InterventionStatusBand } from '../../components/intervention-status-band';
import { InterventionSyncStatus } from '../../components/intervention-sync-status';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionConfirmDialog } from '../../dialogs/intervention-confirm-dialog';
import { InterventionSignatureDialog } from '../../dialogs/intervention-signature-dialog';
import { InterventionCommentForm } from '../../forms/intervention-comment-form';
import type { InterventionWorkItemFormValues } from '../../forms/intervention-work-item-form';
import { InterventionRequestChangesSheet } from '../../sheets/intervention-request-changes-sheet';
import { InterventionWorkItemSheet } from '../../sheets/intervention-work-item-sheet';
import { InterventionEquipmentTable } from '../../tables/intervention-equipment-table';
import { InterventionFacilitiesTable } from '../../tables/intervention-facilities-table';
import { InterventionInspectionsTable } from '../../tables/intervention-inspections-table';
import { InterventionWorkItemTable } from '../../tables/intervention-work-item-table';

/** The edit state before anything is open. */
const IDLE_EDIT_STATE: InterventionEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

/**
 * Component InterventionDetailPage
 * @class InterventionDetailPage
 *
 * @description
 * One intervention, from planning to publication, laid out as two columns: a
 * first track carrying the linked-resources rail (`hlm-tabs`, six triggers:
 * Overview, Changes, Attachments, then one lookup table each for Facilities /
 * Equipment / Inspections) beside the active tab's panel, and a second column
 * stacking the properties card above the desktop issues checklist,
 * tab-independent. At `lg` and up the second column is `sticky`; below `lg`
 * everything stacks and `linkedTabsOrientation` flips the rail horizontal
 * (`activeLinkedTab` drives which panel renders and lazy-loads a tab's data
 * on first activation).
 *
 * Four decisions a reviewer should know about.
 *
 * The phase's forward action (Plan / Submit / Publish) keeps its one address
 * on the page, `app-intervention-status-band`, a sticky band directly under
 * the title row that serves every viewport — retiring the earlier split
 * between a desktop-only action box and a mobile-only command bar, along
 * with both components. The band reads the same blocker count the desktop
 * issues checklist does: an earlier design tucked proposed changes and
 * blockers inside tab panels with no outside indicator, and `FEATURE.md`
 * records why that was retired — nothing that gates publication may be
 * visible only inside a section the operator has to scroll to.
 *
 * The store exposes one named call state per write concern, so nothing here
 * approximates attribution anymore: the in-place fields settle on
 * `updateDetailsCallState`, a work-item row locks through the store's
 * `pendingWorkItemIds`, a change row through `pendingChangeIds`, and each
 * overlay binds the call state of the write it actually performs.
 *
 * Deletion goes through `InterventionStore`, not the workspace store. Only the
 * list store removes the entity and repairs `orderedIds()`, which this page's
 * prev/next footer walks.
 *
 * "Duplicate", gated on {@link canPlan}, cannot open the list's own creation
 * sheet from here — it hands a prefill to `InterventionStore`'s
 * `pendingDuplicatePrefill` and navigates to the list with `?create=1`,
 * which reads and clears it once.
 *
 * @version 5.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-detail-page',
  imports: [
    NgIcon,
    NgTemplateOutlet,
    EmptyState,
    HlmButton,
    HlmSeparator,
    HlmSkeleton,
    ...HlmAlertDialogImports,
    ...HlmAlertImports,
    ...HlmDropdownMenuImports,
    ...HlmSheetImports,
    ...HlmSpinnerImports,
    InterventionAbout,
    InterventionActivityThread,
    InterventionAttachments,
    InterventionChangeList,
    InterventionConfirmDialog,
    InterventionSignatureDialog,
    InterventionStatusBand,
    InterventionSyncStatus,
    InterventionCommentForm,
    InterventionGettingStarted,
    InterventionIssuesChecklist,
    InterventionEquipmentTable,
    InterventionFacilitiesTable,
    InterventionInspectionsTable,
    InterventionPropertiesGrid,
    InterventionPublicationSummary,
    InterventionRequestChangesSheet,
    InterventionTag,
    InterventionWorkItemSheet,
    InterventionWorkItemTable,
    SubjectDiscussion,
    ...HlmTabsImports,
  ],
  providers: [
    InterventionWorkspaceStore,
    InterventionPlanningOptionsStore,
    InterventionLinkedResourcesStore,
    InterventionPublicationStore,
    provideIcons({
      lucideBan,
      lucideChevronLeft,
      lucideChevronRight,
      lucideCircleAlert,
      lucideClock,
      lucideCloudUpload,
      lucideCompass,
      lucideCopy,
      lucideEllipsis,
      lucideMessagesSquare,
      lucideScanLine,
      lucideTrash2,
    }),
  ],
  templateUrl: './intervention-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
})
export class InterventionDetailPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The active organization, from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property interventionId
   * @readonly
   * @description The intervention this page shows, from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly interventionId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Constructor
  /**
   * Property store
   * @readonly
   * @description The workspace, scoped to this route so it resets on navigation.
   * @access protected
   * @since 1.0.0
   * @type {InterventionWorkspaceStoreType}
   */
  protected readonly store: InterventionWorkspaceStoreType = inject<InterventionWorkspaceStoreType>(
    InterventionWorkspaceStore,
  );

  /**
   * Property planningOptions
   * @readonly
   * @description Sites, members and labels the properties grid edits against.
   * @access protected
   * @since 1.0.0
   * @type {InterventionPlanningOptionsStoreType}
   */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property linkedResources
   * @readonly
   *
   * @description
   * The "Linked" tabs' facilities/equipment/inspections, each loaded lazily
   * on its own tab's first activation rather than with the rest of the
   * workspace (`AGENTS.md`: secondary UI data behind a tab loads on user
   * action).
   *
   * @access protected
   * @since 4.5.0
   * @type {InterventionLinkedResourcesStoreType}
   */
  protected readonly linkedResources: InterventionLinkedResourcesStoreType =
    inject<InterventionLinkedResourcesStoreType>(InterventionLinkedResourcesStore);

  /**
   * Property publicationStore
   * @readonly
   *
   * @description
   * Wraps `InterventionPublicationService`'s request-and-poll round trip as a
   * `CallState`, scoped to this route so a stale attempt never carries over
   * to the next intervention.
   *
   * @access protected
   * @since 5.2.0
   * @type {InterventionPublicationStoreType}
   */
  protected readonly publicationStore: InterventionPublicationStoreType =
    inject<InterventionPublicationStoreType>(InterventionPublicationStore);

  /**
   * Property listStore
   * @readonly
   *
   * @description
   * The list store from the pathless parent route. Read for `orderedIds()`, and
   * written to on deletion — it is the only one that repairs the collection.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionStoreType}
   */
  private readonly listStore: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Permission checks for the four intervention capabilities. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** The signed-in member, to decide who may submit. */
  private readonly memberAccess: OrganizationMemberAccessStoreType =
    inject<OrganizationMemberAccessStoreType>(OrganizationMemberAccessStore);

  /** Whether the browser can reach the API, which gates publication. */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /** The outbox, read only for the unsynced indicator. */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

  /** The sync coordinator behind the header's sync chip. */
  protected readonly sync: InterventionSyncCoordinatorService = inject(
    InterventionSyncCoordinatorService,
  );

  /** Shrinks camera captures under the backend's 10 MiB attachment ceiling. */
  private readonly photoCompressor: InterventionPhotoCompressorService = inject(
    InterventionPhotoCompressorService,
  );

  /** Field toolbox: QR scan support and decoding. */
  private readonly fieldExecution: InterventionFieldExecutionService = inject(
    InterventionFieldExecutionService,
  );

  /**
   * Read directly rather than through {@link InterventionStore}: an
   * attachment download is a one-shot fetch-then-save with no state the
   * store needs to own, mirroring `InterventionsPage`'s direct
   * `InterventionService` call for its CSV export.
   */
  private readonly interventionService: InterventionService = inject(InterventionService);

  /** Saves a downloaded attachment to the visitor's device, browser-only. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Confirms a silent in-place commit so it is never invisible. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Listens for the list store's delete outcome. */
  private readonly events: Events = inject(Events);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to leave the page after a deletion and to open sibling
   * intervention routes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /** The application's language, used to phrase the meta line and the timeline. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** Document title channel — the title resolver only returned a neutral label until the workspace loads. */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /** Unregisters the tab-rail orientation media query listener on teardown. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** The deferred focus tick {@link revealFieldWork} schedules on a tab switch, cleared on teardown. */
  private pendingFocusTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy((): void => {
      if (this.pendingFocusTimeout !== null) clearTimeout(this.pendingFocusTimeout);
    });

    effect((): void => {
      const interventionId: string = this.interventionId();

      untracked((): void => {
        this.store.load(interventionId);
        this.store.loadActivities(interventionId);
        this.store.loadAttachments(interventionId);
      });
    });

    effect((): void => {
      const intervention: InterventionOutput | null = this.store.intervention();
      if (!intervention) return;

      untracked((): void => this.titleService.setTitle(intervention.name));
    });

    effect((): void => {
      const tab: InterventionLinkedResourceTabId = this.activeLinkedTab();
      const interventionId: string = this.interventionId();

      untracked((): void => {
        if (tab === 'facilities') this.linkedResources.ensureFacilitiesLoaded(interventionId);
        else if (tab === 'equipment') this.linkedResources.ensureEquipmentLoaded(interventionId);
        else if (tab === 'inspections')
          this.linkedResources.ensureInspectionsLoaded(interventionId);
      });
    });

    const desktopQuery: MediaQueryList | undefined = globalThis.matchMedia?.('(min-width: 1024px)');
    if (desktopQuery) {
      this.linkedTabsOrientation.set(desktopQuery.matches ? 'vertical' : 'horizontal');
      const onDesktopQueryChange = (event: MediaQueryListEvent): void =>
        this.linkedTabsOrientation.set(event.matches ? 'vertical' : 'horizontal');
      desktopQuery.addEventListener('change', onDesktopQueryChange);
      this.destroyRef.onDestroy(() =>
        desktopQuery.removeEventListener('change', onDesktopQueryChange),
      );
    }

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.planningOptions.loadWorkspaceOptions(organizationId);
      });
    });

    effect((): void => {
      const callState: CallState = this.store.updateDetailsCallState();

      untracked((): void => this.settleDetailsWrite(callState));
    });

    effect((): void => {
      if (this.attachmentUploading() || this.evidenceUploadingWorkItemIds().size === 0) return;

      untracked((): void => this.evidenceUploadingWorkItemIds.set(new Set<string>()));
    });

    effect((): void => {
      if (!this.signingSubmitPending() || !isCallError(this.store.attachmentWriteCallState()))
        return;

      untracked((): void => this.signingSubmitPending.set(false));
    });

    this.events
      .on(interventionStoreEvents.deleteSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => this.navigateToList());

    this.events
      .on(interventionPublicationStoreEvents.publishSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.store.reload(this.interventionId());
        this.publishConfirmOpen.set(false);
        this.feedback.success(
          $localize`:@@intervention.publication.succeeded:Published to the compliance record`,
        );
      });

    this.events
      .on(interventionWorkspaceStoreEvents.attachmentUploadSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }): void => {
        if (payload.attachment.kind !== 'signature' || !this.signingSubmitPending()) return;

        this.signingSubmitPending.set(false);
        this.store.transition({ interventionId: this.interventionId(), status: 'submitted' });
      });
  }
  //#endregion

  //#region Properties
  /** The field-work section, focused when the phase action sends the operator there. */
  private readonly workItemsSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('workItemsSection');

  /**
   * Property mobileIssuesSection
   * @readonly
   * @description The Overview tab's issues checklist wrapper, visible below `lg`, which {@link revealBlockers} targets there.
   * @access private
   * @since 5.0.0
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly mobileIssuesSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('mobileIssuesSection');

  /**
   * Property desktopIssuesSection
   * @readonly
   * @description The second column's issues checklist wrapper, visible at `lg` and up, which {@link revealBlockers} targets there.
   * @access private
   * @since 5.0.0
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly desktopIssuesSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('desktopIssuesSection');

  /**
   * Property editState
   * @readonly
   *
   * @description
   * Which in-place field is open, writing, or showing a rejection. The page
   * owns it so only one field is ever open across the About card and the
   * properties grid, and so a getting-started item can open an editor it
   * does not contain.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionEditState>}
   */
  protected readonly editState: WritableSignal<InterventionEditState> =
    signal<InterventionEditState>(IDLE_EDIT_STATE);

  /**
   * Property activeLinkedTab
   * @readonly
   *
   * @description
   * Which of the left-hand rail's six tabs is showing — `overview` by
   * default. Page-local UI state, not store-owned: the store only tracks
   * whether each of the three lookup tabs has ever loaded, not which one is
   * currently visible.
   *
   * @access protected
   * @since 4.5.0
   *
   * @type {WritableSignal<InterventionLinkedResourceTabId>}
   */
  protected readonly activeLinkedTab: WritableSignal<InterventionLinkedResourceTabId> =
    signal<InterventionLinkedResourceTabId>('overview');

  /**
   * Property linkedTabsOrientation
   * @readonly
   *
   * @description
   * Whether the rail lays out as a `lg`-and-up side column (`vertical`,
   * `hlm-tabs-list`) or a horizontally-scrollable row above the tab content
   * on narrower viewports (`horizontal`, `hlm-paginated-tabs-list` — brain's
   * own overflow pattern for a tab row that doesn't fit, in place of
   * wrapping) — driven by a `(min-width: 1024px)` media query so the same
   * `data-orientation` attribute that already switches `hlm-tabs`' internal
   * flex axis and keyboard handling drives the responsive collapse, rather
   * than fighting its variant-scoped classes with an unconditional override.
   * Starts `horizontal` (server/pre-hydration default) and upgrades once the
   * browser evaluates the query.
   *
   * @access protected
   * @since 4.5.0
   *
   * @type {WritableSignal<'horizontal' | 'vertical'>}
   */
  protected readonly linkedTabsOrientation: WritableSignal<'horizontal' | 'vertical'> = signal<
    'horizontal' | 'vertical'
  >('horizontal');

  /** What the text confirmation is asking about, if anything. */
  protected readonly pendingConfirm: WritableSignal<InterventionConfirmRequest | null> =
    signal<InterventionConfirmRequest | null>(null);

  /**
   * Property confirmBusy
   * @readonly
   *
   * @description
   * Whether the write the open confirmation would trigger is in flight — the
   * call state of that specific write, not the workspace's global `saving`,
   * so an unrelated pending write (a comment, an in-place edit) never
   * false-disables the dialog.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly confirmBusy: Signal<boolean> = computed<boolean>(() => {
    const request: InterventionConfirmRequest | null = this.pendingConfirm();
    if (request === null) return false;

    switch (request.kind) {
      case 'abandon':
        return isCallPending(this.store.transitionCallState());
      case 'deleteIntervention':
        return isCallPending(this.listStore.deleteCallState());
      case 'deleteWorkItem':
        return isCallPending(this.store.deleteWorkItemsCallState());
      default:
        return isCallPending(this.store.workItemWriteCallState());
    }
  });

  /** Whether the publish confirmation is open. */
  protected readonly publishConfirmOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property offlineBlockReason
   * @readonly
   *
   * @description
   * Set when the confirmation's accept is pressed while offline — checked
   * again at that moment since connectivity may have dropped after the
   * dialog opened. Takes priority over the store's own error in
   * {@link publicationError} because the store was never called.
   *
   * @access private
   * @since 5.2.0
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly offlineBlockReason: WritableSignal<string | null> = signal<string | null>(null);

  /** Whether a publication request and its poll are running. */
  protected readonly publishing: Signal<boolean> = this.publicationStore.publishing;

  /** Whether the current publish attempt has been pending long enough to say so. */
  protected readonly publicationLongRunning: Signal<boolean> = this.publicationStore.longRunning;

  /** Whether the last attempt ended because the poll gave up while the publication was still running server-side. */
  protected readonly publicationTimedOut: Signal<boolean> = this.publicationStore.timedOut;

  /**
   * Property publicationError
   * @readonly
   *
   * @description
   * What the last publish attempt failed with, shown inline in the publish
   * confirmation. `null` while {@link publicationTimedOut} is set — that case
   * gets its own recovery copy and a "Check again" action instead of the
   * generic destructive alert.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly publicationError: Signal<string | null> = computed<string | null>(() => {
    if (this.publicationTimedOut()) return null;

    return this.offlineBlockReason() ?? this.publicationStore.error();
  });

  /** Whether the request-changes panel is open. */
  protected readonly requestChangesVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the completion-signature dialog interposed on submit is open. */
  protected readonly signatureDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the signature just captured is uploading, which disables the dialog's Confirm. */
  protected readonly signatureUploading: Signal<boolean> = computed<boolean>(
    () => this.signingSubmitPending() && isCallPending(this.store.attachmentWriteCallState()),
  );

  /**
   * Property signingSubmitPending
   * @readonly
   *
   * @description
   * Set the moment a captured signature starts uploading and cleared once
   * that upload settles — success chains the submit transition, failure
   * aborts the chain, so a later, unrelated attachment upload never
   * mistakenly triggers a submit.
   *
   * @access private
   * @since 5.5.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly signingSubmitPending: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the add-work-item panel is open. */
  protected readonly workItemSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the live discussion sheet is open — also what defers `SubjectDiscussion`'s own load. */
  protected readonly discussionSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canDiscuss
   * @readonly
   *
   * @description
   * Whether the Discussion button and sheet render at all. Gated on
   * `organization.messaging.read` — reading this page already implies
   * `interventions.read`, so nothing else needs checking. Collaboration's
   * `SubjectDiscussion` still gates its own composer on `messaging.write`
   * separately, the same way every other messaging surface does.
   *
   * @access protected
   * @since 6.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDiscuss: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MESSAGING_READ),
  );

  /** Whether the browser can reach the API. */
  protected readonly online: Signal<boolean> = this.connectivity.online;

  /** Whether the offline outbox has changes waiting to sync. */
  protected readonly hasUnsyncedChanges: Signal<boolean> = this.offline.hasUnsyncedChanges;

  /**
   * Property caps
   * @readonly
   *
   * @description
   * The derived capability surface — phase, permission gates, the mutability
   * matrix and the status-menu targets — built injector-free from the page's
   * own signals by `createInterventionCapabilities`. The protected aliases
   * below keep the template contract unchanged.
   *
   * @access private
   * @since 5.1.0
   *
   * @type {InterventionCapabilities}
   */
  private readonly caps: InterventionCapabilities = createInterventionCapabilities({
    intervention: this.store.intervention,
    organizationId: this.organizationId,
    memberId: computed<string | undefined>(() => this.memberAccess.profile()?.id),
    hasPermission: (permission) => this.permissions.hasPermission(permission),
    scanSupported: () => this.fieldExecution.scanSupported(),
  });

  /** Where the intervention sits in its lifecycle, derived from its status. */
  protected readonly phase: Signal<InterventionPhase> = this.caps.phase;

  /**
   * Property currentMemberIri
   * @readonly
   *
   * @description
   * The signed-in member's IRI in this organization, `null` until the profile
   * resolves — the same identity {@link canSubmit} reads, and the shape a work
   * item's own `assignee` carries, so the field-work table can match it
   * directly for its "Mine first" grouping.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly currentMemberIri: Signal<string | null> = computed<string | null>(() => {
    const memberId: string | undefined = this.memberAccess.profile()?.id;

    return memberId === undefined
      ? null
      : `/api/organizations/${this.organizationId()}/members/${memberId}`;
  });

  /**
   * Property commandTransitionTarget
   * @readonly
   *
   * @description
   * The status {@link invokeCommandAction} dispatches for the current phase, or
   * `null` in `review`, where the forward step is a publication rather than a
   * status update. Both the status band and the status menu read this one
   * signal, which keeps a forward move from having two addresses.
   *
   * @access private
   * @since 4.1.0
   *
   * @type {Signal<InterventionStatus | null>}
   */
  private readonly commandTransitionTarget: Signal<InterventionStatus | null> =
    this.caps.commandTransitionTarget;

  /** Whether the member may plan. */
  protected readonly canPlan: Signal<boolean> = this.caps.canPlan;

  /** Whether the member may record field work. */
  protected readonly canExecute: Signal<boolean> = this.caps.canExecute;

  /** Whether the member may review. */
  protected readonly canReview: Signal<boolean> = this.caps.canReview;

  /** Whether the member may publish. */
  protected readonly canPublish: Signal<boolean> = this.caps.canPublish;

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the signed-in member is the responsible agent. The backend lets
   * only that person submit, so the gate is identity, not permission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = this.caps.canSubmit;

  /** Whether dates, priority and participants accept a write, per the replanning matrix. */
  protected readonly canEditSchedule: Signal<boolean> = this.caps.canEditSchedule;

  /** Whether the site accepts a write — draft only, as the backend enforces. */
  protected readonly canEditSite: Signal<boolean> = this.caps.canEditSite;

  /** Whether the responsible accepts a handover — draft and planned only. */
  protected readonly canEditResponsible: Signal<boolean> = this.caps.canEditResponsible;

  /** Whether description and labels accept a write, which holds until a terminal status. */
  protected readonly canEditDetails: Signal<boolean> = this.caps.canEditDetails;

  /** Whether the scope may still grow. */
  protected readonly canAddWorkItem: Signal<boolean> = this.caps.canAddWorkItem;

  /** Whether an item may be skipped with a reason. */
  protected readonly canSkipWorkItem: Signal<boolean> = this.caps.canSkipWorkItem;

  /** Whether the intervention may be abandoned from its current status. */
  protected readonly canAbandon: Signal<boolean> = this.caps.canAbandon;

  /** Whether the intervention may be deleted outright rather than abandoned. */
  protected readonly canDeleteIntervention: Signal<boolean> = this.caps.canDeleteIntervention;

  /**
   * Property transitionTargets
   * @readonly
   *
   * @description
   * The statuses this menu offers — the moves the status band does **not**
   * own: starting or reopening field work, and sending an intervention back
   * for changes. In practice that leaves `in_progress` and `changes_requested`.
   *
   * Four exclusions, each for its own reason:
   *
   * - {@link commandTransitionTarget}, because the phase's forward move belongs
   *   to the band and its readiness gate. Offering it here too made that
   *   gate advisory: an agent could submit from this menu with work items still
   *   open, which the band deliberately refuses.
   * - `abandoned`, because it is destructive and has its own confirmed action.
   * - anything the member lacks the capability for.
   * - withdrawing a submission (`submitted` → `in_progress`) when the member is
   *   not the responsible — the backend reserves it to that identity and would
   *   answer 403 ({@link canSubmit} is the same identity gate).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionStatus[]>}
   */
  protected readonly transitionTargets: Signal<readonly InterventionStatus[]> =
    this.caps.transitionTargets;

  /**
   * Property canRejectChange
   * @readonly
   *
   * @description
   * Whether the signed-in member may reject a proposed change, mirroring the
   * backend's permission mapping: under review (`submitted`) the write requires
   * `.review` — a pure reviewer CAN reject during review — while during
   * execution (`in_progress`, `changes_requested`) it requires `.execute`. Like
   * {@link canExecute}, the responsible/participant membership guard is not
   * approximated here; a 403 surfaces through the `rejectChangeFailed` toast.
   *
   * @access protected
   * @since 4.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRejectChange: Signal<boolean> = this.caps.canRejectChange;

  /**
   * Property canManageAttachments
   * @readonly
   *
   * @description
   * Whether the attachments section offers upload and delete, mirroring the
   * backend's `InterventionResourceManager::mutationPermission`: 409 in
   * `submitted`/`published`/`abandoned`, `.plan` while drafting, `.execute`
   * afterwards. Like {@link canExecute}, the responsible/participant
   * membership guard is not approximated — a 403 surfaces inline.
   *
   * @access protected
   * @since 4.4.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageAttachments: Signal<boolean> = this.caps.canManageAttachments;

  /** Whether an attachment upload is in flight. */
  protected readonly attachmentUploading: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.attachmentWriteCallState()),
  );

  /**
   * Property pendingDownloadIds
   * @readonly
   *
   * @description
   * Ids of the attachments whose download is currently in flight — a
   * page-local set, since a download is a one-shot fetch with no state the
   * store needs to own, mirroring `pendingAttachmentIds`' per-row lock for
   * deletes.
   *
   * @access protected
   * @since 4.7.0
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly pendingDownloadIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /**
   * Property evidenceUploadingWorkItemIds
   * @readonly
   *
   * @description
   * Ids of the work items whose evidence intake (compression + store upload)
   * is currently in flight, so the table can lock and spin only the rows an
   * operator actually started. Cleared once {@link attachmentUploading}
   * settles back to idle.
   *
   * @access protected
   * @since 5.4.0
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly evidenceUploadingWorkItemIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /**
   * Property evidenceTargetWorkItemId
   * @readonly
   *
   * @description
   * The work item awaiting a file pick from the hidden evidence input,
   * cleared once the pick resolves (chosen or cancelled).
   *
   * @access private
   * @since 5.4.0
   * @type {WritableSignal<string | null>}
   */
  private readonly evidenceTargetWorkItemId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Property evidenceInput
   * @readonly
   * @description The hidden file input {@link onEvidenceRequested} opens for the targeted row.
   * @access private
   * @since 5.4.0
   * @type {Signal<ElementRef<HTMLInputElement> | undefined>}
   */
  private readonly evidenceInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('evidenceInput');

  /** Whether the device can decode a QR from a camera capture, shown in the execute phase only. */
  protected readonly canScanWorkItem: Signal<boolean> = this.caps.canScanWorkItem;

  /** Whether the comment composer's own write is in flight. */
  protected readonly commentPending: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.addCommentCallState()),
  );

  /** The comment composer's own write error, if any. */
  protected readonly commentError: Signal<StoreError | null> = computed<StoreError | null>(
    () => this.store.addCommentCallState().error,
  );

  /** Whether the add-work-item sheet's own write is in flight. */
  protected readonly workItemCreatePending: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.createWorkItemCallState()),
  );

  /** The add-work-item sheet's own write error, if any. */
  protected readonly workItemCreateError: Signal<StoreError | null> = computed<StoreError | null>(
    () => this.store.createWorkItemCallState().error,
  );

  /** Whether the request-changes sheet's own transition is in flight. */
  protected readonly requestChangesPending: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.transitionCallState()),
  );

  /** The request-changes sheet's own transition error, if any. */
  protected readonly requestChangesError: Signal<StoreError | null> = computed<StoreError | null>(
    () => this.store.transitionCallState().error,
  );

  /** The blocking compliance issues, which stop publication. */
  protected readonly blockerIssues: Signal<readonly InterventionIssueOutput[]> = computed<
    readonly InterventionIssueOutput[]
  >(() => this.store.issues().filter((issue) => issue.severity === 'blocker'));

  /** How many proposed changes publication would apply. */
  protected readonly pendingChangesCount: Signal<number> = computed<number>(
    () => this.store.changes().filter((change) => change.status === 'proposed').length,
  );

  /** How many work items are still open. */
  protected readonly remainingWorkItems: Signal<number> = computed<number>(
    () =>
      this.store
        .workItems()
        .filter((item) => item.status !== 'completed' && item.status !== 'skipped').length,
  );

  /** Whether the activity timeline's first fetch is in flight. */
  protected readonly activitiesLoading: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.activityCallState()),
  );

  /**
   * Property activitiesError
   * @readonly
   *
   * @description
   * Why the timeline could not be read, or `null`. Kept separate from
   * {@link pageError} because it concerns one section and belongs inside it.
   *
   * @access protected
   * @since 4.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly activitiesError: Signal<string | null> = computed<string | null>(
    () => this.store.activityCallState().error?.message ?? null,
  );

  /** Whether everything is in place for publication. */
  protected readonly readyToPublish: Signal<boolean> = computed<boolean>(
    () => this.store.intervention()?.status === 'submitted' && this.store.blockerCount() === 0,
  );

  /** The responsible agent's display name, resolved from its IRI, for the details chip row. */
  protected readonly responsibleLabel: Signal<string | null> = computed<string | null>(() =>
    resolveInterventionResponsibleLabel(this.store.intervention(), this.planningOptions.members()),
  );

  /** The planned window as a short date range, for the details chip row. */
  protected readonly scheduleLabel: Signal<string | null> = computed<string | null>(() =>
    formatInterventionScheduleLabel(this.store.intervention(), this.locale),
  );

  /** The intervention's labels, joined for the details chip row. */
  protected readonly labelsSummary: Signal<string | null> = computed<string | null>(() =>
    summarizeInterventionLabels(this.store.intervention()),
  );

  /**
   * Property metaLine
   * @readonly
   *
   * @description
   * Who acted last and when, plus the revision — the last entry of the loaded
   * timeline, falling back to `updatedAt` while it is still loading or empty.
   *
   * Taking the *last* entry is only correct because the store loads the
   * timeline's newest page first (the API sorts ascending). Reading page 1
   * instead, as it once did, made this line report the oldest event on the
   * record as the latest thing that happened.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly metaLine: Signal<string> = computed<string>(() =>
    buildInterventionMetaLine(
      this.store.intervention(),
      this.store.activities(),
      this.planningOptions.members(),
      this.locale,
    ),
  );

  /**
   * Property readinessItems
   * @readonly
   *
   * @description
   * The prerequisites for planning, each pointing at the editor that closes
   * it — `prepare` phase only, and empty once an intervention has left it (an
   * abandoned intervention falls back to `prepare`, and offering to plan
   * something that left the workflow reads as a bug).
   *
   * `== null` rather than `=== null`: API Platform omits null fields, so an
   * unset site arrives as `undefined`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionReadinessItem[]>}
   */
  protected readonly readinessItems: Signal<readonly InterventionReadinessItem[]> = computed<
    readonly InterventionReadinessItem[]
  >(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention || intervention.status === 'abandoned' || this.phase() !== 'prepare')
      return [];

    return [
      {
        id: 'site',
        label: $localize`:@@intervention.checklist.site:Choose a site`,
        done: intervention.site != null,
        target: 'site',
      },
      {
        id: 'responsible',
        label: $localize`:@@intervention.checklist.responsible:Assign a responsible agent`,
        done: intervention.responsible != null,
        target: 'responsible',
      },
      {
        id: 'schedule',
        label: $localize`:@@intervention.checklist.schedule:Set a due date`,
        done: intervention.dueAt != null,
        target: 'schedule',
      },
      {
        id: 'workItems',
        label: $localize`:@@intervention.checklist.scope:Prepare the field work`,
        done: this.store.workItems().length > 0,
        target: 'workItems',
      },
    ];
  });

  /**
   * Property commandAction
   * @readonly
   *
   * @description
   * The single forward action for the current phase, or `null` when the member
   * has nothing to do here. Rendered exactly once, in
   * `app-intervention-status-band`, whatever the phase.
   *
   * In `execute` it is a living action: while work remains it sends the
   * operator to the checklist rather than offering a submit they cannot use,
   * and it only becomes the submit gate once everything is resolved.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionCommandAction | null>}
   */
  protected readonly commandAction: Signal<InterventionCommandAction | null> =
    computed<InterventionCommandAction | null>(() => {
      const intervention: InterventionOutput | null = this.store.intervention();
      if (!intervention) return null;

      if (this.phase() === 'prepare') {
        if (!this.canPlan() || intervention.status !== 'draft') return null;

        const ready: boolean =
          intervention.site != null &&
          intervention.responsible != null &&
          intervention.plannedStartAt != null &&
          intervention.dueAt != null;

        return {
          label: $localize`:@@intervention.cta.plan:Plan intervention`,
          icon: 'lucideCalendarCheck',
          disabled: !ready,
          disabledReason: null,
          loading: this.store.saving(),
        };
      }

      if (this.phase() === 'execute') {
        if (!this.canExecute()) return null;

        const total: number = this.store.workItems().length;
        const remaining: number = this.remainingWorkItems();

        if (total === 0)
          return {
            label: $localize`:@@intervention.cta.recordWork:Record field work`,
            icon: 'lucideListChecks',
            disabled: false,
            disabledReason: null,
            loading: this.store.saving(),
          };

        if (remaining > 0)
          return {
            label:
              remaining === 1
                ? $localize`:@@intervention.cta.completeOne:Complete 1 remaining item`
                : $localize`:@@intervention.cta.completeMany:Complete ${remaining}:count: remaining items`,
            icon: 'lucideListChecks',
            disabled: false,
            disabledReason: null,
            loading: this.store.saving(),
          };

        return {
          label: $localize`:@@intervention.cta.submit:Submit for review`,
          icon: 'lucideSend',
          disabled: !this.canSubmit(),
          disabledReason: this.canSubmit()
            ? null
            : $localize`:@@intervention.cta.reasonResponsible:Only the responsible agent can submit.`,
          loading: this.store.saving(),
        };
      }

      if (!this.canPublish() || intervention.status !== 'submitted') return null;

      const blockers: number = this.store.blockerCount();
      const ready: boolean = this.online() && blockers === 0;

      return {
        label: $localize`:@@intervention.cta.publish:Publish intervention`,
        icon: 'lucideCircleCheckBig',
        disabled: !ready,
        disabledReason: ready
          ? null
          : !this.online()
            ? $localize`:@@intervention.cta.reasonOffline:Connect to the network to publish.`
            : blockers === 1
              ? $localize`:@@intervention.cta.reasonBlockersOne:1 blocking issue to clear.`
              : $localize`:@@intervention.cta.reasonBlockersMany:${blockers}:count: blocking issues to clear.`,
        loading: this.store.saving() || this.publishing(),
      };
    });

  /**
   * Property pageError
   * @readonly
   *
   * @description
   * The store's last unattributed failure (load or write) — `null` while a
   * specific field is already showing its own rejection, so the same failure
   * is never surfaced twice.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly pageError: Signal<string | null> = computed<string | null>(() =>
    this.editState().failed === null ? this.store.error() : null,
  );

  /** The item the operator should pick up next, shown only during execution. */
  protected readonly nextWorkItemId: Signal<string | null> = computed<string | null>(() =>
    this.phase() === 'execute' ? (this.store.nextWorkItem()?.id ?? null) : null,
  );

  /** Where in the list this intervention sits, or -1 on a deep link. */
  private readonly currentIndex: Signal<number> = computed<number>(() =>
    this.listStore.orderedIds().indexOf(this.interventionId()),
  );

  /** Whether prev/next can be offered at all. */
  protected readonly showPrevNext: Signal<boolean> = computed<boolean>(
    () => this.currentIndex() >= 0 && this.listStore.orderedIds().length > 1,
  );

  /** The previous intervention's id, or null at the start or on a deep link. */
  protected readonly prevInterventionId: Signal<string | null> = computed<string | null>(() => {
    const index: number = this.currentIndex();

    return index < 0 ? null : (this.listStore.orderedIds()[index - 1] ?? null);
  });

  /** The next intervention's id, or null at the end or on a deep link. */
  protected readonly nextInterventionId: Signal<string | null> = computed<string | null>(() => {
    const index: number = this.currentIndex();

    return index < 0 ? null : (this.listStore.orderedIds()[index + 1] ?? null);
  });

  /** Whether the publish confirmation is showing. */
  protected readonly publishDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.publishConfirmOpen() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onEditTargetChanged
   *
   * @description
   * Opens or closes an in-place field, clearing any rejection left from the
   * previous attempt.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionEditTarget | null} target - The field to open, or null to close.
   *
   * @returns {void}
   */
  protected onEditTargetChanged(target: InterventionEditTarget | null): void {
    this.editState.set({ open: target, saving: null, failed: null, failure: null });
  }

  /**
   * Method onReadinessActivated
   *
   * @description
   * Sends the operator to the gap they picked: the work-items section for
   * missing scope, or straight to the in-place editor for a property. Every
   * section is always mounted and visible, so reaching either is a scroll,
   * never a tab switch.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionReadinessTarget} target - What the readiness item points at.
   *
   * @returns {void}
   */
  protected onReadinessActivated(target: InterventionReadinessTarget): void {
    if (target === 'workItems') {
      this.revealFieldWork();

      return;
    }

    this.onEditTargetChanged(target);
  }

  /**
   * Method onIssueActivated
   *
   * @description
   * Sends the operator to the address a publication issue resolved to: a
   * rail tab for a sibling-resource issue, the matching in-place editor for
   * an intervention-level field issue, or the field-work section for
   * everything else — never a bypass of the publish gate itself, only a
   * shortcut to the place that closes it.
   *
   * @access protected
   * @since 5.3.0
   *
   * @param {InterventionIssueTarget} target - Where the activated issue points.
   *
   * @returns {void}
   */
  protected onIssueActivated(target: InterventionIssueTarget): void {
    switch (target.kind) {
      case 'railTab':
        this.activeLinkedTab.set(target.tab);
        break;
      case 'edit':
        this.onEditTargetChanged(target.target);
        break;
      default:
        this.revealFieldWork();
    }
  }

  /**
   * Method onDetailsChanged
   *
   * @description
   * Sends an in-place patch. The field stays open until the write settles, so a
   * rejection lands on it rather than on the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {UpdateInterventionInput} patch - The single-property patch.
   *
   * @returns {void}
   */
  protected onDetailsChanged(patch: UpdateInterventionInput): void {
    const target: InterventionEditTarget | null = this.editState().open;
    if (target === null) return;

    this.editState.set({ open: target, saving: target, failed: null, failure: null });
    this.store.updateDetails({ interventionId: this.interventionId(), input: patch });
  }

  /**
   * Method onWorkItemStatusChanged
   * @description Records progress on one row and marks it as the pending write.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemStatusChange} change - The recorded change.
   * @returns {void}
   */
  protected onWorkItemStatusChanged(change: InterventionWorkItemStatusChange): void {
    this.store.setWorkItemStatus({ interventionId: this.interventionId(), ...change });
  }

  /**
   * Method rejectChange
   *
   * @description
   * Rejects one proposed change; the row locks itself through the store's
   * `pendingChangeIds` and a failure surfaces as the `rejectChangeFailed`
   * toast.
   *
   * @access protected
   * @since 4.2.0
   *
   * @param {string} changeId - The change to reject.
   *
   * @returns {void}
   */
  protected rejectChange(changeId: string): void {
    this.store.rejectChange({ interventionId: this.interventionId(), changeId });
  }

  /**
   * Method uploadAttachments
   *
   * @description
   * Compresses the picked files — camera captures are multi-megabyte and the
   * backend caps at 10 MiB — then uploads the ones that compressed
   * successfully and reports the ones that did not, one toast per failed
   * name.
   *
   * @access protected
   * @since 4.4.0
   *
   * @param {readonly File[]} files - The validated picked files.
   *
   * @returns {void}
   */
  protected uploadAttachments(files: readonly File[]): void {
    void this.photoCompressor
      .prepareAll(files)
      .then(({ ready, failed }: { ready: File[]; failed: string[] }): void => {
        for (const file of ready)
          this.store.uploadAttachment({
            interventionId: this.interventionId(),
            file,
            fileName: file.name,
          });

        for (const fileName of failed)
          this.feedback.error(
            $localize`:@@intervention.attachments.prepareFailed:${fileName}:fileName: could not be prepared for upload.`,
          );
      });
  }

  /**
   * Method onEvidenceRequested
   *
   * @description
   * Targets one work item for the next pick and opens the hidden evidence
   * input for it.
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {InterventionWorkItemOutput} item - The row asking for evidence.
   *
   * @returns {void}
   */
  protected onEvidenceRequested(item: InterventionWorkItemOutput): void {
    this.evidenceTargetWorkItemId.set(item.id);
    this.evidenceInput()?.nativeElement.click();
  }

  /**
   * Method onEvidenceFileSelected
   *
   * @description
   * Compresses the picked files and uploads the ones that compressed
   * successfully as evidence scoped to the targeted work item, reusing
   * {@link uploadAttachments}' intake path with a `workItemId`. The row locks
   * for the duration through {@link evidenceUploadingWorkItemIds}.
   *
   * @access protected
   * @since 5.4.0
   *
   * @param {Event} event - The evidence input's change event.
   *
   * @returns {void}
   */
  protected onEvidenceFileSelected(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const files: readonly File[] = Array.from(inputElement.files ?? []);
    inputElement.value = ''; // Re-picking the same file fires no change event otherwise.
    const workItemId: string | null = this.evidenceTargetWorkItemId();
    this.evidenceTargetWorkItemId.set(null);
    if (files.length === 0 || !workItemId) return;

    this.evidenceUploadingWorkItemIds.update((ids: ReadonlySet<string>): ReadonlySet<string> =>
      new Set(ids).add(workItemId),
    );

    void this.photoCompressor
      .prepareAll(files)
      .then(({ ready, failed }: { ready: File[]; failed: string[] }): void => {
        for (const file of ready)
          this.store.uploadAttachment({
            interventionId: this.interventionId(),
            file,
            fileName: file.name,
            workItemId,
          });

        for (const fileName of failed)
          this.feedback.error(
            $localize`:@@intervention.attachments.prepareFailed:${fileName}:fileName: could not be prepared for upload.`,
          );
      });
  }

  /**
   * Method removeAttachment
   *
   * @description
   * Deletes one attachment the component already confirmed; the row locks
   * itself through the store's `pendingAttachmentIds`.
   *
   * @access protected
   * @since 4.4.0
   *
   * @param {InterventionAttachmentOutput} attachment - The confirmed target.
   *
   * @returns {void}
   */
  protected removeAttachment(attachment: InterventionAttachmentOutput): void {
    this.store.removeAttachment({ attachmentId: attachment.id, revision: attachment.revision });
  }

  /**
   * Method downloadAttachment
   *
   * @description
   * Fetches one attachment's binary content and saves it to the visitor's
   * device, locking the row on its own fetch through
   * {@link pendingDownloadIds} rather than the store — a download changes
   * no persisted state.
   *
   * @access protected
   * @since 4.7.0
   *
   * @param {InterventionAttachmentOutput} attachment - The row's attachment.
   *
   * @returns {void}
   */
  protected downloadAttachment(attachment: InterventionAttachmentOutput): void {
    this.pendingDownloadIds.update((ids: ReadonlySet<string>): ReadonlySet<string> =>
      new Set(ids).add(attachment.id),
    );

    this.interventionService
      .downloadAttachment(attachment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.pendingDownloadIds.update((ids: ReadonlySet<string>): ReadonlySet<string> => {
            const next: Set<string> = new Set(ids);
            next.delete(attachment.id);
            return next;
          });
          this.browserDownload.trigger(blob, attachment.fileName);
        },
        error: (): void => {
          this.pendingDownloadIds.update((ids: ReadonlySet<string>): ReadonlySet<string> => {
            const next: Set<string> = new Set(ids);
            next.delete(attachment.id);
            return next;
          });
          this.feedback.error(
            $localize`:@@intervention.attachments.downloadFailed:Couldn't download ${attachment.fileName}:fileName:.`,
          );
        },
      });
  }

  /**
   * Method onScanFileSelected
   *
   * @description
   * Decodes a captured QR against the intervention's work items and reveals
   * the match — scroll plus focus, the same landing `revealFieldWork` gives
   * the phase actions. No match, or an undecodable capture, becomes a toast
   * rather than a dead click.
   *
   * @access protected
   * @since 4.4.0
   *
   * @param {Event} event - The capture input's change event.
   *
   * @returns {void}
   */
  protected onScanFileSelected(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = inputElement.files?.[0] ?? undefined;
    inputElement.value = ''; // Re-picking the same file fires no change event otherwise.
    if (!file) return;

    void this.fieldExecution
      .scanToWorkItem(file, this.store.workItems())
      .then((result: InterventionScanResult): void => {
        if (result.kind === 'unreadable') {
          this.feedback.error(
            $localize`:@@intervention.scan.unreadable:No QR code could be read from this capture.`,
          );

          return;
        }

        if (result.kind === 'noMatch') {
          this.feedback.error(
            $localize`:@@intervention.scan.noMatch:No work item of this intervention matches the scanned code.`,
          );

          return;
        }

        this.focusFieldWorkPanel();
        this.feedback.success(
          $localize`:@@intervention.scan.matched:Found: ${result.item.target ?? result.item.id}:target:`,
        );
      });
  }

  /**
   * Method invokeCommandAction
   *
   * @description
   * Runs the phase's forward action. In `review` this only opens the
   * confirmation — publication is never invoked directly. In `execute`, once
   * the field work is actually done, submitting an intervention that carries
   * no completion signature yet opens {@link signatureDialogVisible} instead
   * of transitioning outright — {@link onSignatureCaptured} and
   * {@link onSignatureDismissed} both eventually call this transition
   * themselves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected invokeCommandAction(): void {
    const target: InterventionStatus | null = this.commandTransitionTarget();

    if (target === null) {
      this.offlineBlockReason.set(null);
      this.publicationStore.reset();
      this.publishConfirmOpen.set(true);

      return;
    }

    if (
      this.phase() === 'execute' &&
      (this.store.workItems().length === 0 || this.remainingWorkItems() > 0)
    ) {
      this.revealFieldWork();

      return;
    }

    if (target === 'submitted' && this.store.intervention()?.hasSignature === false) {
      this.signatureDialogVisible.set(true);

      return;
    }

    this.store.transition({ interventionId: this.interventionId(), status: target });
  }

  /**
   * Method onSignatureCaptured
   *
   * @description
   * Closes the signature dialog and uploads the captured drawing as the
   * intervention's completion signature. The submit transition is not
   * dispatched here — it chains off the store's `attachmentUploadSucceeded`
   * event once the upload has actually landed, so a failed upload never
   * silently submits an unsigned intervention.
   *
   * @access protected
   * @since 5.5.0
   *
   * @param {Blob} signature - The captured signature, PNG-encoded.
   *
   * @returns {void}
   */
  protected onSignatureCaptured(signature: Blob): void {
    this.signingSubmitPending.set(true);
    this.signatureDialogVisible.set(false);
    this.store.uploadAttachment({
      interventionId: this.interventionId(),
      file: signature,
      fileName: 'signature.png',
      kind: 'signature',
    });
  }

  /**
   * Method onSignatureDismissed
   *
   * @description
   * The operator declined the nudge — Escape, the backdrop, or Skip — so the
   * transition proceeds unsigned; the backend does not require a signature to
   * submit. A no-op while {@link signingSubmitPending} is set: closing the
   * dialog programmatically from {@link onSignatureCaptured} also flows
   * through the underlying `hlm-dialog`'s own close notification, and that
   * closure already has its own chain running.
   *
   * @access protected
   * @since 5.5.0
   *
   * @returns {void}
   */
  protected onSignatureDismissed(): void {
    this.signatureDialogVisible.set(false);
    if (this.signingSubmitPending()) return;

    this.store.transition({ interventionId: this.interventionId(), status: 'submitted' });
  }

  /**
   * Method onTransitionSelect
   *
   * @description
   * Moves the intervention. `changes_requested` needs a reviewer note, so it
   * opens the panel that collects one instead of transitioning outright.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionStatus} status - The chosen status.
   *
   * @returns {void}
   */
  protected onTransitionSelect(status: InterventionStatus): void {
    if (status === 'changes_requested') {
      this.requestChangesVisible.set(true);

      return;
    }

    this.store.transition({ interventionId: this.interventionId(), status });
  }

  /**
   * Method requestChanges
   * @description Sends the intervention back with the reviewer's note.
   * @access protected
   * @since 1.0.0
   * @param {{ note: string }} values - The validated note.
   * @returns {void}
   */
  protected requestChanges(values: { readonly note: string }): void {
    this.store.transition({
      interventionId: this.interventionId(),
      status: 'changes_requested',
      reviewNote: values.note,
    });
    this.requestChangesVisible.set(false);
  }

  /**
   * Method createWorkItem
   *
   * @description
   * Adds a task to the prepared scope. The optional fields are sent as `null`
   * rather than as empty strings, matching what the API stores for "not
   * decided yet".
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemFormValues} values - The validated item.
   *
   * @returns {void}
   */
  protected createWorkItem(values: InterventionWorkItemFormValues): void {
    this.store.createWorkItem({
      interventionId: this.interventionId(),
      input: {
        intervention: `/api/interventions/${this.interventionId()}`,
        action: values.action,
        target: values.target === '' ? undefined : values.target,
        assignee: values.assignee === '' ? undefined : values.assignee,
        source: 'planned',
        required: true,
      },
    });
    this.workItemSheetVisible.set(false);
  }

  /**
   * Method postComment
   * @description Posts a comment onto the activity thread from the composer.
   * @access protected
   * @since 3.0.0
   * @param {string} body - The validated, trimmed comment body.
   * @returns {void}
   */
  protected postComment(body: string): void {
    this.store.addComment({ interventionId: this.interventionId(), body });
  }

  /** Asks to abandon. */
  protected requestAbandon(): void {
    this.pendingConfirm.set({ kind: 'abandon' });
  }

  /**
   * Method duplicateIntervention
   * @method duplicateIntervention
   *
   * @description
   * Hands a prefill built from the current intervention to the list store
   * and navigates there with `?create=1` — the cross-route counterpart of
   * the list's own row-level "Duplicate", since this page cannot open the
   * list's creation sheet directly.
   *
   * @access protected
   * @since 6.1.0
   *
   * @returns {void}
   */
  protected duplicateIntervention(): void {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (intervention === null) return;

    this.listStore.setPendingDuplicatePrefill(buildInterventionDuplicatePrefill(intervention));
    void this.router.navigate(['/organizations', this.organizationId(), 'interventions'], {
      queryParams: { create: '1' },
    });
  }

  /** Asks to delete the intervention. */
  protected requestDeleteIntervention(): void {
    this.pendingConfirm.set({ kind: 'deleteIntervention' });
  }

  /** Asks to remove a prepared work item. */
  protected requestDeleteWorkItem(workItem: InterventionWorkItemOutput): void {
    this.pendingConfirm.set({ kind: 'deleteWorkItem', workItem });
  }

  /** Asks to skip a work item, which needs a reason. */
  protected requestSkipWorkItem(workItem: InterventionWorkItemOutput): void {
    this.pendingConfirm.set({ kind: 'skipWorkItem', workItem });
  }

  /**
   * Method onConfirmAccepted
   *
   * @description
   * Runs whichever confirmation the dialog just accepted, then closes it.
   * Deletion goes through the list store: it is the only one that removes the
   * entity and repairs `orderedIds()`, which this page's prev/next footer
   * walks.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionConfirmAcceptedEvent} event - The confirmed request.
   *
   * @returns {void}
   */
  protected onConfirmAccepted(event: InterventionConfirmAcceptedEvent): void {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (intervention === null) return;

    switch (event.kind) {
      case 'abandon':
        this.store.transition({ interventionId: this.interventionId(), status: 'abandoned' });
        break;
      case 'deleteIntervention':
        this.listStore.delete({
          interventionId: this.interventionId(),
          revision: intervention.revision,
        });
        break;
      case 'deleteWorkItem':
        this.store.deleteWorkItems({
          interventionId: this.interventionId(),
          workItems: [event.workItem],
        });
        break;
      default:
        this.store.setWorkItemStatus({
          interventionId: this.interventionId(),
          workItemId: event.workItem.id,
          status: 'skipped',
          skipReason: event.reason,
        });
    }

    this.pendingConfirm.set(null);
  }

  /** Any dismissal drops the pending request. */
  protected onConfirmDismissed(): void {
    this.pendingConfirm.set(null);
  }

  /**
   * Method onPublishDialogStateChanged
   * @description Any dismissal closes the publish confirmation.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The dialog's new state.
   * @returns {void}
   */
  protected onPublishDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.publishConfirmOpen.set(false);
  }

  /**
   * Method confirmPublish
   *
   * @description
   * Runs the publication from the confirmation's accept — the only place that
   * calls {@link publicationStore}'s `publish`, which is what makes
   * "publication is confirm-gated" structural rather than a convention.
   * Connectivity is re-checked here since it may have dropped after the
   * dialog opened; the store is never even called in that case, and the
   * offline reason is shown inline instead. The confirmation otherwise stays
   * open on failure — the store's error surfaces inline and the operator can
   * retry without reopening it — and closes only once `publishSucceeded`
   * fires.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmPublish(): void {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (intervention === null) return;

    if (!this.online()) {
      this.offlineBlockReason.set(
        $localize`:@@intervention.cta.reasonOffline:Connect to the network to publish.`,
      );

      return;
    }

    this.offlineBlockReason.set(null);
    this.publicationStore.publish(intervention);
  }

  /**
   * Method recheckPublication
   * @description Asks the store to re-read the timed-out publication once, offered from the confirmation while {@link publicationTimedOut} is set.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected recheckPublication(): void {
    this.publicationStore.recheck();
  }

  /** Clears the load error and tries again. */
  protected retryLoad(): void {
    this.store.clearError();
    this.store.load(this.interventionId());
  }

  /** Walks the timeline one page further back. */
  protected loadOlderActivities(): void {
    this.store.loadOlderActivities(this.interventionId());
  }

  /** Reads the timeline again after a failed fetch. */
  protected reloadActivities(): void {
    this.store.loadActivities(this.interventionId());
  }

  /**
   * Method onLinkedTabActivated
   *
   * @description
   * Narrows `hlm-tabs`' plain-string `tabActivated` payload to
   * {@link InterventionLinkedResourceTabId} before writing
   * {@link activeLinkedTab}, which is what the constructor effect watches to
   * lazy-load a lookup tab's data on its first activation.
   *
   * @access protected
   * @since 4.5.0
   *
   * @param {string} tab - The `hlm-tabs` id that just activated.
   *
   * @returns {void}
   */
  protected onLinkedTabActivated(tab: string): void {
    if (
      tab === 'overview' ||
      tab === 'changes' ||
      tab === 'attachments' ||
      tab === 'facilities' ||
      tab === 'equipment' ||
      tab === 'inspections'
    ) {
      this.activeLinkedTab.set(tab);
    }
  }

  /** Walks to the previous intervention in the list's order. */
  protected navigatePrev(): void {
    this.navigateToNeighbour(this.prevInterventionId());
  }

  /** Walks to the next intervention in the list's order. */
  protected navigateNext(): void {
    this.navigateToNeighbour(this.nextInterventionId());
  }

  /** Returns to the list. */
  protected navigateToList(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'interventions']);
  }

  /**
   * Method onDocumentKeydown
   *
   * @description
   * `j` and `k` walk the list without leaving the keyboard. Ignored while the
   * user is typing, while any overlay is open, and whenever a modifier is held —
   * that guard is also what keeps the in-place editors safe.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The document keydown.
   *
   * @returns {void}
   */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== 'j' && event.key !== 'k') return;
    if (this.pendingConfirm() !== null || this.publishConfirmOpen() || this.requestChangesVisible())
      return;
    if (this.signatureDialogVisible()) return;
    if (this.workItemSheetVisible()) return;
    if (this.editState().open !== null) return;

    const target: EventTarget | null = event.target;
    if (target instanceof HTMLElement) {
      const tag: string = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable)
        return;
    }

    if (event.key === 'j') this.navigateNext();
    else this.navigatePrev();
  }

  /**
   * Method settleDetailsWrite
   *
   * @description
   * Settles the open in-place field once its own write — and only its own:
   * the store's `updateDetailsCallState` — clears. The field keeps its draft
   * on failure and closes with a toast on success. Work-item and change rows
   * settle themselves through the store's pending-id sets.
   *
   * @access private
   * @since 4.2.0
   *
   * @param {CallState} callState - The details write's call state.
   *
   * @returns {void}
   */
  private settleDetailsWrite(callState: CallState): void {
    if (isCallPending(callState)) return;

    const state: InterventionEditState = this.editState();
    if (state.saving === null) return;

    const failure: string | null = callState.error?.message ?? null;
    if (failure === null) {
      this.editState.set(IDLE_EDIT_STATE);
      this.feedback.success($localize`:@@intervention.detail.fieldSaved:Change saved`);

      return;
    }

    this.editState.set({ open: state.saving, saving: null, failed: state.saving, failure });
  }

  /**
   * Method revealFieldWork
   *
   * @description
   * Sends the operator to the work-items section: opens the add-item sheet
   * when the scope is still empty, or scrolls to and focuses the section
   * otherwise. The section lives in the Overview tab, so this switches the
   * rail there first — the status band that calls this method sits outside
   * the tabs and may fire from any of the other five. A switch away from
   * Overview defers the scroll/focus one tick, since `[hidden]`
   * only clears once the tab's panel binding flushes; a plain scroll that
   * leaves focus on the trigger that requested it would strand a keyboard
   * user regardless (WCAG 2.4.3), which is why the section itself receives
   * focus either way.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private revealFieldWork(): void {
    const switchingTab: boolean = this.activeLinkedTab() !== 'overview';
    this.activeLinkedTab.set('overview');

    if (this.store.workItems().length === 0 && this.canAddWorkItem()) {
      this.workItemSheetVisible.set(true);

      return;
    }

    if (switchingTab) {
      if (this.pendingFocusTimeout !== null) clearTimeout(this.pendingFocusTimeout);
      this.pendingFocusTimeout = setTimeout((): void => this.focusFieldWorkPanel());
    } else this.focusFieldWorkPanel();
  }

  /**
   * Method revealBlockers
   *
   * @description
   * Sends the operator to the issues checklist, where the blocker list the
   * status band can only summarize actually lives: the Overview tab's inline
   * checklist below `lg`, the second column's own copy at `lg` and up. Switches
   * the rail to Overview first, deferred one tick when that actually changed
   * the active tab, mirroring {@link revealFieldWork}.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  protected revealBlockers(): void {
    const switchingTab: boolean = this.activeLinkedTab() !== 'overview';
    this.activeLinkedTab.set('overview');

    if (switchingTab) {
      if (this.pendingFocusTimeout !== null) clearTimeout(this.pendingFocusTimeout);
      this.pendingFocusTimeout = setTimeout((): void => this.focusIssuesChecklist());
    } else this.focusIssuesChecklist();
  }

  /** Scrolls to and focuses whichever issues checklist the current viewport shows. */
  private focusIssuesChecklist(): void {
    const section: HTMLElement | undefined =
      this.linkedTabsOrientation() === 'vertical'
        ? this.desktopIssuesSection()?.nativeElement
        : this.mobileIssuesSection()?.nativeElement;

    this.scrollToAndFocus(section);
  }

  /** Scrolls to and focuses the field-work section. */
  private focusFieldWorkPanel(): void {
    this.scrollToAndFocus(this.workItemsSection()?.nativeElement);
  }

  /**
   * Scrolls a section into view and moves focus into it, so a keyboard user is
   * not left behind on the trigger that sent them there (WCAG 2.4.3). Honours
   * `prefers-reduced-motion`.
   */
  private scrollToAndFocus(section: HTMLElement | undefined): void {
    if (!section) return;

    const reduced: boolean =
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    section.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    section.focus();
  }

  /** Navigates to a neighbour, if there is one. */
  private navigateToNeighbour(interventionId: string | null): void {
    if (interventionId === null) return;

    void this.router.navigate([
      '/organizations',
      this.organizationId(),
      'interventions',
      interventionId,
    ]);
  }
  //#endregion
}
