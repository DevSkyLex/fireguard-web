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
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ConnectivityService } from '@core/services/connectivity';
import type {
  CreateMissionWorkItemInput,
  MissionDiscoveryRequest,
  MissionPhase,
  MissionPhotoAttachment,
  MissionPlanningDetails,
  MissionWorkItemStatusChange,
} from '@features/organization/features/missions/models';
import {
  MissionOfflineService,
  MissionFieldExecutionService,
  MissionSyncCoordinatorService,
} from '@features/organization/features/missions/services';
import { MissionDiscoveryService } from '@features/organization/features/missions/services/mission-discovery';
import { MissionPublicationService } from '@features/organization/features/missions/services/mission-publication';
import {
  MissionPlanningOptionsStore,
  type MissionPlanningOptionsStoreType,
} from '@features/organization/features/missions/state/mission-planning-options';
import {
  MissionWorkspaceStore,
  type MissionWorkspaceStoreType,
} from '@features/organization/features/missions/state/mission-workspace';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import { MissionExecutePanel } from '../../components/mission-execute-panel/mission-execute-panel.component';
import { MissionPreparePanel } from '../../components/mission-prepare-panel/mission-prepare-panel.component';
import { MissionReviewPanel } from '../../components/mission-review-panel/mission-review-panel.component';

