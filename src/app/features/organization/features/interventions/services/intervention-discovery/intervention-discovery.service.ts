import { inject, Injectable } from '@angular/core';
import { ConnectivityService } from '@core/services/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionDiscoveryRequest,
  InterventionDiscoveryResult,
  InterventionOutboxQueueEntry,
} from '@features/organization/features/interventions/models';
import { InterventionFieldExecutionService } from '../intervention-field-execution';
import { InterventionSyncService } from '../intervention-sync';
import { InterventionSyncCoordinatorService } from '../intervention-sync-coordinator';

/**
 * Service InterventionDiscoveryService
 * @class InterventionDiscoveryService
 *
 * @description
 * Coordinates creation of discovered field resources and their associated
 * intervention work items. Atomically queues the canonical resource operation
 * and the work-item creation into the offline outbox, then immediately replays
 * both when connectivity is available.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionDiscoveryService {
  //#region Properties
  /**
   * Property fieldExecution
   * @readonly
   *
   * @description
   * Prepares the canonical resource operation (facility, equipment or
   * inspection) for a field discovery request.
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
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared connectivity source of truth used to decide whether to replay
   * the outbox immediately after queuing.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Offline persistence service that owns the operation outbox.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

  /**
   * Property sync
   * @readonly
   *
   * @description
   * Outbox replay service used to synchronize queued operations when online.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionSyncService}
   */
  private readonly sync: InterventionSyncService =
    inject<InterventionSyncService>(InterventionSyncService);

  /**
   * Property syncCoordinator
   * @readonly
   *
   * @description
   * Coordinator used to refresh the global sync status after replay.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionSyncCoordinatorService}
   */
  private readonly syncCoordinator: InterventionSyncCoordinatorService = inject(
    InterventionSyncCoordinatorService,
  );
  //#endregion

  //#region Methods

  /**
   * Method create
   * @method create
   *
   * @description
   * Atomically queues the canonical resource operation and the associated
   * work item, then immediately replays the outbox when online. Returns a
   * result indicating whether the operations are still queued or were
   * applied server-side.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} interventionId - Active intervention identifier.
   * @param {InterventionDiscoveryRequest & { readonly target: string }} request - Field discovery request with a non-null target.
   *
   * @returns {Promise<InterventionDiscoveryResult>} Whether the discovery was queued or applied.
   */
  public async create(
    organizationId: string,
    interventionId: string,
    request: InterventionDiscoveryRequest & { readonly target: string },
  ): Promise<InterventionDiscoveryResult> {
    const resourceClientId = crypto.randomUUID();
    const workItemClientId = crypto.randomUUID();
    const resource = this.fieldExecution.prepareDiscoveryResource(
      organizationId,
      interventionId,
      request,
      resourceClientId,
    );
    const workItem: CreateInterventionWorkItemInput = {
      clientId: workItemClientId,
      intervention: `/api/interventions/${interventionId}`,
      action: request.action,
      target: resource.targetResource,
      resultResource: resource.resultResource,
      source: 'discovered',
      required: false,
    };
    const operations: readonly InterventionOutboxQueueEntry[] = [
      resource,
      { type: 'work-item.create', payload: workItem },
    ];
    const operationIds = await this.offline.queueMany(interventionId, operations);

    if (this.connectivity.isOffline()) return { queued: true, workItem };

    try {
      await this.sync.replayOutbox(organizationId, interventionId);
      await this.syncCoordinator.refreshStatus();
      const pending = await this.offline.listOutbox(interventionId);
      const queued = pending.some((operation) => operationIds.includes(operation.id));
      return { queued, workItem };
    } catch {
      return { queued: true, workItem };
    }
  }

  /**
   * Method normalizeScannedTarget
   * @method normalizeScannedTarget
   *
   * @description
   * Normalizes a scanned QR value to its canonical equipment IRI when
   * possible. Handles bare UUIDs, relative IRIs and full URLs.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} value - Raw scanned QR value.
   *
   * @returns {string} Canonical IRI when recognized, or the original value.
   */
  public normalizeScannedTarget(value: string): string {
    const trimmed = value.trim();
    if (/^\/api\/equipment\/[^/?#]+$/.test(trimmed)) return trimmed;
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(trimmed)) return `/api/equipment/${trimmed}`;
    try {
      const url = new URL(trimmed);
      if (/^\/api\/equipment\/[^/?#]+$/.test(url.pathname)) return url.pathname;
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  //#endregion
}
