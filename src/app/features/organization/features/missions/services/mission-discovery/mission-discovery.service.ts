import { inject, Injectable } from '@angular/core';
import { ConnectivityService } from '@core/services/connectivity';
import type {
  CreateMissionWorkItemInput,
  MissionDiscoveryRequest,
  MissionDiscoveryResult,
  MissionOutboxQueueEntry,
} from '@features/organization/features/missions/models';
import { MissionFieldExecutionService } from '../mission-field-execution';
import { MissionOfflineService } from '../mission-offline';
import { MissionSyncService } from '../mission-sync';
import { MissionSyncCoordinatorService } from '../mission-sync-coordinator';

/**
 * Coordinates creation of discovered resources and their mission work items.
 */
@Injectable({ providedIn: 'root' })
export class MissionDiscoveryService {
  private readonly fieldExecution: MissionFieldExecutionService = inject(
    MissionFieldExecutionService,
  );
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);
  private readonly offline: MissionOfflineService = inject(MissionOfflineService);
  private readonly sync: MissionSyncService = inject(MissionSyncService);
  private readonly syncCoordinator: MissionSyncCoordinatorService = inject(
    MissionSyncCoordinatorService,
  );

  /**
   * Creates or queues the canonical resource and its discovered work item.
   */
  public async create(
    organizationId: string,
    missionId: string,
    request: MissionDiscoveryRequest & { readonly target: string },
  ): Promise<MissionDiscoveryResult> {
    const resourceClientId = crypto.randomUUID();
    const workItemClientId = crypto.randomUUID();
    const resource = this.fieldExecution.prepareDiscoveryResource(
      organizationId,
      missionId,
      request,
      resourceClientId,
    );
    const workItem: CreateMissionWorkItemInput = {
      clientId: workItemClientId,
      mission: `/api/missions/${missionId}`,
      action: request.action,
      target: resource.targetResource,
      resultResource: resource.resultResource,
      source: 'discovered',
      required: false,
    };
    const operations: readonly MissionOutboxQueueEntry[] = [
      resource,
      { type: 'work-item.create', payload: workItem },
    ];
    const operationIds = await this.offline.queueMany(missionId, operations);

    if (this.connectivity.isOffline()) return { queued: true, workItem };

    try {
      await this.sync.replayOutbox(organizationId, missionId);
      await this.syncCoordinator.refreshStatus();
      const pending = await this.offline.listOutbox(missionId);
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