/**
 * Component MissionDetailPage
 * @class MissionDetailPage
 *
 * @description
 * Orchestrates the mission detail page.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mission-detail-page',
  imports: [
    ButtonModule,
    MessageModule,
    MissionExecutePanel,
    MissionPreparePanel,
    MissionReviewPanel,
    ProgressBarModule,
    SkeletonModule,
    TagModule,
    ToolbarModule,
  ],
  providers: [MissionPlanningOptionsStore, MissionWorkspaceStore],
  templateUrl: './mission-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage {
  /**
   * Property missionId
   * @readonly
   *
   * @description
   * Provides the mission id value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly missionId: InputSignal<string> = input.required<string>();

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
   * @type {MissionWorkspaceStore}
   */
  protected readonly store: MissionWorkspaceStoreType = inject(MissionWorkspaceStore);

  protected readonly planningOptions: MissionPlanningOptionsStoreType = inject(
    MissionPlanningOptionsStore,
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
   * @type {MissionOfflineService}
   */
  protected readonly offline: MissionOfflineService = inject(MissionOfflineService);

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
   * @type {MissionSyncCoordinatorService}
   */
  protected readonly sync: MissionSyncCoordinatorService = inject(MissionSyncCoordinatorService);

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
  protected readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property activePhase
   * @readonly
   *
   * @description
   * Provides the active phase value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<MissionPhase>}
   */
  protected readonly activePhase: WritableSignal<MissionPhase> = linkedSignal<MissionPhase>(() =>
    this.phaseForStatus(this.store.mission()?.status),
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
  protected readonly publishing = signal(false);

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
  protected readonly fieldActionBusy: WritableSignal<boolean> = signal(false);

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
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Provides the site options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly { label: string; value: string }[]>}
   */
  protected readonly siteOptions = this.planningOptions.sites;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Provides the member options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly { label: string; value: string }[]>}
   */
  protected readonly memberOptions = this.planningOptions.members;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property targetOptions
   * @readonly
   *
   * @description
   * Provides the target options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly { label: string; value: string }[]>}
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
  protected readonly canSubmit: Signal<boolean> = computed(() => {
    const mission = this.store.mission();
    const organizationId = this.organization.selectedOrganization()?.id;
    const memberId = this.memberAccess.profile()?.id;
    return (
      !!mission &&
      !!organizationId &&
      !!memberId &&
      mission.responsible === `/api/organizations/${organizationId}/members/${memberId}`
    );
  });

  /**
   * Coordinates discovered resource and work-item creation.
   */
  private readonly discovery: MissionDiscoveryService = inject(MissionDiscoveryService);

  /**
   * Coordinates asynchronous mission publication.
   */
  private readonly publication: MissionPublicationService = inject(MissionPublicationService);

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
   * @type {MissionFieldExecutionService}
   */
  private readonly fieldExecution: MissionFieldExecutionService = inject(
    MissionFieldExecutionService,
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
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

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
      this.store.load(this.missionId());
    });
    effect(() => {
      this.planningOptions.loadWorkspaceOptions(
        this.organization.selectedOrganization()?.id ?? null,
      );
    });
  }

  /**
   * Method selectPhase
   * @method selectPhase
   *
   * @description
   * Executes the select phase operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MissionPhase} phase - phase value.
   *
   * @return {void} Result of the select phase operation.
   */
  protected selectPhase(phase: MissionPhase): void {
    this.activePhase.set(phase);
  }

  /**
   * Method planMission
   * @method planMission
   *
   * @description
   * Executes the plan mission operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the plan mission operation.
   */
  protected planMission(): void {
    this.store.transition({ missionId: this.missionId(), status: 'planned' });
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
   * priority: MissionPriority;
   * plannedStartAt: string;
   * dueAt: string;
   * }} planningDetails - planning Details value.
   *
   * @return {void} Result of the save details operation.
   */
  protected saveDetails(planningDetails: MissionPlanningDetails): void {
    this.store.updateDetails({ missionId: this.missionId(), input: planningDetails });
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
   * @param {CreateMissionWorkItemInput} workItemInput - work Item Input value.
   *
   * @return {void} Result of the create work item operation.
   */
  protected createWorkItem(workItemInput: CreateMissionWorkItemInput): void {
    this.store.createWorkItem({ missionId: this.missionId(), input: workItemInput });
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
   * action: CreateMissionWorkItemInput['action'];
   * target: string | null;
   * }} event - event value.
   *
   * @return {void} Result of the create discovery operation.
   */
  protected async createDiscovery(event: MissionDiscoveryRequest): Promise<void> {
    this.fieldMessage.set(null);
    const organizationId = this.organization.selectedOrganization()?.id;
    const target = event.target?.trim();
    if (!organizationId || !target) return;

    this.fieldActionBusy.set(true);
    try {
      const discovery = await this.discovery.create(organizationId, this.missionId(), {
        ...event,
        target,
      });
      if (discovery.queued) {
        await this.store.recordQueuedDiscovery(discovery.workItem);
      } else this.store.load(this.missionId());
      this.fieldMessage.set('Discovery saved as a mission draft resource.');
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
  protected async attachPhoto(event: MissionPhotoAttachment): Promise<void> {
    this.fieldActionBusy.set(true);
    this.fieldMessage.set(null);
    try {
      const queued = await this.fieldExecution.attachPhoto(
        this.missionId(),
        event.equipmentId,
        event.file,
      );
      if (queued) {
        await this.store.touchOfflineMission();
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
   * Method submitMission
   * @method submitMission
   *
   * @description
   * Executes the submit mission operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the submit mission operation.
   */
  protected submitMission(): void {
    this.store.transition({ missionId: this.missionId(), status: 'submitted' });
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
      missionId: this.missionId(),
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
  protected updateWorkItem(event: MissionWorkItemStatusChange): void {
    this.store.setWorkItemStatus({ missionId: this.missionId(), ...event });
  }

  /**
   * Method publishMission
   * @method publishMission
   *
   * @description
   * Executes the publish mission operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {Promise<void>} Result of the publish mission operation.
   */
  protected async publishMission(): Promise<void> {
    const mission = this.store.mission();
    if (!mission || !this.online()) {
      this.publicationMessage.set('Connect to the network before publishing this mission.');
      return;
    }
    this.publishing.set(true);
    this.publicationMessage.set(null);
    try {
      const completed = await this.publication.publish(mission);
      if (completed.status === 'failed') {
        this.publicationMessage.set(
          completed.error ?? 'Publication failed without applying partial changes.',
        );
        return;
      }
      this.publicationMessage.set('Mission published successfully.');
      this.store.load(this.missionId());
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
   * Resolves the default workspace phase for a mission status.
   */
  private phaseForStatus(status: string | undefined): MissionPhase {
    if (status === 'in_progress' || status === 'changes_requested') return 'execute';
    if (status === 'submitted' || status === 'published') return 'review';
    return 'prepare';
  }
}
