import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  lucideCloudUpload,
  lucideCompass,
  lucideEllipsis,
  lucideMessageSquareQuote,
  lucideTrash2,
} from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import { isCallPending, type CallState, type StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionCommandAction,
  InterventionEditState,
  InterventionEditTarget,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionPhase,
  InterventionReadinessItem,
  InterventionReadinessTarget,
  InterventionStatus,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
  MemberAvatar,
  MemberSelectOption,
  PublicationOutput,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import {
  InterventionStore,
  interventionStoreEvents,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import {
  capabilityForTransition,
  formatInterventionRelativeTime,
  isInterventionDeletable,
  resolveAllowedTransitions,
  resolveInterventionActivityActor,
  type InterventionTransitionCapability,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationMemberAccessStore,
  type OrganizationMemberAccessStoreType,
} from '@features/organization/state';
import { EmptyState } from '@shared/empty-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTextareaImports } from '@shared/ui/textarea';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '../../../state/intervention-planning-options';
import {
  InterventionWorkspaceStore,
  type InterventionWorkspaceStoreType,
} from '../../../state/intervention-workspace';
import { InterventionAbout } from '../../components/intervention-about';
import { InterventionActionBox } from '../../components/intervention-action-box';
import { InterventionActivityThread } from '../../components/intervention-activity-thread';
import { InterventionChangeList } from '../../components/intervention-change-list';
import { InterventionCommandBar } from '../../components/intervention-command-bar';
import { InterventionGettingStarted } from '../../components/intervention-getting-started';
import { InterventionPropertiesGrid } from '../../components/intervention-properties-grid';
import { InterventionPublicationSummary } from '../../components/intervention-publication-summary';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionCommentForm } from '../../forms/intervention-comment-form';
import type { InterventionWorkItemFormValues } from '../../forms/intervention-work-item-form';
import { InterventionRequestChangesSheet } from '../../sheets/intervention-request-changes-sheet';
import { InterventionWorkItemSheet } from '../../sheets/intervention-work-item-sheet';
import { InterventionWorkItemTable } from '../../tables/intervention-work-item-table';
import type { InterventionConfirmRequest } from './models';

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
 * content column of always-visible, always-mounted sections (Overview, Work
 * items, the conditional Changes list, then Activity) and a second column
 * stacking the properties card above the action box. At `lg` and up, the
 * second column is `sticky` so the properties/action-box stack stays in view
 * while the content column scrolls. Below `lg` (1024px) the two columns stack
 * in normal document flow — nothing here switches between viewports; there is
 * no tab state left to drive.
 *
 * Three decisions a reviewer should know about.
 *
 * The phase's forward action (Plan / Submit / Publish) keeps its one address
 * on the page, `app-intervention-action-box`, **outside the content column**.
 * So do the blocker and pending-changes counts it reads from the store: an
 * earlier design tucked proposed changes and blockers inside tab panels with
 * no outside indicator, and `FEATURE.md` records why that was retired —
 * nothing that gates publication may be visible only inside a section the
 * operator has to scroll to.
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
 * @version 4.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-detail',
  imports: [
    NgIcon,
    EmptyState,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertDialogImports,
    ...HlmAlertImports,
    ...HlmCardImports,
    ...HlmDropdownMenuImports,
    ...HlmSpinnerImports,
    ...HlmTextareaImports,
    InterventionAbout,
    InterventionActionBox,
    InterventionCommandBar,
    InterventionActivityThread,
    InterventionChangeList,
    InterventionCommentForm,
    InterventionGettingStarted,
    InterventionPropertiesGrid,
    InterventionPublicationSummary,
    InterventionRequestChangesSheet,
    InterventionTag,
    InterventionWorkItemSheet,
    InterventionWorkItemTable,
  ],
  providers: [
    InterventionWorkspaceStore,
    InterventionPlanningOptionsStore,
    provideIcons({
      lucideBan,
      lucideChevronLeft,
      lucideChevronRight,
      lucideCircleAlert,
      lucideCloudUpload,
      lucideCompass,
      lucideEllipsis,
      lucideMessageSquareQuote,
      lucideTrash2,
    }),
  ],
  templateUrl: './intervention-detail.component.html',
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

  /** Publishes and polls to a terminal state. */
  private readonly publication: InterventionPublicationService = inject(
    InterventionPublicationService,
  );

  /** Confirms a silent in-place commit so it is never invisible. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Listens for the list store's delete outcome. */
  private readonly events: Events = inject(Events);

  private readonly router: Router = inject(Router);

  /** The application's language, used to phrase the meta line and the timeline. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  constructor() {
    effect((): void => {
      const interventionId: string = this.interventionId();

      untracked((): void => {
        this.store.load(interventionId);
        this.store.loadActivities(interventionId);
      });
    });

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

    this.events
      .on(interventionStoreEvents.deleteSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => this.navigateToList());
  }
  //#endregion

  //#region Properties
  /** The field-work section, focused when the phase action sends the operator there. */
  private readonly workItemsSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('workItemsSection');

  /**
   * Property actionBoxSection
   * @readonly
   *
   * @description
   * The action box's wrapper, which the mobile command bar scrolls to when a
   * blocker is what disables it: the bar carries the reason, the box carries the
   * list.
   *
   * @access private
   * @since 4.1.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly actionBoxSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('actionBoxSection');

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

  /** What the text confirmation is asking about, if anything. */
  protected readonly pendingConfirm: WritableSignal<InterventionConfirmRequest | null> =
    signal<InterventionConfirmRequest | null>(null);

  /** The reason typed into the skip confirmation. */
  protected readonly skipReasonDraft: WritableSignal<string> = signal<string>('');

  /** Whether the publish confirmation is open. */
  protected readonly publishConfirmOpen: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether a publication request and its poll are running. */
  protected readonly publishing: WritableSignal<boolean> = signal<boolean>(false);

  /** What publication failed with, shown inline in the publish confirmation. */
  protected readonly publicationError: WritableSignal<string | null> = signal<string | null>(null);

  /** Whether the request-changes panel is open. */
  protected readonly requestChangesVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the add-work-item panel is open. */
  protected readonly workItemSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the browser can reach the API. */
  protected readonly online: Signal<boolean> = this.connectivity.online;

  /** Whether the offline outbox has changes waiting to sync. */
  protected readonly hasUnsyncedChanges: Signal<boolean> = this.offline.hasUnsyncedChanges;

  /**
   * Property phase
   * @readonly
   * @description Where the intervention sits in its lifecycle, derived from its status.
   * @access protected
   * @since 1.0.0
   * @type {Signal<InterventionPhase>}
   */
  protected readonly phase: Signal<InterventionPhase> = computed<InterventionPhase>(() => {
    const status: InterventionStatus | undefined = this.store.intervention()?.status;

    if (status === 'planned' || status === 'in_progress' || status === 'changes_requested')
      return 'execute';
    if (status === 'submitted' || status === 'published') return 'review';

    return 'prepare';
  });

  /**
   * Property commandTransitionTarget
   * @readonly
   *
   * @description
   * The status {@link invokeCommandAction} dispatches for the current phase, or
   * `null` in `review`, where the forward step is a publication rather than a
   * status update.
   *
   * Both the action box and the status menu read this one signal:
   * {@link invokeCommandAction} to dispatch it, {@link transitionTargets} to
   * subtract it. That is what keeps a forward move from having two addresses —
   * one behind the action box's readiness gate and one beside the status badge
   * with no gate at all.
   *
   * @access private
   * @since 4.1.0
   *
   * @type {Signal<InterventionStatus | null>}
   */
  private readonly commandTransitionTarget: Signal<InterventionStatus | null> =
    computed<InterventionStatus | null>(() => {
      const phase: InterventionPhase = this.phase();

      if (phase === 'prepare') return 'planned';
      if (phase === 'execute') return 'submitted';

      return null;
    });

  /** Whether the member may plan. */
  protected readonly canPlan: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Whether the member may record field work. */
  protected readonly canExecute: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );

  /** Whether the member may review. */
  protected readonly canReview: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW),
  );

  /** Whether the member may publish. */
  protected readonly canPublish: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PUBLISH),
  );

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
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(() => {
    const responsible: string | null = this.store.intervention()?.responsible ?? null;
    const memberId: string | undefined = this.memberAccess.profile()?.id;

    return (
      responsible !== null &&
      memberId !== undefined &&
      responsible === `/api/organizations/${this.organizationId()}/members/${memberId}`
    );
  });

  /** Whether planning fields accept a write — draft only, as the backend enforces. */
  protected readonly canEditPlanning: Signal<boolean> = computed<boolean>(
    () => this.canPlan() && this.store.intervention()?.status === 'draft',
  );

  /** Whether description and labels accept a write, which holds until a terminal status. */
  protected readonly canEditDetails: Signal<boolean> = computed<boolean>(() => {
    const status: InterventionStatus | undefined = this.store.intervention()?.status;

    return (
      this.canPlan() && status !== undefined && status !== 'published' && status !== 'abandoned'
    );
  });

  /** Whether the scope may still grow. */
  protected readonly canAddWorkItem: Signal<boolean> = computed<boolean>(
    () => this.canPlan() && this.store.intervention()?.status === 'draft',
  );

  /** Whether an item may be skipped with a reason. */
  protected readonly canSkipWorkItem: Signal<boolean> = computed<boolean>(
    () => this.canExecute() && this.phase() === 'execute',
  );

  /** Whether the intervention may be abandoned from its current status. */
  protected readonly canAbandon: Signal<boolean> = computed<boolean>(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention) return false;

    return (
      resolveAllowedTransitions(intervention).includes('abandoned') &&
      this.hasCapability(capabilityForTransition(intervention.status, 'abandoned'))
    );
  });

  /** Whether the intervention may be deleted outright rather than abandoned. */
  protected readonly canDeleteIntervention: Signal<boolean> = computed<boolean>(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention || !isInterventionDeletable(intervention)) return false;

    return intervention.status === 'draft' ? this.canPlan() : this.canExecute();
  });

  /**
   * Property transitionTargets
   * @readonly
   *
   * @description
   * The statuses this menu offers — the moves the action box does **not** own:
   * starting or reopening field work, and sending an intervention back for
   * changes. In practice that leaves `in_progress` and `changes_requested`.
   *
   * Four exclusions, each for its own reason:
   *
   * - {@link commandTransitionTarget}, because the phase's forward move belongs
   *   to the action box and its readiness gate. Offering it here too made that
   *   gate advisory: an agent could submit from this menu with work items still
   *   open, which the action box deliberately refuses.
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
  protected readonly transitionTargets: Signal<readonly InterventionStatus[]> = computed<
    readonly InterventionStatus[]
  >(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention) return [];

    const owned: InterventionStatus | null = this.commandTransitionTarget();

    return resolveAllowedTransitions(intervention)
      .filter((status) => status !== 'abandoned')
      .filter((status) => status !== owned)
      .filter((status) => this.hasCapability(capabilityForTransition(intervention.status, status)))
      .filter(
        (status) =>
          !(intervention.status === 'submitted' && status === 'in_progress') || this.canSubmit(),
      );
  });

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
  protected readonly canRejectChange: Signal<boolean> = computed<boolean>(() => {
    const status: InterventionStatus | undefined = this.store.intervention()?.status;
    if (status === undefined) return false;
    if (status === 'submitted') return this.canReview();

    return (status === 'in_progress' || status === 'changes_requested') && this.canExecute();
  });

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

  /** The site's human name, resolved from its IRI. */
  protected readonly siteLabel: Signal<string | null> = computed<string | null>(() => {
    const site: string | null = this.store.intervention()?.site ?? null;

    return site === null
      ? null
      : (this.planningOptions.sites().find((option) => option.value === site)?.label ?? site);
  });

  /** The responsible agent's display name, resolved from its IRI, for the details chip row. */
  protected readonly responsibleLabel: Signal<string | null> = computed<string | null>(() => {
    const responsible: string | null = this.store.intervention()?.responsible ?? null;

    return responsible === null
      ? null
      : (this.planningOptions.members().find((member) => member.value === responsible)
          ?.displayName ?? null);
  });

  /** The planned window as a short date range, for the details chip row. */
  protected readonly scheduleLabel: Signal<string | null> = computed<string | null>(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention || intervention.plannedStartAt == null || intervention.dueAt == null)
      return null;

    const formatter = new Intl.DateTimeFormat(this.locale, { month: 'short', day: 'numeric' });

    return `${formatter.format(new Date(intervention.plannedStartAt))} – ${formatter.format(new Date(intervention.dueAt))}`;
  });

  /** The intervention's labels, joined for the details chip row. */
  protected readonly labelsSummary: Signal<string | null> = computed<string | null>(() => {
    const labels = this.store.intervention()?.labels ?? [];

    return labels.length === 0 ? null : labels.map((label) => label.name).join(', ');
  });

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
  protected readonly metaLine: Signal<string> = computed<string>(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention) return '';

    const revision: string = `v${intervention.revision}`;
    const activities = this.store.activities();
    const last = activities.length > 0 ? activities[activities.length - 1] : undefined;

    if (last === undefined) {
      const when: string = formatInterventionRelativeTime(intervention.updatedAt, this.locale);

      return $localize`:@@intervention.detail.metaUpdated:Updated ${when}:when: · revision ${revision}:revision:`;
    }

    const when: string = formatInterventionRelativeTime(last.createdAt, this.locale);
    const actorName: string | undefined = resolveInterventionActivityActor(
      last.actor,
      this.planningOptions.members(),
    )?.displayName;

    if (last.kind === 'system' && last.event === 'status_changed')
      return actorName === undefined
        ? $localize`:@@intervention.detail.metaStatusChangedNoActor:Status changed ${when}:when: · revision ${revision}:revision:`
        : $localize`:@@intervention.detail.metaStatusChanged:${actorName}:actor: changed the status ${when}:when: · revision ${revision}:revision:`;

    if (last.kind === 'system' && last.event === 'created')
      return actorName === undefined
        ? $localize`:@@intervention.detail.metaCreatedNoActor:Created ${when}:when: · revision ${revision}:revision:`
        : $localize`:@@intervention.detail.metaCreated:${actorName}:actor: created this intervention ${when}:when: · revision ${revision}:revision:`;

    if (last.kind === 'comment')
      return actorName === undefined
        ? $localize`:@@intervention.detail.metaCommentedNoActor:Commented ${when}:when: · revision ${revision}:revision:`
        : $localize`:@@intervention.detail.metaCommented:${actorName}:actor: commented ${when}:when: · revision ${revision}:revision:`;

    return $localize`:@@intervention.detail.metaUpdated:Updated ${when}:when: · revision ${revision}:revision:`;
  });

  /**
   * Property assignees
   * @readonly
   *
   * @description
   * Everyone on the intervention as an overlapping stack, responsible first and
   * never twice.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberAvatar[]>}
   */
  protected readonly assignees: Signal<readonly MemberAvatar[]> = computed<readonly MemberAvatar[]>(
    () => {
      const intervention: InterventionOutput | null = this.store.intervention();
      if (!intervention) return [];

      const responsible: string | null = intervention.responsible;
      const ordered: readonly string[] = [
        ...(responsible === null ? [] : [responsible]),
        ...intervention.participants.filter((iri) => iri !== responsible),
      ];

      return ordered
        .map((iri) => this.planningOptions.members().find((member) => member.value === iri))
        .filter((member): member is MemberSelectOption => member !== undefined)
        .map((member) => ({
          label: member.initials,
          image: member.avatarUrl ?? undefined,
          tooltip:
            member.value === responsible
              ? $localize`:@@intervention.sidebar.responsibleTooltip:${member.displayName}:name: (responsible)`
              : member.displayName,
        }));
    },
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
   * has nothing to do here. Rendered exactly once, in `app-intervention-action-box`,
   * whatever the phase.
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

  /** The previous intervention's id, or null at the start. */
  protected readonly prevInterventionId: Signal<string | null> = computed<string | null>(
    () => this.listStore.orderedIds()[this.currentIndex() - 1] ?? null,
  );

  /** The next intervention's id, or null at the end. */
  protected readonly nextInterventionId: Signal<string | null> = computed<string | null>(
    () => this.listStore.orderedIds()[this.currentIndex() + 1] ?? null,
  );

  /** Whether the text confirmation is showing. */
  protected readonly confirmDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingConfirm() === null ? 'closed' : 'open',
  );

  /** Whether the publish confirmation is showing. */
  protected readonly publishDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.publishConfirmOpen() ? 'open' : 'closed',
  );

  /** The text confirmation's heading. */
  protected readonly confirmTitle: Signal<string> = computed<string>(() => {
    switch (this.pendingConfirm()?.kind) {
      case 'abandon':
        return $localize`:@@intervention.abandon.header:Abandon intervention`;
      case 'deleteIntervention':
        return $localize`:@@intervention.delete.header:Delete intervention`;
      case 'deleteWorkItem':
        return $localize`:@@intervention.deleteWi.headerOne:Delete work item`;
      default:
        return $localize`:@@intervention.wit.skipHeader:Skip work item`;
    }
  });

  /** The text confirmation's body. */
  protected readonly confirmDescription: Signal<string> = computed<string>(() => {
    switch (this.pendingConfirm()?.kind) {
      case 'abandon':
        return $localize`:@@intervention.abandon.message:Abandon this intervention? It leaves the active workflow and cannot be resumed.`;
      case 'deleteIntervention':
        return $localize`:@@intervention.delete.message:Delete this intervention? This cannot be undone.`;
      case 'deleteWorkItem':
        return $localize`:@@intervention.deleteWi.messageOne:Remove this prepared work item? This cannot be undone.`;
      default:
        return $localize`:@@intervention.wit.skipMessage:Say why this item is being skipped. The reason stays on the record.`;
    }
  });

  /** The text confirmation's accept label. */
  protected readonly confirmActionLabel: Signal<string> = computed<string>(() => {
    switch (this.pendingConfirm()?.kind) {
      case 'abandon':
        return $localize`:@@intervention.abandon.accept:Abandon`;
      case 'deleteWorkItem':
      case 'deleteIntervention':
        return $localize`:@@common.delete:Delete`;
      default:
        return $localize`:@@intervention.wit.skip:Skip`;
    }
  });

  /** Whether the text confirmation may be accepted. */
  protected readonly canAcceptConfirm: Signal<boolean> = computed<boolean>(
    () =>
      this.pendingConfirm()?.kind !== 'skipWorkItem' || this.skipReasonDraft().trim().length > 0,
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
   * Method invokeCommandAction
   *
   * @description
   * Runs the phase's forward action. In `review` this only opens the
   * confirmation — publication is never invoked directly.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected invokeCommandAction(): void {
    const target: InterventionStatus | null = this.commandTransitionTarget();

    if (target === null) {
      this.publicationError.set(null);
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

    this.store.transition({ interventionId: this.interventionId(), status: target });
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
    this.skipReasonDraft.set('');
    this.pendingConfirm.set({ kind: 'skipWorkItem', workItem });
  }

  /**
   * Method acceptConfirm
   *
   * @description
   * Runs whichever confirmation was open, then closes it. Deletion goes through
   * the list store: it is the only one that removes the entity and repairs
   * `orderedIds()`, which this page's prev/next footer walks.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected acceptConfirm(): void {
    const request: InterventionConfirmRequest | null = this.pendingConfirm();
    const intervention: InterventionOutput | null = this.store.intervention();
    if (request === null || intervention === null) return;

    switch (request.kind) {
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
          workItems: [request.workItem],
        });
        break;
      default:
        this.store.setWorkItemStatus({
          interventionId: this.interventionId(),
          workItemId: request.workItem.id,
          status: 'skipped',
          skipReason: this.skipReasonDraft().trim(),
        });
    }

    this.pendingConfirm.set(null);
  }

  /**
   * Method onConfirmDialogStateChanged
   * @description Any dismissal drops the pending request.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The dialog's new state.
   * @returns {void}
   */
  protected onConfirmDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

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
   * Method publishIntervention
   *
   * @description
   * Writes to the compliance record. Deliberately private and reachable only
   * from the confirmation's accept, which is what makes "publication is
   * confirm-gated" structural rather than a convention.
   *
   * The confirmation stays open on failure — the reason is shown inline and
   * the operator can retry without reopening it — and closes only once the
   * write actually lands.
   *
   * On success the workspace is reloaded rather than re-loaded: `load` blanks
   * the page first, which would flash the whole workspace to a skeleton at the
   * exact moment the operator is watching for the outcome.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {Promise<void>} Resolves once the publication reached a terminal state.
   */
  private async publishIntervention(): Promise<void> {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (intervention === null) return;

    if (!this.online()) {
      this.publicationError.set(
        $localize`:@@intervention.cta.reasonOffline:Connect to the network to publish.`,
      );

      return;
    }

    this.publishing.set(true);
    this.publicationError.set(null);

    try {
      const result: PublicationOutput = await this.publication.publish(intervention);

      if (result.status === 'failed') {
        this.publicationError.set(
          result.error ??
            $localize`:@@intervention.publication.failed:Publication failed without applying partial changes.`,
        );

        return;
      }

      this.store.reload(this.interventionId());
      this.publishConfirmOpen.set(false);
      this.feedback.success(
        $localize`:@@intervention.publication.succeeded:Published to the compliance record`,
      );
    } catch {
      this.publicationError.set(
        $localize`:@@intervention.publication.requestFailed:The publication request could not be completed.`,
      );
    } finally {
      this.publishing.set(false);
    }
  }

  /** Runs the publication from the confirmation's accept. */
  protected confirmPublish(): void {
    void this.publishIntervention();
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
   * otherwise. The section is always mounted and visible, so there is no
   * panel switch to wait on — a plain scroll that leaves focus on the
   * trigger that requested it would strand a keyboard user (WCAG 2.4.3),
   * which is why the section itself receives focus.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private revealFieldWork(): void {
    if (this.store.workItems().length === 0 && this.canAddWorkItem()) {
      this.workItemSheetVisible.set(true);

      return;
    }

    this.focusFieldWorkPanel();
  }

  /**
   * Method revealActionBox
   *
   * @description
   * Sends the operator to the action box, where the blocker list the mobile
   * command bar can only summarize actually lives.
   *
   * @access protected
   * @since 4.1.0
   *
   * @returns {void}
   */
  protected revealActionBox(): void {
    this.scrollToAndFocus(this.actionBoxSection()?.nativeElement);
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

  /** Whether the member holds the capability a transition requires. */
  private hasCapability(capability: InterventionTransitionCapability): boolean {
    if (capability === 'plan') return this.canPlan();
    if (capability === 'review') return this.canReview();

    return this.canExecute();
  }
  //#endregion
}
