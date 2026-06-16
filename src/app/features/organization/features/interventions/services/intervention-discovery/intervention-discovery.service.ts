import { inject, Injectable } from '@angular/core';
import { ConnectivityService } from '@core/services/connectivity';
import type {
  CreateInterventionWorkItemInput,
  InterventionDiscoveryRequest,
  InterventionDiscoveryResult,
  InterventionOutboxQueueEntry,
} from '@features/organization/features/interventions/models';
import { InterventionFieldExecutionService } from '../intervention-field-execution';
import { InterventionOfflineService } from '../intervention-offline';
import { InterventionSyncService } from '../intervention-sync';
import { InterventionSyncCoordinatorService } from '../intervention-sync-coordinator';

/**
 * Coordinates creation of discovered resources and their intervention work items.
 */
@Injectable({ providedIn: 'root' })
export class InterventionDiscoveryService {
  /** Property fieldExecution. @readonly @description Prepares field discovery resources. @access private @since 1.0.0 @type {InterventionFieldExecutionService} */
  private readonly fieldExecution: InterventionFieldExecutionService = inject(
    InterventionFieldExecutionService,
  );
  /** Property connectivity. @readonly @description Provides the current connectivity state. @access private @since 1.0.0 @type {ConnectivityService} */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);
  /** Property offline. @readonly @description Persists offline intervention changes. @access private @since 1.0.0 @type {InterventionOfflineService} */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);
  /** Property sync. @readonly @description Synchronizes intervention resources. @access private @since 1.0.0 @type {InterventionSyncService} */
  private readonly sync: InterventionSyncService = inject(InterventionSyncService);
  /** Property syncCoordinator. @readonly @description Coordinates background synchronization. @access private @since 1.0.0 @type {InterventionSyncCoordinatorService} */
  private readonly syncCoordinator: InterventionSyncCoordinatorService = inject(
    InterventionSyncCoordinatorService,
  );

  /**
   * Creates or queues the canonical resource and its discovered work item.
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
   * Normalizes a scanned equipment value to its canonical IRI when possible.
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
}
