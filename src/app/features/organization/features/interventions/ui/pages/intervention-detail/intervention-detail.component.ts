import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { StepperModule } from 'primeng/stepper';
import { TagModule } from 'primeng/tag';
import { ConnectivityService } from '@core/services/connectivity';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionDiscoveryRequest,
  InterventionPhotoAttachment,
  InterventionPlanningDetails,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import {
  InterventionFieldExecutionService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import { InterventionDiscoveryService } from '@features/organization/features/interventions/services/intervention-discovery';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionWorkspaceStore,
  type InterventionWorkspaceStoreType,
} from '@features/organization/features/interventions/state/intervention-workspace';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import { InterventionExecutePanel } from '../../components/intervention-execute-panel/intervention-execute-panel.component';
import { InterventionPreparePanel } from '../../components/intervention-prepare-panel/intervention-prepare-panel.component';
import { InterventionReviewPanel } from '../../components/intervention-review-panel/intervention-review-panel.component';
import { InterventionTag } from '../../components/intervention-tag';

/**
 * Component InterventionDetailPage
 * @class InterventionDetailPage
 *
 * @description
 * Orchestrates the full intervention workspace. Hosts the three-step
 * {@link InterventionPreparePanel}, {@link InterventionExecutePanel} and
 * {@link InterventionReviewPanel} panels, coordinates online/offline field
 * actions (QR scanning, photo upload, discovery creation) and delegates
 * publication to {@link InterventionPublicationService}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-detail-page',
  imports: [
    ButtonModule,
    MessageModule,
    InterventionExecutePanel,
    InterventionPreparePanel,
    InterventionReviewPanel,
    InterventionTag,
    ProgressBarModule,
    SkeletonModule,
    StepperModule,
    TagModule,
  ],
  providers: [InterventionPlanningOptionsStore, InterventionWorkspaceStore],
  templateUrl: './intervention-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionDetailPage {
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

  /**
   * Property store
   * @readonly
   *
   * @description
   * Provides the store value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionWorkspaceStore}
   */
  protected readonly store: InterventionWorkspaceStoreType = inject<InterventionWorkspaceStoreType>(
    InterventionWorkspaceStore,
  );

  /**
   * Property planningOptions
   * @readonly
   *
   * @description
   * Component-scoped store providing site, member and target selector options
   * for the preparation and discovery forms.
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
   * Property activeStep
   * @readonly
   *
   * @description
   * Active workflow step bound to the PrimeNG stepper `value`. Seeded from the
   * intervention status (Prepare → 1, Execute → 2, Review → 3) and writable so
   * the user can navigate freely between phases, while re-deriving whenever the
   * status changes underneath.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly activeStep: WritableSignal<number> = linkedSignal<number>(() =>
    this.stepForStatus(this.store.intervention()?.status),
  );

  /**
   * Property publishing
   * @readonly
   *
   * @description
   * Provides the publishing value.
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
   * Reactive online status, aliased from {@link connectivity} so the
   * template and field actions share the application-wide connectivity
   * source instead of a page-local listener.
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
   * Provides the publication message value.
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
   * Provides the field action busy value.
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
   * Provides the field message value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly fieldMessage: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Available site selector options forwarded to the preparation form.
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
   * Available member selector options forwarded to the preparation form.
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
   * to the work-item and discovery forms.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SelectOption[]>}
   */
  protected readonly targetOptions = this.planningOptions.targets;

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Provides the can submit value.
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
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the class dependencies and reactive behavior.
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
  }

  /**
   * Method planIntervention
   * @method planIntervention
   *
   * @description
   * Executes the plan intervention operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the plan intervention operation.
   */
  protected planIntervention(): void {
    this.store.transition({ interventionId: this.interventionId(), status: 'planned' });
  }

  /**
   * Method saveDetails
   * @method saveDetails
   *
   * @description
   * Executes the save details operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{
   * site: string;
   * responsible: string;
   * participants: readonly string[];
   * priority: InterventionPriority;
   * plannedStartAt: string;
   * dueAt: string;
   * }} planningDetails - planning Details value.
   *
   * @return {void} Result of the save details operation.
   */
  protected saveDetails(planningDetails: InterventionPlanningDetails): void {
    this.store.updateDetails({ interventionId: this.interventionId(), input: planningDetails });
  }

  /**
   * Method createWorkItem
   * @method createWorkItem
   *
   * @description
   * Executes the create work item operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CreateInterventionWorkItemInput} workItemInput - work Item Input value.
   *
   * @return {void} Result of the create work item operation.
   */
  protected createWorkItem(workItemInput: CreateInterventionWorkItemInput): void {
    this.store.createWorkItem({ interventionId: this.interventionId(), input: workItemInput });
  }

  /**
   * Method createDiscovery
   * @method createDiscovery
   *
   * @description
   * Executes the create discovery operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{
   * action: CreateInterventionWorkItemInput['action'];
   * target: string | null;
   * }} event - event value.
   *
   * @return {void} Result of the create discovery operation.
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
      this.fieldMessage.set('Discovery saved as a intervention draft resource.');
    } catch {
      this.fieldMessage.set('The discovered resource could not be saved.');
    } finally {
      this.fieldActionBusy.set(false);
    }
  }

  /**
   * Method scanPhoto
   * @method scanPhoto
   *
   * @description
   * Executes the scan photo operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {File} file - file value.
   *
   * @return {Promise<void>} Result of the scan photo operation.
   */
  protected async scanPhoto(file: File): Promise<void> {
    this.fieldActionBusy.set(true);
    this.fieldMessage.set(null);
    try {
      const scannedValue = await this.fieldExecution.scan(file);
      if (!scannedValue) {
        this.fieldMessage.set(
          'No QR code was detected. Capture it again or add the discovery manually.',
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
        'The QR code could not be read. Capture it again or add the discovery manually.',
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
   * Executes the attach photo operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{ equipmentId: string; file: File }} event - event value.
   *
   * @return {Promise<void>} Result of the attach photo operation.
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
        this.fieldMessage.set('Photo compressed and queued for synchronization.');
        return;
      }
      this.fieldMessage.set('Evidence photo uploaded.');
    } catch {
      this.fieldMessage.set('The evidence photo could not be saved.');
    } finally {
      this.fieldActionBusy.set(false);
    }
  }

  /**
   * Method submitIntervention
   * @method submitIntervention
   *
   * @description
   * Executes the submit intervention operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the submit intervention operation.
   */
  protected submitIntervention(): void {
    this.store.transition({ interventionId: this.interventionId(), status: 'submitted' });
  }

  /**
   * Method requestChanges
   * @method requestChanges
   *
   * @description
   * Executes the request changes operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} reviewNote - review Note value.
   *
   * @return {void} Result of the request changes operation.
   */
  protected requestChanges(reviewNote: string): void {
    this.store.transition({
      interventionId: this.interventionId(),
      status: 'changes_requested',
      reviewNote,
    });
  }

  /**
   * Method updateWorkItem
   * @method updateWorkItem
   *
   * @description
   * Executes the update work item operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{
   * workItemId: string;
   * status: 'planned' | 'in_progress' | 'completed' | 'skipped';
   * skipReason?: string;
   * }} event - event value.
   *
   * @return {void} Result of the update work item operation.
   */
  protected updateWorkItem(event: InterventionWorkItemStatusChange): void {
    this.store.setWorkItemStatus({ interventionId: this.interventionId(), ...event });
  }

  /**
   * Method publishIntervention
   * @method publishIntervention
   *
   * @description
   * Executes the publish intervention operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {Promise<void>} Result of the publish intervention operation.
   */
  protected async publishIntervention(): Promise<void> {
    const intervention = this.store.intervention();
    if (!intervention || !this.online()) {
      this.publicationMessage.set('Connect to the network before publishing this intervention.');
      return;
    }
    this.publishing.set(true);
    this.publicationMessage.set(null);
    try {
      const completed = await this.publication.publish(intervention);
      if (completed.status === 'failed') {
        this.publicationMessage.set(
          completed.error ?? 'Publication failed without applying partial changes.',
        );
        return;
      }
      this.publicationMessage.set('Intervention published successfully.');
      this.store.load(this.interventionId());
    } catch {
      this.publicationMessage.set('The publication request could not be completed.');
    } finally {
      this.publishing.set(false);
    }
  }

  /**
   * Method scanSupported
   * @method scanSupported
   *
   * @description
   * Executes the scan supported operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {boolean} Result of the scan supported operation.
   */
  protected scanSupported(): boolean {
    return this.fieldExecution.scanSupported();
  }

  /**
   * Method stepForStatus
   * @method stepForStatus
   *
   * @description
   * Maps an intervention status to its default stepper index (1: Prepare,
   * 2: Execute, 3: Review), used to seed the {@link activeStep} signal on
   * initial load and on status changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | undefined} status - Current intervention status.
   *
   * @returns {number} Default stepper index for the status.
   */
  private stepForStatus(status: string | undefined): number {
    if (status === 'in_progress' || status === 'changes_requested') return 2;
    if (status === 'submitted' || status === 'published') return 3;
    return 1;
  }
}
