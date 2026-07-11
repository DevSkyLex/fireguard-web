import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type ElementRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { ConnectivityService } from '@core/connectivity';
import { isCallPending } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionActivityOutput,
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
  InterventionStore,
  type ActiveInterventionStoreType,
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
  InterventionPriorityIcon,
  InterventionTag,
} from '@features/organization/features/interventions/ui/components';
import { InterventionChangeDiff } from '@features/organization/features/interventions/ui/components/intervention-change-diff';
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
  interventionLifecycleProgress,
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
  ProgressRing,
  type ActivityFeedItem,
  type AvatarStackPerson,
} from '@shared/components';
import type { InterventionCommandAction } from './models';

/**
 * Component InterventionDetailPage
 * @class InterventionDetailPage
 *
 * @description
 * Route entry page for one intervention, laid out Linear-style: a top bar
 * (back navigation, code, prev/next, the canonical forward action), a wide
 * main column (identity, blockers, description, work-item checklist,
 * execute/table/change accordions, activity) and a narrow "Properties"
 * sidebar (status, priority, assignees, schedule, labels, revision,
 * publication). It orchestrates the same field workflow the previous
 * three-panel layout did — online/offline field actions, discovery,
 * publication polling — through the unchanged {@link InterventionWorkspaceStore}
 * and services; every child it composes stays presentational.
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
    InterventionPriorityIcon,
    InterventionReadinessChecklist,
    InterventionRequestChangesDrawer,
    InterventionSkipDrawer,
    InterventionTag,
    InterventionWorkItemDrawer,
    MenuModule,
    MessageModule,
    MultiSelectModule,
    ProgressRing,
    ReactiveFormsModule,
    SkeletonModule,
  ],
  providers: [InterventionPlanningOptionsStore, InterventionWorkspaceStore],
  templateUrl: './intervention-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
   * Property overflowMenu
   * @readonly
   *
   * @description
   * Top bar's secondary-actions popup menu (Abandon).
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly overflowMenu: Signal<Menu> = viewChild.required<Menu>('overflowMenu');

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
            label: $localize`:@@intervention.exec.checkResolved:All field work resolved`,
            done: this.store.progress() >= 100,
          },
          {
            label: $localize`:@@intervention.exec.checkResponsible:You are the responsible agent`,
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
   * The single canonical forward action for the current phase, surfaced in
   * the top bar: "Plan intervention" (prepare), "Submit for review"
   * (execute) or "Publish intervention" (review). Returns null when the
   * current user lacks the phase capability.
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
            loading: saving,
          };
        }
        case 'execute': {
          if (!this.canExecute()) return null;
          const ready: boolean = this.canSubmit() && this.store.progress() >= 100;
          return {
            label: $localize`:@@intervention.exec.submitTitle:Submit for review`,
            icon: 'pi pi-send',
            disabled: !ready,
            loading: saving || this.fieldActionBusy(),
          };
        }
        case 'review': {
          if (!this.canPublish()) return null;
          const ready: boolean =
            this.online() &&
            intervention.status === 'submitted' &&
            (intervention.blockersCount ?? 0) === 0;
          return {
            label: $localize`:@@intervention.review.publish:Publish intervention`,
            icon: 'pi pi-check-circle',
            disabled: !ready,
            loading: saving || this.publishing(),
          };
        }
      }
    });

  /**
   * Property priorityLabel
   * @readonly
   *
   * @description
   * Localized label for the intervention's priority, resolved from the tag
   * registry. Rendered as plain text next to the design priority glyph so the
   * sidebar shows a single priority indicator (the bars) rather than doubling
   * it with the registry's flag badge.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly priorityLabel: Signal<string> = computed((): string => {
    const priority: InterventionOutput['priority'] | undefined =
      this.store.intervention()?.priority;

    return priority ? resolveInterventionTag('priority', priority).label : '';
  });

  /**
   * Property lifecycleProgress
   * @readonly
   *
   * @description
   * How far the intervention has advanced through its workflow (0–100),
   * derived from the status rather than work-item completion, so the status
   * ring always reflects meaningful progression even before work items exist.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly lifecycleProgress: Signal<number> = computed((): number => {
    const status: InterventionOutput['status'] | undefined = this.store.intervention()?.status;

    return status ? interventionLifecycleProgress(status) : 0;
  });

  /**
   * Property statusLabel
   * @readonly
   *
   * @description
   * Localized label for the current status, used as the status ring's
   * accessible name.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly statusLabel: Signal<string> = computed((): string => {
    const status: InterventionOutput['status'] | undefined = this.store.intervention()?.status;

    return status ? resolveInterventionTag('status', status).label : '';
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
   * mirrors the loaded intervention into {@link activeIntervention}, and
   * fetches the activity timeline once per freshly loaded intervention.
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
      case 'execute':
        this.submitIntervention();
        break;
      case 'review':
        void this.publishIntervention();
        break;
    }
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
    this.store.transition({
      interventionId: this.interventionId(),
      status: 'changes_requested',
      reviewNote: values.note,
    });
    this.requestChangesDrawerVisible.set(false);
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
        this.publicationMessage.set(
          completed.error ??
            $localize`:@@intervention.publishFailed:Publication failed without applying partial changes.`,
        );
        return;
      }
      this.publicationMessage.set(
        $localize`:@@intervention.publication.success:Intervention published successfully.`,
      );
      this.store.load(this.interventionId());
    } catch {
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

  /**
   * Method onOverflowMenuToggle
   * @method onOverflowMenuToggle
   *
   * @description
   * Toggles the top bar's secondary-actions menu.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {MouseEvent} event - Click event from the overflow control.
   *
   * @return {void}
   */
  protected onOverflowMenuToggle(event: MouseEvent): void {
    this.overflowMenu().toggle(event);
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

  //#region Top bar navigation
  /**
   * Method navigateBack
   * @method navigateBack
   *
   * @description
   * Navigates to the organization's interventions list.
   *
   * @access protected
   * @since 3.0.0
   *
   * @return {void}
   */
  protected navigateBack(): void {
    const organizationId = this.organization.selectedOrganization()?.id;
    if (!organizationId) return;
    void this.router.navigate(['/organizations', organizationId, 'interventions']);
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
