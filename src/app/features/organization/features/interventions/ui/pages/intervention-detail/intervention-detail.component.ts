import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
  type ElementRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { ConnectivityService } from '@core/connectivity';
import { isCallPending } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionActivityOutput,
  InterventionChangeOutput,
  InterventionCommandAction,
  InterventionDiscoveryRequest,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionPhotoAttachment,
  InterventionPlanningDetails,
  InterventionStatus,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { resolveInterventionTag } from '@features/organization/features/interventions/models';
import {
  InterventionFieldExecutionService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import { InterventionDiscoveryService } from '@features/organization/features/interventions/services/intervention-discovery';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import {
  ActiveInterventionStore,
  InterventionHeaderStore,
  InterventionStore,
  interventionHeaderEvents,
  type ActiveInterventionStoreType,
  type InterventionHeaderStoreType,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionWorkspaceStore,
  type InterventionWorkspaceStoreType,
} from '@features/organization/features/interventions/state/intervention-workspace';
import {
  InterventionLabelChip,
  InterventionTag,
} from '@features/organization/features/interventions/ui/components';
import { InterventionChangeDiff } from '@features/organization/features/interventions/ui/components/intervention-change-diff';
import { InterventionPhaseStepper } from '@features/organization/features/interventions/ui/components/intervention-phase-stepper';
import { InterventionPlanningGuide } from '@features/organization/features/interventions/ui/components/intervention-planning-guide';
import type { InterventionPlanningGuideValues } from '@features/organization/features/interventions/ui/components/intervention-planning-guide';
import { InterventionReadinessChecklist } from '@features/organization/features/interventions/ui/components/intervention-readiness-checklist';
import type { InterventionReadinessCheck } from '@features/organization/features/interventions/ui/components/intervention-readiness-checklist';
import {
  InterventionDiscoveryDrawer,
  InterventionEditDrawer,
  InterventionRequestChangesDrawer,
  InterventionSkipDrawer,
  InterventionWorkItemDrawer,
} from '@features/organization/features/interventions/ui/drawers';
import type {
  InterventionDiscoveryFormValues,
  InterventionPlanningFormValues,
  InterventionRequestChangesFormValues,
  InterventionSkipFormValues,
  InterventionWorkItemFormValues,
} from '@features/organization/features/interventions/ui/forms';
import {
  capabilityForTransition,
  resolveAllowedTransitions,
  type InterventionTransitionCapability,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import {
  ActivityFeed,
  AvatarStack,
  CommentComposer,
  EmptyState,
  type ActivityFeedItem,
  type AvatarStackPerson,
} from '@shared/components';

/**
 * Component InterventionDetailPage
 * @class InterventionDetailPage
 *
 * @description
 * Route entry page for one intervention, laid out as a full-bleed,
 * divider-based Linear-style workspace (no page padding — the dashboard
 * layout's main is unpadded and this page owns its own edges): an integrated
 * top bar (breadcrumb link, code, prev/next with list position, phase
 * actions), page-level banners, then a two-column body — title block, phase
 * stepper row, guided planning (draft) or flat work-item checklist, proposed
 * changes, publication summary and activity in the main column; a tinted
 * "Properties" rail (properties, linked resource counts, readiness,
 * publication) on the right. It orchestrates the same field workflow as
 * before — online/offline field actions, discovery, publication polling —
 * through the unchanged {@link InterventionWorkspaceStore} and services;
 * every child it composes stays presentational.
 *
 * @version 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-detail-page',
  imports: [
    ActivityFeed,
    AvatarStack,
    ButtonModule,
    CommentComposer,
    DatePipe,
    EmptyState,
    InterventionChangeDiff,
    InterventionDiscoveryDrawer,
    InterventionEditDrawer,
    InterventionLabelChip,
    InterventionPhaseStepper,
    InterventionPlanningGuide,
    InterventionReadinessChecklist,
    InterventionRequestChangesDrawer,
    InterventionSkipDrawer,
    InterventionTag,
    InterventionWorkItemDrawer,
    MenuModule,
    MessageModule,
    MultiSelectModule,
    ReactiveFormsModule,
    RouterLink,
    SkeletonModule,
    TextareaModule,
  ],
  providers: [InterventionPlanningOptionsStore, InterventionWorkspaceStore],
  templateUrl: './intervention-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class InterventionDetailPage {
  //#region Inputs
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Provides the intervention id value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly interventionId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Stores and services
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped workspace store owning the intervention, work items,
   * changes, issues and activity timeline.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionWorkspaceStoreType}
   */
  protected readonly store: InterventionWorkspaceStoreType = inject<InterventionWorkspaceStoreType>(
    InterventionWorkspaceStore,
  );

  /**
   * Property activeIntervention
   * @readonly
   *
   * @description
   * Root-provided active intervention store kept in sync with the loaded
   * intervention so the breadcrumb, page title and header banner resolved by
   * `interventionTitleResolver` stay fresh across navigation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveInterventionStoreType}
   */
  private readonly activeIntervention: ActiveInterventionStoreType =
    inject<ActiveInterventionStoreType>(ActiveInterventionStore);

  /**
   * Property interventionListStore
   * @readonly
   *
   * @description
   * Parent-route-provided store shared with the list page, read only for its
   * `orderedIds()` — the list ordering the top bar's prev/next navigation
   * walks. Never loaded from here; when the current id isn't among its ids
   * (a deep link, or offline) prev/next stay hidden.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {InterventionStoreType}
   */
  private readonly interventionListStore: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /**
   * Property headerStore
   * @readonly
   *
   * @description
   * Root-provided bridge to the dashboard layout's page-header action slot:
   * the page publishes its header view state (phase action, review
   * affordance, prev/next, overflow) here and reacts to the slot's
   * `interventionHeaderEvents`.
   *
   * @access private
   * @since 6.1.0
   *
   * @type {InterventionHeaderStoreType}
   */
  private readonly headerStore: InterventionHeaderStoreType =
    inject<InterventionHeaderStoreType>(InterventionHeaderStore);

  /**
   * Property events
   * @readonly
   *
   * @description
   * Global NgRx event stream, listened to for the header slot's dispatched
   * interactions.
   *
   * @access private
   * @since 6.1.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Destroy hook used to clear the published header state when the page is
   * torn down.
   *
   * @access private
   * @since 6.1.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property planningOptions
   * @readonly
   *
   * @description
   * Component-scoped store providing site, member, target and label selector
   * options for the sidebar and the drawers it opens.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionPlanningOptionsStoreType}
   */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType = inject(
    InterventionPlanningOptionsStore,
  );

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Provides the offline value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  protected readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

  /**
   * Property sync
   * @readonly
   *
   * @description
   * Provides the sync value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionSyncCoordinatorService}
   */
  protected readonly sync: InterventionSyncCoordinatorService = inject(
    InterventionSyncCoordinatorService,
  );

  /**
   * Property confirmationService
   * @readonly
   *
   * @description
   * Confirmation service used to guard destructive actions (work-item
   * deletion, discarding blocked sync operations, abandoning).
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared connectivity source of truth backing the `online` signal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  protected readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * Resolves the current member's organization permissions used to derive
   * the `canPlan`, `canExecute`, `canReview` and `canPublish` signals.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property discovery
   * @readonly
   *
   * @description
   * Coordinates creation of discovered resources and their associated
   * work items, handling both online and offline paths.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionDiscoveryService}
   */
  private readonly discovery: InterventionDiscoveryService = inject<InterventionDiscoveryService>(
    InterventionDiscoveryService,
  );

  /**
   * Property publication
   * @readonly
   *
   * @description
   * Coordinates asynchronous intervention publication and polls for the
   * terminal publication result.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionPublicationService}
   */
  private readonly publication: InterventionPublicationService = inject(
    InterventionPublicationService,
  );

  /**
   * Property fieldExecution
   * @readonly
   *
   * @description
   * Coordinates field resource creation, scanning and evidence uploads.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionFieldExecutionService}
   */
  private readonly fieldExecution: InterventionFieldExecutionService = inject(
    InterventionFieldExecutionService,
  );

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Provides the organization value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly organization: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Provides the member access value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessStore}
   */
  private readonly memberAccess: OrganizationMemberAccessStore = inject(
    OrganizationMemberAccessStore,
  );

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used for the back button and prev/next navigation.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, kept only for API parity with sibling pages;
   * navigation here targets absolute organization-scoped URLs.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  //#endregion

  //#region Local UI state
  /**
   * Property phase
   * @readonly
   *
   * @description
   * Active workflow phase derived from the intervention status: `prepare`
   * (draft, abandoned), `execute` (planned, in progress, changes requested)
   * or `review` (submitted, published). Gates which accordion surfaces and
   * readiness checks the page shows.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<'prepare' | 'execute' | 'review'>}
   */
  protected readonly phase: Signal<'prepare' | 'execute' | 'review'> = computed<
    'prepare' | 'execute' | 'review'
  >(() => this.phaseForStatus(this.store.intervention()?.status));

  /**
   * Property publishing
   * @readonly
   *
   * @description
   * Whether an asynchronous publication request/poll is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly publishing: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property online
   * @readonly
   *
   * @description
   * Reactive online status, aliased from {@link connectivity}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly online: Signal<boolean> = this.connectivity.online;

  /**
   * Property publicationMessage
   * @readonly
   *
   * @description
   * Result/feedback message of the last publication attempt, shown in the
   * sidebar's Publication section.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly publicationMessage: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** Semantic severity matching the latest publication outcome. */
  protected readonly publicationSeverity: WritableSignal<'success' | 'error' | 'warn'> = signal<
    'success' | 'error' | 'warn'
  >('success');

  /** Keeps the review drawer open until the requested transition succeeds. */
  private readonly requestChangesPending: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property fieldActionBusy
   * @readonly
   *
   * @description
   * Whether a field action (scan, photo, discovery) is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly fieldActionBusy: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property fieldMessage
   * @readonly
   *
   * @description
   * Feedback message of the last field action, shown above the field
   * execution accordion.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly fieldMessage: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property editDrawerVisible
   * @readonly
   *
   * @description
   * Controls the single planning-details edit drawer, opened from the
   * description, priority and assignees rows.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly editDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property workItemDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the add-work-item drawer.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly workItemDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property skipDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the skip-work-item drawer.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly skipDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property discoveryDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the field discovery drawer.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discoveryDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property requestChangesDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the request-changes drawer, opened when the
   * status transition menu's `changes_requested` entry is selected.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly requestChangesDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property selectedWorkItem
   * @readonly
   *
   * @description
   * Work item currently targeted by the skip drawer.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<InterventionWorkItemOutput | null>}
   */
  protected readonly selectedWorkItem: WritableSignal<InterventionWorkItemOutput | null> =
    signal<InterventionWorkItemOutput | null>(null);

  /**
   * Property photoEquipmentId
   * @readonly
   *
   * @description
   * Equipment id targeted by the pending evidence-photo capture.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly photoEquipmentId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property activeChecklistItem
   * @readonly
   *
   * @description
   * Work item currently targeted by the checklist's row overflow menu.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<InterventionWorkItemOutput | null>}
   */
  protected readonly activeChecklistItem: WritableSignal<InterventionWorkItemOutput | null> =
    signal<InterventionWorkItemOutput | null>(null);

  /**
   * Property labelsEditorOpen
   * @readonly
   *
   * @description
   * Whether the sidebar's label multiselect editor is expanded in place of
   * the read-only label chip list.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly labelsEditorOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property descriptionEditorOpen
   * @readonly
   *
   * @description
   * Whether the identity block's inline description editor is expanded in
   * place of the read-only description text.
   *
   * @access protected
   * @since 6.3.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly descriptionEditorOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property descriptionControl
   * @readonly
   *
   * @description
   * Draft description bound to the inline editor, seeded by
   * {@link openDescriptionEditor} and read by {@link saveDescription}.
   *
   * @access protected
   * @since 6.3.0
   *
   * @type {FormControl<string>}
   */
  protected readonly descriptionControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property labelSelectionControl
   * @readonly
   *
   * @description
   * Draft label id selection bound to the sidebar's multiselect, seeded by
   * {@link openLabelsEditor} and read by {@link saveLabels}.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {FormControl<string[]>}
   */
  protected readonly labelSelectionControl: FormControl<string[]> = new FormControl<string[]>([], {
    nonNullable: true,
  });

  /**
   * Property lastActivitiesLoadedFor
   *
   * @description
   * Id of the intervention `loadActivities` was last called for, so the
   * constructor effect fetches the activity timeline once per loaded
   * intervention instead of on every workspace mutation.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {string | null}
   */
  private lastActivitiesLoadedFor: string | null = null;

  /**
   * Property checklistMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by the work-item checklist rows.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly checklistMenu: Signal<Menu> = viewChild.required<Menu>('checklistMenu');

  /**
   * Property statusMenu
   * @readonly
   *
   * @description
   * Popup menu listing the workflow-legal status transitions.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly statusMenu: Signal<Menu> = viewChild.required<Menu>('statusMenu');

  /**
   * Property workItemsSection
   * @readonly
   *
   * @description
   * Work-item checklist section, scrolled into view by the living
   * "complete the field work" command action.
   *
   * @access private
   * @since 7.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly workItemsSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('workItemsSection');

  /**
   * Property photoCaptureInput
   * @readonly
   *
   * @description
   * Hidden evidence-photo capture input, triggered from a checklist row's
   * "Add evidence photo" action for equipment work items.
   *
   * @access private
   * @since 5.1.0
   *
   * @type {Signal<ElementRef<HTMLInputElement> | undefined>}
   */
  private readonly photoCaptureInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('photoInput');
  //#endregion

  //#region Selector options
  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Available site selector options forwarded to the edit drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SelectOption[]>}
   */
  protected readonly siteOptions = this.planningOptions.sites;

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Available member selector options forwarded to the edit and work-item
   * drawers.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly memberOptions = this.planningOptions.members;

  /**
   * Property targetOptions
   * @readonly
   *
   * @description
   * Available target selector options (facilities and equipment) forwarded
   * to the work-item table and drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SelectOption[]>}
   */
  protected readonly targetOptions = this.planningOptions.targets;

  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Valid equipment type choices forwarded to the discovery drawer.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly SelectOption[]>}
   */
  protected readonly equipmentTypeOptions = this.planningOptions.equipmentTypes;
  //#endregion

  //#region Permissions
  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the current user is the intervention's responsible agent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(() => {
    const intervention = this.store.intervention();
    const organizationId = this.organization.selectedOrganization()?.id;
    const memberId = this.memberAccess.profile()?.id;
    return (
      !!intervention &&
      !!organizationId &&
      !!memberId &&
      intervention.responsible === `/api/organizations/${organizationId}/members/${memberId}`
    );
  });

  /**
   * Property canPlan
   * @readonly
   *
   * @description
   * Whether the current user can prepare and plan interventions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canPlan: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canExecute
   * @readonly
   *
   * @description
   * Whether the current user can perform field execution work.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canExecute: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );

  /**
   * Property canReview
   * @readonly
   *
   * @description
   * Whether the current user can review submitted interventions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReview: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW),
  );

  /**
   * Property canPublish
   * @readonly
   *
   * @description
   * Whether the current user can publish interventions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canPublish: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PUBLISH),
  );

  /**
   * Property canAbandon
   * @readonly
   *
   * @description
   * Whether the loaded intervention may be abandoned: workflow-legal for its
   * current status AND the current user holds the capability that
   * transition requires, mirroring the backend mapping.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAbandon: Signal<boolean> = computed<boolean>(() => {
    const intervention = this.store.intervention();
    if (!intervention || !resolveAllowedTransitions(intervention).includes('abandoned')) {
      return false;
    }

    return this.hasCapability(capabilityForTransition(intervention.status, 'abandoned'));
  });

  /**
   * Property canEditPlanning
   * @readonly
   *
   * @description
   * Whether the planning fields (site, responsible, participants, priority,
   * schedule) may still be edited: the backend freezes them once the
   * intervention leaves draft, so the edit affordances hide with them.
   *
   * @access protected
   * @since 6.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canEditPlanning: Signal<boolean> = computed<boolean>(
    () => this.canPlan() && this.store.intervention()?.status === 'draft',
  );

  /**
   * Property canEditDetails
   * @readonly
   *
   * @description
   * Whether the free-text description and labels may be edited: unlike
   * planning fields they stay mutable until the intervention reaches a
   * terminal status (published, abandoned).
   *
   * @access protected
   * @since 6.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canEditDetails: Signal<boolean> = computed<boolean>(() => {
    const status: InterventionStatus | undefined = this.store.intervention()?.status;
    return this.canPlan() && !!status && status !== 'published' && status !== 'abandoned';
  });

  /**
   * Property canAddWorkItem
   * @readonly
   *
   * @description
   * Whether a (planned) work item may be added: the user may plan and the
   * intervention is still a draft. Once preparation is confirmed the backend
   * only accepts discovered work items, so add is disabled to avoid a
   * guaranteed 409.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAddWorkItem: Signal<boolean> = computed<boolean>(
    () => this.canPlan() && this.store.intervention()?.status === 'draft',
  );

  /**
   * Property canDeleteWorkItem
   * @readonly
   *
   * @description
   * Whether prepared work items may be deleted: the user may add them and
   * the workspace is online (deletion is not queued offline).
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDeleteWorkItem: Signal<boolean> = computed<boolean>(
    () => this.canAddWorkItem() && this.online(),
  );

  /**
   * Property canAddDiscovery
   * @readonly
   *
   * @description
   * Whether field-discovery affordances (add discovery, scan QR) surface in the
   * work-item section header: the user may execute and the intervention is in
   * its execution phase.
   *
   * @access protected
   * @since 5.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAddDiscovery: Signal<boolean> = computed<boolean>(
    () => this.canExecute() && this.phase() === 'execute',
  );
  //#endregion

  //#region Identity and property signals
  /**
   * Property responsibleMember
   * @readonly
   *
   * @description
   * Resolved member option for the responsible agent, or null when
   * unassigned.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly responsibleMember: Signal<MemberSelectOption | null> =
    computed<MemberSelectOption | null>(() => {
      const responsible: string | null | undefined = this.store.intervention()?.responsible;
      if (!responsible) return null;
      return (
        this.memberOptions().find(
          (option: MemberSelectOption): boolean => option.value === responsible,
        ) ?? null
      );
    });

  /**
   * Property participantMembers
   * @readonly
   *
   * @description
   * Resolved member options for the intervention participants.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly participantMembers: Signal<readonly MemberSelectOption[]> = computed<
    readonly MemberSelectOption[]
  >(() => {
    const members: readonly MemberSelectOption[] = this.memberOptions();
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention) return [];
    return intervention.participants
      .map((iri: string): MemberSelectOption | undefined =>
        members.find((option: MemberSelectOption): boolean => option.value === iri),
      )
      .filter((member: MemberSelectOption | undefined): member is MemberSelectOption => !!member);
  });

  /**
   * Property assigneePeople
   * @readonly
   *
   * @description
   * Responsible agent followed by every participant, resolved into
   * {@link AvatarStackPerson}s for the sidebar's avatar stack.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly AvatarStackPerson[]>}
   */
  protected readonly assigneePeople: Signal<readonly AvatarStackPerson[]> = computed<
    readonly AvatarStackPerson[]
  >(() => {
    const responsible: MemberSelectOption | null = this.responsibleMember();
    const people: AvatarStackPerson[] = [];
    if (responsible) {
      people.push({
        label: responsible.displayName,
        image: responsible.avatarUrl ?? undefined,
        tooltip: $localize`:@@intervention.sidebar.responsibleTooltip:${responsible.displayName}:name: (responsible)`,
      });
    }
    for (const participant of this.participantMembers()) {
      // The responsible often participates too — list them once.
      if (participant.value === responsible?.value) continue;
      people.push({
        label: participant.displayName,
        image: participant.avatarUrl ?? undefined,
        tooltip: participant.displayName,
      });
    }
    return people;
  });

  /**
   * Property siteLabel
   * @readonly
   *
   * @description
   * Resolved label of the intervention site, or null when none is set.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly siteLabel: Signal<string | null> = computed<string | null>(() => {
    const site: string | null | undefined = this.store.intervention()?.site;
    if (!site) return null;
    return (
      this.siteOptions().find((option: SelectOption): boolean => option.value === site)?.label ??
      null
    );
  });

  /**
   * Property dueDanger
   * @readonly
   *
   * @description
   * Whether the due date has passed while the intervention is still active.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly dueDanger: Signal<boolean> = computed<boolean>(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention?.dueAt) return false;
    if (intervention.status === 'published' || intervention.status === 'abandoned') return false;
    return new Date(intervention.dueAt).getTime() < Date.now();
  });

  /**
   * Property labelOptions
   * @readonly
   *
   * @description
   * Organization intervention labels available for assignment, forwarded to
   * the sidebar's label multiselect.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly { id: string; name: string; color: string }[]>}
   */
  protected readonly labelOptions = this.planningOptions.labels;

  /**
   * Property blockerIssues
   * @readonly
   *
   * @description
   * Blocker-severity readiness issues, listed in the main-column banner.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly InterventionIssueOutput[]>}
   */
  protected readonly blockerIssues: Signal<readonly InterventionIssueOutput[]> = computed<
    readonly InterventionIssueOutput[]
  >(() =>
    this.store
      .issues()
      .filter((issue: InterventionIssueOutput): boolean => issue.severity === 'blocker'),
  );

  /**
   * Property workItemsDoneCount
   * @readonly
   *
   * @description
   * Number of work items resolved (completed or skipped), backing the
   * checklist's `{done}/{total}` counter.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly workItemsDoneCount: Signal<number> = computed<number>(
    () =>
      this.store
        .workItems()
        .filter(
          (item: InterventionWorkItemOutput): boolean =>
            item.status === 'completed' || item.status === 'skipped',
        ).length,
  );

  /**
   * Property pendingChangesCount
   * @readonly
   *
   * @description
   * Number of proposed (not yet applied or rejected) changes, backing the
   * changes section counter and the publication summary.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<number>}
   */
  protected readonly pendingChangesCount: Signal<number> = computed<number>(
    () =>
      this.store
        .changes()
        .filter((change: InterventionChangeOutput): boolean => change.status === 'proposed').length,
  );

  /**
   * Property readyToPublish
   * @readonly
   *
   * @description
   * Whether the intervention is submitted with no blocking issue left —
   * drives the review phase's "execution complete" banner.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly readyToPublish: Signal<boolean> = computed<boolean>(
    () => this.store.intervention()?.status === 'submitted' && this.store.blockerCount() === 0,
  );

  /**
   * Property showPlanningGuide
   * @readonly
   *
   * @description
   * Whether the main column renders the guided-planning surface instead of
   * the standard workspace panels: only while the intervention is a draft.
   *
   * @access protected
   * @since 5.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showPlanningGuide: Signal<boolean> = computed<boolean>(
    () => this.store.intervention()?.status === 'draft',
  );

  /**
   * Property activityExpanded
   * @readonly
   *
   * @description
   * Whether the activity panel body is expanded. Defaults per phase —
   * collapsed during preparation to keep the guided flow focused — and
   * resets when the phase changes; the header toggle overrides in between.
   *
   * @access protected
   * @since 5.3.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly activityExpanded: WritableSignal<boolean> = linkedSignal<boolean>(
    () => this.phase() !== 'prepare',
  );

  /**
   * Property workItemsExpanded
   * @readonly
   *
   * @description
   * Whether the work-item checklist body is expanded. Defaults per phase —
   * collapsed to a summary during review, where changes and publication
   * take the stage — and resets when the phase changes.
   *
   * @access protected
   * @since 5.3.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly workItemsExpanded: WritableSignal<boolean> = linkedSignal<boolean>(
    () => this.phase() !== 'review',
  );

  /**
   * Property canRequestChanges
   * @readonly
   *
   * @description
   * Whether the top bar surfaces the secondary "Request changes" action: the
   * user may review and the intervention is awaiting review.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRequestChanges: Signal<boolean> = computed<boolean>(
    () => this.canReview() && this.store.intervention()?.status === 'submitted',
  );

  /**
   * Property hasMobileCommandBar
   * @readonly
   *
   * @description
   * Whether the fixed mobile bottom bar renders: there is a phase command
   * action, or a review affordance that would otherwise be unreachable on
   * small screens (the header slot hides it below `lg`).
   *
   * @access protected
   * @since 6.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasMobileCommandBar: Signal<boolean> = computed<boolean>(
    () => !!this.commandAction() || this.canRequestChanges(),
  );

  /**
   * Property stageDetail
   * @readonly
   *
   * @description
   * Short counter rendered inside the phase stepper's active pill — the
   * `{done}/{total}` work-item progress during execution, nothing otherwise.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly stageDetail: Signal<string | null> = computed<string | null>(() => {
    if (this.phase() !== 'execute' || this.store.workItems().length === 0) return null;
    return `${this.workItemsDoneCount()}/${this.store.workItems().length}`;
  });

  /**
   * Property readinessDoneCount
   * @readonly
   *
   * @description
   * Number of readiness checks currently satisfied, backing the rail
   * section's `{done}/{total}` counter.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly readinessDoneCount: Signal<number> = computed<number>(
    () =>
      this.readinessChecks().filter((check: InterventionReadinessCheck): boolean => check.done)
        .length,
  );

  /**
   * Property readinessChecks
   * @readonly
   *
   * @description
   * Phase-appropriate readiness conditions: planning preconditions in
   * `prepare`, submit-readiness in `execute`, publish-readiness in `review`.
   * Mirrors the previous three phase panels' rail checklists so no readiness
   * detail is lost by the single-page layout.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly InterventionReadinessCheck[]>}
   */
  protected readonly readinessChecks: Signal<readonly InterventionReadinessCheck[]> = computed<
    readonly InterventionReadinessCheck[]
  >(() => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention) return [];

    switch (this.phase()) {
      case 'prepare':
        return [
          {
            label: $localize`:@@intervention.prepare.checkSite:Site assigned`,
            done: !!intervention.site,
          },
          {
            label: $localize`:@@intervention.prepare.checkResponsible:Responsible member assigned`,
            done: !!intervention.responsible,
          },
          {
            label: $localize`:@@intervention.prepare.checkStart:Planned start set`,
            done: !!intervention.plannedStartAt,
          },
          {
            label: $localize`:@@intervention.prepare.checkDue:Due date set`,
            done: !!intervention.dueAt,
          },
        ];
      case 'execute':
        return [
          {
            label: $localize`:@@intervention.exec.checkResolved:Resolve all field work`,
            done: this.store.progress() >= 100 && this.store.workItems().length > 0,
          },
          {
            label: $localize`:@@intervention.exec.checkResponsible:Submit as the responsible agent`,
            done: this.canSubmit(),
          },
        ];
      case 'review':
        return [
          {
            label: $localize`:@@intervention.review.checkSubmitted:Submitted for review`,
            done: intervention.status === 'submitted',
          },
          {
            label: $localize`:@@intervention.review.checkNoIssues:No blocking issues`,
            done: (intervention.blockersCount ?? 0) === 0,
          },
          {
            label: $localize`:@@intervention.review.checkOnline:Connected to the network`,
            done: this.online(),
          },
        ];
    }
  });
  //#endregion

  //#region Navigation
  /**
   * Property orderedIds
   * @readonly
   *
   * @description
   * Ids of the interventions cached by the shared list store, in list order.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  private readonly orderedIds: Signal<readonly string[]> = this.interventionListStore.orderedIds;

  /**
   * Property currentIndex
   * @readonly
   *
   * @description
   * Index of the current intervention within {@link orderedIds}, or `-1`
   * when it isn't cached (a deep link, or the list was never visited).
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Signal<number>}
   */
  private readonly currentIndex: Signal<number> = computed<number>(() =>
    this.orderedIds().indexOf(this.interventionId()),
  );

  /**
   * Property showPrevNext
   * @readonly
   *
   * @description
   * Whether the prev/next chevrons should render at all — hidden whenever
   * the current id isn't part of the cached list ordering.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showPrevNext: Signal<boolean> = computed<boolean>(
    () => this.currentIndex() !== -1,
  );

  /**
   * Property listPosition
   * @readonly
   *
   * @description
   * `position / total` indicator within the cached list ordering, or null
   * when the current id isn't part of it.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly listPosition: Signal<string | null> = computed<string | null>(() => {
    const index: number = this.currentIndex();
    if (index === -1) return null;
    return `${index + 1} / ${this.orderedIds().length}`;
  });

  /**
   * Property prevInterventionId
   * @readonly
   *
   * @description
   * Id of the previous intervention in the cached list ordering, or `null`.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly prevInterventionId: Signal<string | null> = computed<string | null>(() => {
    const index: number = this.currentIndex();
    return index > 0 ? this.orderedIds()[index - 1] : null;
  });

  /**
   * Property nextInterventionId
   * @readonly
   *
   * @description
   * Id of the next intervention in the cached list ordering, or `null`.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly nextInterventionId: Signal<string | null> = computed<string | null>(() => {
    const index: number = this.currentIndex();
    const ids: readonly string[] = this.orderedIds();
    return index !== -1 && index < ids.length - 1 ? ids[index + 1] : null;
  });
  //#endregion

  //#region Command action and menus
  /**
   * Property commandAction
   * @readonly
   *
   * @description
   * The single recommended forward action for the current phase, surfaced in
   * the header slot and the mobile bar. During execution it is a living
   * action — "Record field work" / "Complete N remaining items" — until the
   * checklist is resolved, then the phase-exit gate ("Plan", "Submit",
   * "Publish"). When gated, `disabledReason` explains the unmet condition at
   * the point of action. Null when the user lacks the phase capability or
   * the intervention is already published.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<InterventionCommandAction | null>}
   */
  protected readonly commandAction: Signal<InterventionCommandAction | null> =
    computed<InterventionCommandAction | null>(() => {
      const intervention: InterventionOutput | null = this.store.intervention();
      if (!intervention) return null;
      const saving: boolean = this.store.saving();

      switch (this.phase()) {
        case 'prepare': {
          if (!this.canPlan() || intervention.status !== 'draft') return null;
          const ready: boolean =
            !!intervention.site &&
            !!intervention.responsible &&
            !!intervention.plannedStartAt &&
            !!intervention.dueAt;
          return {
            label: $localize`:@@intervention.prepare.plan:Plan intervention`,
            icon: 'pi pi-calendar',
            disabled: !ready,
            disabledReason: ready
              ? null
              : $localize`:@@intervention.cta.reasonPlanning:Complete the remaining planning steps first.`,
            loading: saving,
          };
        }
        case 'execute': {
          if (!this.canExecute()) return null;
          const total: number = this.store.workItems().length;
          const remaining: number = total - this.workItemsDoneCount();
          // The bar carries the recommended action itself: finish (or start)
          // the field work, then hand over to the submit gate.
          if (total === 0 || remaining > 0) {
            const label: string =
              total === 0
                ? $localize`:@@intervention.cta.recordWork:Record field work`
                : remaining === 1
                  ? $localize`:@@intervention.cta.completeOne:Complete 1 remaining item`
                  : $localize`:@@intervention.cta.completeMany:Complete ${remaining}:count: remaining items`;
            return {
              label,
              icon: 'pi pi-check-square',
              disabled: false,
              disabledReason: null,
              loading: saving || this.fieldActionBusy(),
            };
          }
          const ready: boolean = this.canSubmit();
          return {
            label: $localize`:@@intervention.exec.submitTitle:Submit for review`,
            icon: 'pi pi-send',
            disabled: !ready,
            disabledReason: ready
              ? null
              : $localize`:@@intervention.cta.reasonResponsible:Only the responsible agent can submit.`,
            loading: saving || this.fieldActionBusy(),
          };
        }
        case 'review': {
          if (!this.canPublish() || intervention.status !== 'submitted') return null;
          const blockers: number = intervention.blockersCount ?? 0;
          const online: boolean = this.online();
          const ready: boolean = online && blockers === 0;
          return {
            label: $localize`:@@intervention.review.publish:Publish intervention`,
            icon: 'pi pi-check-circle',
            disabled: !ready,
            disabledReason: ready
              ? null
              : !online
                ? $localize`:@@intervention.cta.reasonOffline:Connect to the network to publish.`
                : blockers === 1
                  ? $localize`:@@intervention.cta.reasonBlockersOne:1 blocking issue to clear.`
                  : $localize`:@@intervention.cta.reasonBlockersMany:${blockers}:count: blocking issues to clear.`,
            loading: saving || this.publishing(),
          };
        }
      }
    });

  /**
   * Property transitionMenuItems
   * @readonly
   *
   * @description
   * Menu of the intervention's workflow-legal status transitions (excluding
   * `abandoned`, which is a separate destructive action), filtered to the
   * ones the current user's capability permits. Selecting `changes_requested`
   * opens {@link requestChangesDrawerVisible} instead of transitioning
   * directly, since that move requires a reviewer note.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly transitionMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const intervention: InterventionOutput | null = this.store.intervention();
    if (!intervention) return [];

    return resolveAllowedTransitions(intervention)
      .filter((status: InterventionStatus): boolean => status !== 'abandoned')
      .filter((status: InterventionStatus): boolean =>
        this.hasCapability(capabilityForTransition(intervention.status, status)),
      )
      .map(
        (status: InterventionStatus): MenuItem => ({
          label: resolveInterventionTag('status', status).label,
          icon: 'pi pi-arrow-right',
          command: (): void => this.onTransitionSelect(status),
        }),
      );
  });

  /**
   * Property overflowMenuItems
   * @readonly
   *
   * @description
   * Top bar's secondary-actions menu: currently only "Abandon", surfaced
   * when {@link canAbandon} holds.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly overflowMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    if (!this.canAbandon()) return [];
    return [
      {
        label: $localize`:@@intervention.abandon.action:Abandon intervention`,
        icon: 'pi pi-ban',
        command: (): void => this.confirmAbandon(),
      },
    ];
  });

  /**
   * Property checklistMenuItems
   * @readonly
   *
   * @description
   * Row-action menu for {@link activeChecklistItem}: skip (while not already
   * resolved) and delete (while {@link canDeleteWorkItem} holds).
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly checklistMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const item: InterventionWorkItemOutput | null = this.activeChecklistItem();
    if (!item) return [];

    const items: MenuItem[] = [];
    if (this.canAttachPhoto(item)) {
      items.push({
        label: $localize`:@@intervention.fwt.photoAria:Add evidence photo`,
        icon: 'pi pi-camera',
        command: (): void => this.attachPhotoForItem(item),
      });
    }
    if (this.canSkipWorkItem(item)) {
      items.push({
        label: $localize`:@@intervention.checklist.skip:Skip`,
        icon: 'pi pi-forward',
        command: (): void => this.openSkip(item),
      });
    }
    if (this.canDeleteWorkItem()) {
      items.push({
        label: $localize`:@@common.delete:Delete`,
        icon: 'pi pi-trash',
        command: (): void => this.confirmDeleteWorkItems([item]),
      });
    }
    return items;
  });

  /**
   * Method checklistRowHasActions
   * @method checklistRowHasActions
   *
   * @description
   * Whether a checklist row exposes any overflow-menu action (attach photo,
   * skip, delete) for the current phase and permissions — gates the row's
   * ellipsis button so it appears only when the menu would be non-empty.
   *
   * @access protected
   * @since 5.1.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to evaluate.
   *
   * @return {boolean}
   */
  protected checklistRowHasActions(item: InterventionWorkItemOutput): boolean {
    return this.canAttachPhoto(item) || this.canSkipWorkItem(item) || this.canDeleteWorkItem();
  }

  /**
   * Method canAttachPhoto
   * @method canAttachPhoto
   *
   * @description
   * Whether an evidence photo may be attached to a work item: field discovery
   * is available and the item targets a piece of equipment.
   *
   * @access private
   * @since 5.1.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to evaluate.
   *
   * @return {boolean}
   */
  private canAttachPhoto(item: InterventionWorkItemOutput): boolean {
    return this.canAddDiscovery() && !!this.equipmentId(item.target);
  }

  /**
   * Method canSkipWorkItem
   * @method canSkipWorkItem
   *
   * @description
   * Whether a work item may be skipped: the user may execute and the item is
   * not already resolved (completed or skipped).
   *
   * @access private
   * @since 5.1.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to evaluate.
   *
   * @return {boolean}
   */
  private canSkipWorkItem(item: InterventionWorkItemOutput): boolean {
    return this.canExecute() && item.status !== 'completed' && item.status !== 'skipped';
  }
  //#endregion

  //#region Activity
  /**
   * Property activityFeedItems
   * @readonly
   *
   * @description
   * Workspace activity timeline mapped to {@link ActivityFeedItem}s for the
   * generic {@link ActivityFeed}.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly ActivityFeedItem[]>}
   */
  protected readonly activityFeedItems: Signal<readonly ActivityFeedItem[]> = computed<
    readonly ActivityFeedItem[]
  >(() => this.store.activities().map((activity) => this.toActivityFeedItem(activity)));

  /**
   * Property activitiesLoading
   * @readonly
   *
   * @description
   * Whether the activity timeline is loading for the first time (pending with
   * no cached entries), used to show a skeleton instead of the empty state.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly activitiesLoading: Signal<boolean> = computed<boolean>(
    () => isCallPending(this.store.activityCallState()) && this.store.activities().length === 0,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the workspace and planning options for the routed intervention id,
   * mirrors the loaded intervention into {@link activeIntervention}, publishes
   * the header view state to {@link headerStore} for the layout's page-header
   * action slot (reacting to its dispatched events), and fetches the activity
   * timeline once per freshly loaded intervention.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      this.store.load(this.interventionId());
    });
    effect(() => {
      this.planningOptions.loadWorkspaceOptions(
        this.organization.selectedOrganization()?.id ?? null,
      );
    });
    effect(() => {
      const intervention = this.store.intervention();
      if (intervention) this.activeIntervention.setIntervention(intervention);
    });
    effect(() => {
      if (!this.requestChangesPending()) return;
      if (this.store.intervention()?.status !== 'changes_requested') return;
      this.requestChangesPending.set(false);
      this.requestChangesDrawerVisible.set(false);
    });
    // ⚠️ Zoneless: reads `store.intervention()` (tracked) but writes/reads
    // `activityCallState` through `loadActivities` inside `untracked()`, so
    // the write never re-triggers this effect (see intervention-workspace.store.ts).
    effect(() => {
      const intervention = this.store.intervention();
      const routedId = this.interventionId();
      if (!intervention || intervention.id !== routedId) return;
      if (this.lastActivitiesLoadedFor === intervention.id) return;
      this.lastActivitiesLoadedFor = intervention.id;
      untracked(() => this.store.loadActivities(intervention.id));
    });
    effect(() => {
      if (!this.store.intervention()) {
        this.headerStore.clear();
        return;
      }
      this.headerStore.setHeader({
        commandAction: this.commandAction(),
        canRequestChanges: this.canRequestChanges(),
        listPosition: this.listPosition(),
        showPrevNext: this.showPrevNext(),
        prevDisabled: !this.prevInterventionId(),
        nextDisabled: !this.nextInterventionId(),
        overflowItems: this.overflowMenuItems(),
      });
    });
    this.destroyRef.onDestroy(() => this.headerStore.clear());

    this.events
      .on(interventionHeaderEvents.commandInvoked)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.invokeCommandAction());
    this.events
      .on(interventionHeaderEvents.changesRequested)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.requestChangesDrawerVisible.set(true));
    this.events
      .on(interventionHeaderEvents.prevRequested)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.navigatePrev());
    this.events
      .on(interventionHeaderEvents.nextRequested)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.navigateNext());
  }
  //#endregion

  //#region Command and transition actions
  /**
   * Method planIntervention
   * @method planIntervention
   *
   * @description
   * Transitions the intervention to `planned`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected planIntervention(): void {
    this.store.transition({ interventionId: this.interventionId(), status: 'planned' });
  }

  /**
   * Method submitIntervention
   * @method submitIntervention
   *
   * @description
   * Transitions the intervention to `submitted`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected submitIntervention(): void {
    this.store.transition({ interventionId: this.interventionId(), status: 'submitted' });
  }

  /**
   * Method invokeCommandAction
   * @method invokeCommandAction
   *
   * @description
   * Runs the canonical forward action for the current phase.
   *
   * @access protected
   * @since 2.1.0
   *
   * @return {void}
   */
  protected invokeCommandAction(): void {
    switch (this.phase()) {
      case 'prepare':
        this.planIntervention();
        break;
      case 'execute': {
        const total: number = this.store.workItems().length;
        if (total === 0 || total - this.workItemsDoneCount() > 0) this.revealFieldWork();
        else this.submitIntervention();
        break;
      }
      case 'review':
        void this.publishIntervention();
        break;
    }
  }

  /**
   * Method revealFieldWork
   * @method revealFieldWork
   *
   * @description
   * Carries out the living "complete the field work" command: expands the
   * checklist and scrolls it into view, or opens the discovery drawer when
   * there is nothing to complete yet.
   *
   * @access private
   * @since 7.0.0
   *
   * @return {void}
   */
  private revealFieldWork(): void {
    this.workItemsExpanded.set(true);
    if (this.store.workItems().length === 0 && this.canAddDiscovery()) {
      this.discoveryDrawerVisible.set(true);
      return;
    }
    const section: HTMLElement | undefined = this.workItemsSection()?.nativeElement;
    if (!section) return;
    const reduceMotion: boolean =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /**
   * Method onTransitionSelect
   * @method onTransitionSelect
   *
   * @description
   * Handles a status transition menu selection: opens the request-changes
   * drawer for `changes_requested` (it requires a reviewer note), otherwise
   * transitions directly.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionStatus} status - Target status selected from the menu.
   *
   * @return {void}
   */
  protected onTransitionSelect(status: InterventionStatus): void {
    if (status === 'changes_requested') {
      this.requestChangesDrawerVisible.set(true);
      return;
    }
    this.store.transition({ interventionId: this.interventionId(), status });
  }

  /**
   * Method requestChanges
   * @method requestChanges
   *
   * @description
   * Transitions the intervention to `changes_requested` with the reviewer's
   * captured note.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionRequestChangesFormValues} values - Captured review note.
   *
   * @return {void}
   */
  protected requestChanges(values: InterventionRequestChangesFormValues): void {
    this.requestChangesPending.set(true);
    this.store.transition({
      interventionId: this.interventionId(),
      status: 'changes_requested',
      reviewNote: values.note,
    });
  }

  /**
   * Method publishIntervention
   * @method publishIntervention
   *
   * @description
   * Publishes the intervention through {@link InterventionPublicationService},
   * polling until the publication reaches a terminal state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {Promise<void>}
   */
  protected async publishIntervention(): Promise<void> {
    const intervention = this.store.intervention();
    if (!intervention || !this.online()) {
      this.publicationSeverity.set('warn');
      this.publicationMessage.set(
        $localize`:@@intervention.publication.offline:Connect to the network before publishing this intervention.`,
      );
      return;
    }
    this.publishing.set(true);
    this.publicationMessage.set(null);
    try {
      const completed = await this.publication.publish(intervention);
      if (completed.status === 'failed') {
        this.publicationSeverity.set('error');
        this.publicationMessage.set(
          completed.error ??
            $localize`:@@intervention.publishFailed:Publication failed without applying partial changes.`,
        );
        return;
      }
      this.publicationSeverity.set('success');
      this.publicationMessage.set(
        $localize`:@@intervention.publication.success:Intervention published successfully.`,
      );
      this.store.load(this.interventionId());
    } catch {
      this.publicationSeverity.set('error');
      this.publicationMessage.set(
        $localize`:@@intervention.publication.failed:The publication request could not be completed.`,
      );
    } finally {
      this.publishing.set(false);
    }
  }

  /**
   * Method confirmAbandon
   * @method confirmAbandon
   *
   * @description
   * Confirms then abandons the intervention through the workspace store's
   * transition — the same path every other status change uses.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected confirmAbandon(): void {
    this.confirmationService.confirm({
      header: $localize`:@@intervention.abandon.header:Abandon intervention`,
      message: $localize`:@@intervention.abandon.message:Abandon this intervention? It leaves the active workflow and cannot be resumed.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@intervention.abandon.accept:Abandon`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void =>
        void this.store.transition({ interventionId: this.interventionId(), status: 'abandoned' }),
    });
  }

  /**
   * Method hasCapability
   * @method hasCapability
   *
   * @description
   * Resolves an {@link InterventionTransitionCapability} to the matching
   * `INTERVENTIONS_{PLAN,EXECUTE,REVIEW}` permission check.
   *
   * @access private
   * @since 3.0.0
   *
   * @param {InterventionTransitionCapability} capability - Capability to check.
   *
   * @return {boolean} True when the member currently holds it.
   */
  private hasCapability(capability: InterventionTransitionCapability): boolean {
    switch (capability) {
      case 'plan':
        return this.canPlan();
      case 'review':
        return this.canReview();
      case 'execute':
      default:
        return this.canExecute();
    }
  }
  //#endregion

  //#region Details, labels and work items
  /**
   * Method savePlanningDetails
   * @method savePlanningDetails
   *
   * @description
   * Maps the edit drawer's planning form values (site, responsible,
   * participants, priority, schedule, description) to an update command and
   * closes the drawer. Labels are edited and saved separately (see
   * {@link saveLabels}).
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionPlanningFormValues} values - Validated form values.
   *
   * @return {void}
   */
  protected savePlanningDetails(values: InterventionPlanningFormValues): void {
    const planningDetails: InterventionPlanningDetails = {
      site: values.site,
      responsible: values.responsible,
      participants: values.participants,
      priority: values.priority,
      plannedStartAt: values.plannedStartAt,
      dueAt: values.dueAt,
    };
    this.store.updateDetails({
      interventionId: this.interventionId(),
      input: { ...planningDetails, description: values.description.trim() || null },
    });
    this.editDrawerVisible.set(false);
  }

  /**
   * Method saveGuideStep
   * @method saveGuideStep
   *
   * @description
   * Merge-patches the fields edited on one guided-planning step into the
   * intervention.
   *
   * @access protected
   * @since 5.3.0
   *
   * @param {InterventionPlanningGuideValues} values - Fields the step edited.
   *
   * @return {void}
   */
  protected saveGuideStep(values: InterventionPlanningGuideValues): void {
    this.store.updateDetails({ interventionId: this.interventionId(), input: values });
  }

  /**
   * Method openDescriptionEditor
   * @method openDescriptionEditor
   *
   * @description
   * Seeds {@link descriptionControl} from the intervention's current
   * description and expands the inline editor. The description stays
   * editable after planning (unlike planning fields), so this bypasses the
   * planning drawer.
   *
   * @access protected
   * @since 6.3.0
   *
   * @return {void}
   */
  protected openDescriptionEditor(): void {
    this.descriptionControl.setValue(this.store.intervention()?.description ?? '');
    this.descriptionEditorOpen.set(true);
  }

  /**
   * Method saveDescription
   * @method saveDescription
   *
   * @description
   * Merge-patches only the description and collapses the inline editor.
   *
   * @access protected
   * @since 6.3.0
   *
   * @return {void}
   */
  protected saveDescription(): void {
    this.store.updateDetails({
      interventionId: this.interventionId(),
      input: { description: this.descriptionControl.value.trim() || null },
    });
    this.descriptionEditorOpen.set(false);
  }

  /**
   * Method openLabelsEditor
   * @method openLabelsEditor
   *
   * @description
   * Seeds {@link labelSelectionControl} from the intervention's current
   * labels and expands the multiselect editor.
   *
   * @access protected
   * @since 3.0.0
   *
   * @return {void}
   */
  protected openLabelsEditor(): void {
    const intervention = this.store.intervention();
    this.labelSelectionControl.setValue(
      intervention ? intervention.labels.map((label) => label.id) : [],
    );
    this.labelsEditorOpen.set(true);
  }

  /**
   * Method saveLabels
   * @method saveLabels
   *
   * @description
   * Saves the draft label selection as the intervention's whole label set
   * (merge-patch semantics — see `InterventionService.update`) and collapses
   * the editor back to the read-only chip list.
   *
   * @access protected
   * @since 3.0.0
   *
   * @return {void}
   */
  protected saveLabels(): void {
    this.store.updateDetails({
      interventionId: this.interventionId(),
      input: { labelIds: this.labelSelectionControl.value },
    });
    this.labelsEditorOpen.set(false);
  }

  /**
   * Method createWorkItem
   * @method createWorkItem
   *
   * @description
   * Maps the work-item drawer's form values to a create command.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemFormValues} values - Validated form values.
   *
   * @return {void}
   */
  protected createWorkItem(values: InterventionWorkItemFormValues): void {
    const workItemInput: CreateInterventionWorkItemInput = {
      intervention: `/api/interventions/${this.interventionId()}`,
      action: values.action,
      target: values.target.trim() || null,
      assignee: values.assignee || null,
      source: 'planned',
      required: true,
    };
    this.store.createWorkItem({ interventionId: this.interventionId(), input: workItemInput });
    this.workItemDrawerVisible.set(false);
  }

  /**
   * Method confirmDeleteWorkItems
   * @method confirmDeleteWorkItems
   *
   * @description
   * Confirms then deletes the requested prepared work items (a single row or
   * a bulk selection). The message adapts to the count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {readonly InterventionWorkItemOutput[]} workItems - Work items to delete.
   *
   * @return {void}
   */
  protected confirmDeleteWorkItems(workItems: readonly InterventionWorkItemOutput[]): void {
    if (workItems.length === 0) return;

    const isSingle: boolean = workItems.length === 1;
    this.confirmationService.confirm({
      header: isSingle
        ? $localize`:@@intervention.deleteWi.headerOne:Delete work item`
        : $localize`:@@intervention.deleteWi.headerMany:Delete work items`,
      message: isSingle
        ? $localize`:@@intervention.deleteWi.messageOne:Remove this prepared work item? This cannot be undone.`
        : $localize`:@@intervention.deleteWi.messageMany:Remove these ${workItems.length}:count: prepared work items? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.delete:Delete`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void =>
        void this.store.deleteWorkItems({ interventionId: this.interventionId(), workItems }),
    });
  }

  /**
   * Method updateWorkItem
   * @method updateWorkItem
   *
   * @description
   * Forwards a work-item status change to the workspace store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemStatusChange} event - Status change to apply.
   *
   * @return {void}
   */
  protected updateWorkItem(event: InterventionWorkItemStatusChange): void {
    this.store.setWorkItemStatus({ interventionId: this.interventionId(), ...event });
  }

  /**
   * Method workItemLabel
   * @method workItemLabel
   *
   * @description
   * Human-readable checklist row label: the resolved action label, and the
   * resolved target when one is known — mirroring the field-work and
   * work-item tables' own resolution so the checklist reads identically.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to label.
   *
   * @return {string}
   */
  protected workItemLabel(item: InterventionWorkItemOutput): string {
    const actionLabel = resolveInterventionTag('workItemAction', item.action).label;
    const target = this.resolveWorkItemTarget(item);
    return target ? `${actionLabel} · ${target}` : actionLabel;
  }

  /**
   * Method resolveWorkItemTarget
   * @method resolveWorkItemTarget
   *
   * @description
   * Resolves a human-readable target label: the identity embedded by the
   * API first, then the raw value when it is free text, and null for an
   * unresolved resource IRI.
   *
   * @access private
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @return {string | null}
   */
  private resolveWorkItemTarget(item: InterventionWorkItemOutput): string | null {
    if (item.targetSummary) return item.targetSummary.label;
    const target: string | null = item.target;
    if (!target) return null;
    return target.startsWith('/api/') ? null : target;
  }

  /**
   * Method isWorkItemDone
   * @method isWorkItemDone
   *
   * @description
   * Whether the checklist checkbox for a work item reads as checked.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to evaluate.
   *
   * @return {boolean}
   */
  protected isWorkItemDone(item: InterventionWorkItemOutput): boolean {
    return item.status === 'completed';
  }

  /**
   * Method isNextWorkItem
   * @method isNextWorkItem
   *
   * @description
   * Whether a checklist row is the workspace's next recommended work item,
   * highlighted so the field agent always sees the obvious next action.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to evaluate.
   *
   * @return {boolean}
   */
  protected isNextWorkItem(item: InterventionWorkItemOutput): boolean {
    return this.store.nextWorkItem()?.id === item.id;
  }

  /**
   * Method canToggleWorkItem
   * @method canToggleWorkItem
   *
   * @description
   * Whether the checklist checkbox for a work item is interactive: the user
   * may execute field work and the item isn't already skipped (skip is a
   * distinct action reached through the row menu).
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to evaluate.
   *
   * @return {boolean}
   */
  protected canToggleWorkItem(item: InterventionWorkItemOutput): boolean {
    return this.canExecute() && item.status !== 'skipped';
  }

  /**
   * Method toggleWorkItemComplete
   * @method toggleWorkItemComplete
   *
   * @description
   * Toggles a work item between `completed` and `planned` from the
   * checklist checkbox.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to toggle.
   *
   * @return {void}
   */
  protected toggleWorkItemComplete(item: InterventionWorkItemOutput): void {
    if (!this.canToggleWorkItem(item)) return;
    this.updateWorkItem({
      workItemId: item.id,
      status: this.isWorkItemDone(item) ? 'planned' : 'completed',
    });
  }

  /**
   * Method onChecklistMenuToggle
   * @method onChecklistMenuToggle
   *
   * @description
   * Stores the targeted work item row and toggles the shared checklist menu.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {MouseEvent} event - Click event from the row action button.
   * @param {InterventionWorkItemOutput} item - Row targeted by the menu.
   *
   * @return {void}
   */
  protected onChecklistMenuToggle(event: MouseEvent, item: InterventionWorkItemOutput): void {
    this.activeChecklistItem.set(item);
    this.checklistMenu().toggle(event);
  }

  /**
   * Method onStatusMenuToggle
   * @method onStatusMenuToggle
   *
   * @description
   * Toggles the sidebar's status transition menu.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {MouseEvent} event - Click event from the status control.
   *
   * @return {void}
   */
  protected onStatusMenuToggle(event: MouseEvent): void {
    this.statusMenu().toggle(event);
  }

  //#endregion

  //#region Field execution (skip, discovery, scan, photo)
  /**
   * Method openSkip
   * @method openSkip
   *
   * @description
   * Targets a work item and opens the skip drawer.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to skip.
   *
   * @return {void}
   */
  protected openSkip(item: InterventionWorkItemOutput): void {
    this.selectedWorkItem.set(item);
    this.skipDrawerVisible.set(true);
  }

  /**
   * Method confirmSkip
   * @method confirmSkip
   *
   * @description
   * Applies the captured skip reason to {@link selectedWorkItem}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionSkipFormValues} values - Captured skip reason.
   *
   * @return {void}
   */
  protected confirmSkip(values: InterventionSkipFormValues): void {
    const item = this.selectedWorkItem();
    const reason = values.reason.trim();
    if (!item || !reason) return;
    this.updateWorkItem({ workItemId: item.id, status: 'skipped', skipReason: reason });
    this.skipDrawerVisible.set(false);
  }

  /**
   * Method createDiscovery
   * @method createDiscovery
   *
   * @description
   * Creates a discovered work item, handling both the online and offline
   * (outbox-queued) paths.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionDiscoveryRequest} event - Discovery request.
   *
   * @return {Promise<void>}
   */
  protected async createDiscovery(event: InterventionDiscoveryRequest): Promise<void> {
    this.fieldMessage.set(null);
    const organizationId = this.organization.selectedOrganization()?.id;
    const target = event.target?.trim();
    if (!organizationId || !target) return;

    this.fieldActionBusy.set(true);
    try {
      const discovery = await this.discovery.create(organizationId, this.interventionId(), {
        ...event,
        target,
      });
      if (discovery.queued) {
        await this.store.recordQueuedDiscovery(discovery.workItem);
      } else this.store.load(this.interventionId());
      this.fieldMessage.set(
        $localize`:@@intervention.field.discoverySaved:Discovery saved as an intervention draft resource.`,
      );
    } catch {
      this.fieldMessage.set(
        $localize`:@@intervention.field.discoveryFailed:The discovered resource could not be saved.`,
      );
    } finally {
      this.fieldActionBusy.set(false);
    }
  }

  /**
   * Method confirmDiscovery
   * @method confirmDiscovery
   *
   * @description
   * Maps the discovery drawer's form values to a discovery request.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionDiscoveryFormValues} values - Captured discovery values.
   *
   * @return {void}
   */
  protected confirmDiscovery(values: InterventionDiscoveryFormValues): void {
    void this.createDiscovery({
      action: values.action,
      target: values.target.trim() || null,
      result: values.result,
    });
    this.discoveryDrawerVisible.set(false);
  }

  /**
   * Method scanPhoto
   * @method scanPhoto
   *
   * @description
   * Reads a captured QR code and forwards it to {@link createDiscovery}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {File} file - Captured image.
   *
   * @return {Promise<void>}
   */
  protected async scanPhoto(file: File): Promise<void> {
    this.fieldActionBusy.set(true);
    this.fieldMessage.set(null);
    try {
      const scannedValue = await this.fieldExecution.scan(file);
      if (!scannedValue) {
        this.fieldMessage.set(
          $localize`:@@intervention.field.qrNotDetected:No QR code was detected. Capture it again or add the discovery manually.`,
        );
        return;
      }
      await this.createDiscovery({
        action: 'inventory',
        target: this.discovery.normalizeScannedTarget(scannedValue),
        result: 'pass',
      });
    } catch {
      this.fieldMessage.set(
        $localize`:@@intervention.field.qrUnreadable:The QR code could not be read. Capture it again or add the discovery manually.`,
      );
    } finally {
      this.fieldActionBusy.set(false);
    }
  }

  /**
   * Method attachPhoto
   * @method attachPhoto
   *
   * @description
   * Uploads (or queues offline) an evidence photo for an equipment work item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionPhotoAttachment} event - Target equipment and captured file.
   *
   * @return {Promise<void>}
   */
  protected async attachPhoto(event: InterventionPhotoAttachment): Promise<void> {
    this.fieldActionBusy.set(true);
    this.fieldMessage.set(null);
    try {
      const queued = await this.fieldExecution.attachPhoto(
        this.interventionId(),
        event.equipmentId,
        event.file,
      );
      if (queued) {
        await this.store.touchOfflineIntervention();
        this.fieldMessage.set(
          $localize`:@@intervention.field.photoQueued:Photo compressed and queued for synchronization.`,
        );
        return;
      }
      this.fieldMessage.set(
        $localize`:@@intervention.field.photoUploaded:Evidence photo uploaded.`,
      );
    } catch {
      this.fieldMessage.set(
        $localize`:@@intervention.field.photoFailed:The evidence photo could not be saved.`,
      );
    } finally {
      this.fieldActionBusy.set(false);
    }
  }

  /**
   * Method captureScan
   * @method captureScan
   *
   * @description
   * Reads the file picked by the hidden QR-scan capture input.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {Event} event - Native file input change event.
   *
   * @return {void}
   */
  protected captureScan(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) void this.scanPhoto(file);
    fileInput.value = '';
  }

  /**
   * Method openPhotoCapture
   * @method openPhotoCapture
   *
   * @description
   * Targets the equipment work item's photo capture and opens the native
   * file picker.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {InterventionWorkItemOutput} item - Equipment work item.
   * @param {HTMLInputElement} fileInput - Hidden capture input to trigger.
   *
   * @return {void}
   */
  protected openPhotoCapture(item: InterventionWorkItemOutput, fileInput: HTMLInputElement): void {
    const equipmentId = this.equipmentId(item.target);
    if (!equipmentId) return;
    this.photoEquipmentId.set(equipmentId);
    fileInput.click();
  }

  /**
   * Method attachPhotoForItem
   * @method attachPhotoForItem
   *
   * @description
   * Triggers the hidden photo capture input for an equipment work item from
   * the checklist row menu, a no-op when the input is not yet rendered.
   *
   * @access protected
   * @since 5.1.0
   *
   * @param {InterventionWorkItemOutput} item - Equipment work item to photograph.
   *
   * @return {void}
   */
  protected attachPhotoForItem(item: InterventionWorkItemOutput): void {
    const captureInput: HTMLInputElement | undefined = this.photoCaptureInput()?.nativeElement;
    if (captureInput) this.openPhotoCapture(item, captureInput);
  }

  /**
   * Method capturePhoto
   * @method capturePhoto
   *
   * @description
   * Reads the file picked by the hidden photo capture input and forwards it
   * to {@link attachPhoto}.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {Event} event - Native file input change event.
   *
   * @return {void}
   */
  protected capturePhoto(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    const equipmentId = this.photoEquipmentId();
    if (file && equipmentId) void this.attachPhoto({ equipmentId, file });
    this.photoEquipmentId.set(null);
    fileInput.value = '';
  }

  /**
   * Method equipmentId
   * @method equipmentId
   *
   * @description
   * Extracts the equipment id from a work item's target IRI.
   *
   * @access private
   * @since 3.0.0
   *
   * @param {string | null} target - Work item target IRI.
   *
   * @return {string | null}
   */
  private equipmentId(target: string | null): string | null {
    const match = target?.match(/^\/api\/equipment\/([^/?#]+)$/);
    return match?.[1] ?? null;
  }

  /**
   * Method scanSupported
   * @method scanSupported
   *
   * @description
   * Whether the device supports QR scanning.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {boolean}
   */
  protected scanSupported(): boolean {
    return this.fieldExecution.scanSupported();
  }
  //#endregion

  //#region Activity / comments
  /**
   * Method addComment
   * @method addComment
   *
   * @description
   * Posts a comment from the composer onto the activity timeline.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {string} body - Trimmed, non-empty comment text.
   *
   * @return {void}
   */
  protected addComment(body: string): void {
    this.store.addComment({ interventionId: this.interventionId(), body });
  }

  /**
   * Method resolveMemberLabel
   * @method resolveMemberLabel
   *
   * @description
   * Resolves a member IRI to a display name via the planning options,
   * falling back to a generic label when unresolved.
   *
   * @access private
   * @since 3.0.0
   *
   * @param {string | null} memberIri - Member IRI, or null for a system entry.
   *
   * @return {string}
   */
  private resolveMemberLabel(memberIri: string | null): string {
    if (!memberIri) return $localize`:@@intervention.activity.system:System`;
    const member = this.memberOptions().find(
      (option: MemberSelectOption): boolean => option.value === memberIri,
    );
    return member?.displayName ?? $localize`:@@intervention.list.unknownMember:Member`;
  }

  /**
   * Method toActivityFeedItem
   * @method toActivityFeedItem
   *
   * @description
   * Maps one workspace activity entry to an {@link ActivityFeedItem}: a
   * `comment` card, or an `event` line for `created`/`status_changed` (and a
   * generic fallback for any future system event).
   *
   * @access private
   * @since 3.0.0
   *
   * @param {InterventionActivityOutput} activity - Raw activity entry.
   *
   * @return {ActivityFeedItem}
   */
  private toActivityFeedItem(activity: InterventionActivityOutput): ActivityFeedItem {
    const authorLabel = this.resolveMemberLabel(activity.actor);

    if (activity.kind === 'comment') {
      return {
        id: activity.id,
        timestamp: activity.createdAt,
        authorLabel,
        body: activity.body ?? '',
        kind: 'comment',
      };
    }

    if (activity.event === 'status_changed') {
      const payload = activity.payload as { readonly to?: InterventionStatus } | null;
      const toLabel = payload?.to ? resolveInterventionTag('status', payload.to).label : '';
      return {
        id: activity.id,
        timestamp: activity.createdAt,
        authorLabel,
        icon: 'pi pi-arrow-right-arrow-left',
        text: $localize`:@@intervention.activity.statusChanged:changed status to ${toLabel}:to:`,
        kind: 'event',
      };
    }

    return {
      id: activity.id,
      timestamp: activity.createdAt,
      authorLabel,
      icon: 'pi pi-plus-circle',
      text: $localize`:@@intervention.activity.created:created the intervention`,
      kind: 'event',
    };
  }
  //#endregion

  //#region Sync / offline
  /**
   * Method discardBlocked
   * @method discardBlocked
   *
   * @description
   * Confirms then permanently drops every blocked synchronization operation.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Event} event - Click event used to anchor the confirmation popup.
   *
   * @return {void}
   */
  protected discardBlocked(event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      header: $localize`:@@intervention.discard.header:Discard operations`,
      message: $localize`:@@intervention.discard.message:Permanently remove the synchronization operations that the server rejected? This cannot be undone — the discarded work will need to be re-recorded.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@intervention.detail.discard:Discard`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => void this.sync.discardBlocked(),
    });
  }
  //#endregion

  //#region Header slot navigation
  /**
   * Method onDocumentKeydown
   * @method onDocumentKeydown
   *
   * @description
   * List-navigation accelerators: `j` opens the next intervention, `k` the
   * previous one — ignored while typing, while an overlay is open, or with
   * modifier keys held.
   *
   * @access protected
   * @since 7.0.0
   *
   * @param {KeyboardEvent} event - Document-level keydown.
   *
   * @return {void}
   */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== 'j' && event.key !== 'k') return;
    const target: HTMLElement | null = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }
    if (
      this.editDrawerVisible() ||
      this.workItemDrawerVisible() ||
      this.skipDrawerVisible() ||
      this.discoveryDrawerVisible() ||
      this.requestChangesDrawerVisible()
    ) {
      return;
    }
    if (event.key === 'j') this.navigateNext();
    else this.navigatePrev();
  }

  /**
   * Method navigatePrev
   * @method navigatePrev
   *
   * @description
   * Navigates to {@link prevInterventionId}, a no-op when there is none.
   *
   * @access protected
   * @since 3.0.0
   *
   * @return {void}
   */
  protected navigatePrev(): void {
    this.navigateToNeighbour(this.prevInterventionId());
  }

  /**
   * Method navigateNext
   * @method navigateNext
   *
   * @description
   * Navigates to {@link nextInterventionId}, a no-op when there is none.
   *
   * @access protected
   * @since 3.0.0
   *
   * @return {void}
   */
  protected navigateNext(): void {
    this.navigateToNeighbour(this.nextInterventionId());
  }

  /**
   * Method navigateToList
   * @method navigateToList
   *
   * @description
   * Navigates back to the organization's interventions list, offered by the
   * not-found state so it never dead-ends.
   *
   * @access protected
   * @since 6.2.0
   *
   * @return {void}
   */
  protected navigateToList(): void {
    const organizationId = this.organization.selectedOrganization()?.id;
    if (!organizationId) return;
    void this.router.navigate(['/organizations', organizationId, 'interventions']);
  }

  /**
   * Method navigateToNeighbour
   * @method navigateToNeighbour
   *
   * @description
   * Navigates to the given intervention id within the active organization.
   *
   * @access private
   * @since 3.0.0
   *
   * @param {string | null} id - Target intervention id, or null (no-op).
   *
   * @return {void}
   */
  private navigateToNeighbour(id: string | null): void {
    if (!id) return;
    const organizationId = this.organization.selectedOrganization()?.id;
    if (!organizationId) return;
    void this.router.navigate(['/organizations', organizationId, 'interventions', id]);
  }
  //#endregion

  //#region Phase derivation
  /**
   * Method phaseForStatus
   * @method phaseForStatus
   *
   * @description
   * Maps an intervention status to its workspace phase: `execute` (planned,
   * in progress, changes requested), `review` (submitted, published) or
   * `prepare` for every remaining draft-side status.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string | undefined} status - Current intervention status.
   *
   * @returns {'prepare' | 'execute' | 'review'} Phase for the status.
   */
  private phaseForStatus(status: string | undefined): 'prepare' | 'execute' | 'review' {
    if (status === 'planned' || status === 'in_progress' || status === 'changes_requested')
      return 'execute';
    if (status === 'submitted' || status === 'published') return 'review';
    return 'prepare';
  }
  //#endregion
}
