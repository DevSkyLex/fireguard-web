import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutboxOperation } from '@features/organization/features/interventions/models';
import { InterventionOfflineService } from '../intervention-offline';
import type { SyncProblemResponse } from './models';

/**
 * Constant HTTP_CONFLICT
 * @const HTTP_CONFLICT
 *
 * @description
 * HTTP status returned when an offline replay hits an already-applied
 * operation.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const HTTP_CONFLICT = 409;

/**
 * Constant HTTP_PRECONDITION_FAILED
 * @const HTTP_PRECONDITION_FAILED
 *
 * @description
 * Provides the http precondition failed value.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const HTTP_PRECONDITION_FAILED = 412;

const PERMANENT_FAILURE_STATUSES: ReadonlySet<number> = new Set([400, 403, 409, 422]);

/**
 * Constant CLIENT_RESOURCE_ALREADY_EXISTS_PROBLEM_TYPE
 * @const CLIENT_RESOURCE_ALREADY_EXISTS_PROBLEM_TYPE
 *
 * @description
 * Stable RFC 7807 problem type returned when an idempotent client resource
 * creation was already applied server-side.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const CLIENT_RESOURCE_ALREADY_EXISTS_PROBLEM_TYPE = '/problems/client-resource-already-exists';

/**
 * Service InterventionSyncService
 * @class InterventionSyncService
 *
 * @description
 * Outbox replay service for intervention offline workflows.
 *
 * Replays queued intervention operations against the API in their original field
 * entry order, dequeuing operations the server already applied (idempotent
 * `409 Conflict` responses) and stopping on any other failure so the outbox
 * stays consistent.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionSyncService {
  //#region Properties
  /**
   * Property service
   * @readonly
   *
   * @description
   * Intervention data-access service used to replay queued operations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionService}
   */
  private readonly service: InterventionService = inject(InterventionService);

  /**
   * Property facilities
   * @readonly
   *
   * @description
   * Provides the facilities value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FacilityService}
   */
  private readonly facilities: FacilityService = inject(FacilityService);

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Provides the equipment value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EquipmentService}
   */
  private readonly equipment: EquipmentService = inject(EquipmentService);

  /**
   * Property inspections
   * @readonly
   *
   * @description
   * Provides the inspections value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InspectionService}
   */
  private readonly inspections: InspectionService = inject(InspectionService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Offline persistence service owning the operation outbox.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

  /**
   * Active replay promises keyed by intervention to prevent concurrent duplicate replays.
   */
  private readonly activeReplays: Map<string, Promise<number>> = new Map();
  //#endregion

  //#region Methods
  /**
   * Method replayOutbox
   * @method replayOutbox
   *
   * @description
   * Replays every queued operation of a intervention sequentially, preserving
   * field entry order, and removes each replayed operation from the outbox.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} interventionId - Intervention identifier.
   *
   * @return {Promise<number>} A promise resolving with the number of replayed operations.
   */
  public async replayOutbox(organizationId: string, interventionId: string): Promise<number> {
    const activeReplay = this.activeReplays.get(interventionId);
    if (activeReplay) return activeReplay;

    const replay = this.replayInterventionOutbox(organizationId, interventionId).finally(() => {
      if (this.activeReplays.get(interventionId) === replay)
        this.activeReplays.delete(interventionId);
    });
    this.activeReplays.set(interventionId, replay);
    return replay;
  }

  /**
   * Replays a intervention outbox after intervention-level serialization has been acquired.
   */
  private async replayInterventionOutbox(
    organizationId: string,
    interventionId: string,
  ): Promise<number> {
    const operations = await this.offline.listOutbox(interventionId);
    return this.replayOperations(organizationId, operations, 0, 0, new Set<string>());
  }

  /**
   * Method replayOperations
   * @method replayOperations
   *
   * @description
   * Executes the replay operations operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {readonly InterventionOutboxOperation[]} operations - operations value.
   * @param {number} index - index value.
   * @param {number} replayed - replayed value.
   * @param {Set<string>} blockedResources - Resources whose create operation is in conflict.
   *
   * @return {Promise<number>} Result of the replay operations operation.
   */
  private async replayOperations(
    organizationId: string,
    operations: readonly InterventionOutboxOperation[],
    index: number,
    replayed: number,
    blockedResources: Set<string>,
  ): Promise<number> {
    const operation = operations[index];
    if (!operation) return replayed;
    if (operation.status === 'conflict' || operation.status === 'failed') {
      const createdResource = this.createdResource(operation);
      if (createdResource) blockedResources.add(createdResource);
      return this.replayOperations(
        organizationId,
        operations,
        index + 1,
        replayed,
        blockedResources,
      );
    }
    if (this.dependsOnBlockedResource(operation, blockedResources)) {
      return this.replayOperations(
        organizationId,
        operations,
        index + 1,
        replayed,
        blockedResources,
      );
    }

    try {
      await this.replay(organizationId, operation);
      await this.offline.removeOutbox(operation.id);
      return this.replayOperations(
        organizationId,
        operations,
        index + 1,
        replayed + 1,
        blockedResources,
      );
    } catch (error: unknown) {
      const response = error as SyncProblemResponse;
      const detail =
        response.detail ??
        response.error?.detail ??
        (error instanceof Error ? error.message : 'The server rejected this operation.');
      if (
        this.isCreate(operation) &&
        (response.status === HTTP_PRECONDITION_FAILED || response.status === HTTP_CONFLICT) &&
        this.problemType(response) === CLIENT_RESOURCE_ALREADY_EXISTS_PROBLEM_TYPE
      ) {
        await this.offline.removeOutbox(operation.id);
        return this.replayOperations(
          organizationId,
          operations,
          index + 1,
          replayed + 1,
          blockedResources,
        );
      }
      if (response.status === HTTP_PRECONDITION_FAILED) {
        await this.offline.markOutboxConflict(operation.id, detail);
        const createdResource = this.createdResource(operation);
        if (createdResource) blockedResources.add(createdResource);
        return this.replayOperations(
          organizationId,
          operations,
          index + 1,
          replayed,
          blockedResources,
        );
      }
      if (this.isPermanentFailure(error, response)) {
        await this.offline.markOutboxFailed(operation.id, detail);
        const createdResource = this.createdResource(operation);
        if (createdResource) blockedResources.add(createdResource);
        return this.replayOperations(
          organizationId,
          operations,
          index + 1,
          replayed,
          blockedResources,
        );
      }
      throw error;
    }
  }

  /**
   * Method replay
   * @method replay
   *
   * @description
   * Replays one queued outbox operation against the API.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {InterventionOutboxOperation} operation - Queued operation to replay.
   *
   * @return {Promise<void>} A promise resolving once the operation is replayed.
   */
  private async replay(
    organizationId: string,
    operation: InterventionOutboxOperation,
  ): Promise<void> {
    switch (operation.type) {
      case 'facility.create':
        await firstValueFrom(
          this.facilities.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
          ),
        );
        break;
      case 'equipment.create':
        await firstValueFrom(
          this.equipment.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
          ),
        );
        break;
      case 'inspection.create':
        await firstValueFrom(
          this.inspections.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
          ),
        );
        break;
      case 'media.create': {
        const file = operation.payload['file'];
        const equipmentId = operation.payload['equipmentId'];
        const fileName = operation.payload['fileName'];
        if (
          !(file instanceof Blob) ||
          typeof equipmentId !== 'string' ||
          typeof fileName !== 'string'
        ) {
          throw new Error('Invalid offline media operation');
        }
        await firstValueFrom(
          this.equipment.uploadEvidence(
            equipmentId,
            file,
            fileName,
            operation.interventionId,
            operation.payload.clientId,
          ),
        );
        break;
      }
      case 'intervention.update': {
        const revision = operation.payload['revision'];
        const { revision: _revision, clientId: _clientId, ...input } = operation.payload;
        await firstValueFrom(
          this.service.update(
            operation.interventionId,
            input,
            typeof revision === 'number' ? revision : undefined,
          ),
        );
        break;
      }
      case 'work-item.create':
        await firstValueFrom(this.service.createWorkItem(operation.payload));
        break;
      case 'work-item.update': {
        const workItemId = operation.payload['workItemId'];
        const revision = operation.payload['revision'];
        if (typeof workItemId !== 'string') throw new Error('Invalid work item operation');
        const {
          workItemId: _workItemId,
          revision: _revision,
          clientId: _clientId,
          ...input
        } = operation.payload;
        await firstValueFrom(
          this.service.updateWorkItem(
            workItemId,
            input,
            typeof revision === 'number' ? revision : undefined,
          ),
        );
        break;
      }
      case 'change.create':
        await firstValueFrom(this.service.createChange(operation.payload));
        break;
      case 'change.update': {
        const changeId = operation.payload['changeId'];
        const revision = operation.payload['revision'];
        if (typeof changeId !== 'string') throw new Error('Invalid intervention change operation');
        const {
          changeId: _changeId,
          revision: _revision,
          clientId: _clientId,
          ...input
        } = operation.payload;
        await firstValueFrom(
          this.service.updateChange(
            changeId,
            input,
            typeof revision === 'number' ? revision : undefined,
          ),
        );
        break;
      }
    }
  }

  /**
   * Method isCreate
   * @method isCreate
   *
   * @description
   * Executes the is create operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - operation value.
   *
   * @return {boolean} Result of the is create operation.
   */
  private isCreate(operation: InterventionOutboxOperation): boolean {
    return (
      operation.type === 'facility.create' ||
      operation.type === 'equipment.create' ||
      operation.type === 'inspection.create' ||
      operation.type === 'work-item.create' ||
      operation.type === 'change.create'
    );
  }

  /**
   * Method problemType
   * @method problemType
   *
   * @description
   * Resolves the RFC 7807 problem type from direct and wrapped HTTP errors.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {SyncProblemResponse} response - HTTP problem response.
   *
   * @return {string | undefined} Stable problem type when present.
   */
  private problemType(response: SyncProblemResponse): string | undefined {
    return response.type ?? response.error?.type;
  }

  /**
   * Determines whether retrying an operation unchanged cannot succeed.
   */
  private isPermanentFailure(error: unknown, response: SyncProblemResponse): boolean {
    return (
      (typeof response.status === 'number' && PERMANENT_FAILURE_STATUSES.has(response.status)) ||
      (error instanceof Error && response.status === undefined)
    );
  }

  /**
   * Resolves the canonical resource created by an outbox operation.
   */
  private createdResource(operation: InterventionOutboxOperation): string | null {
    const clientId = operation.payload['clientId'];
    if (typeof clientId !== 'string') return null;

    return operation.type === 'facility.create'
      ? `/api/facilities/${clientId}`
      : operation.type === 'equipment.create'
        ? `/api/equipment/${clientId}`
        : operation.type === 'inspection.create'
          ? `/api/inspections/${clientId}`
          : operation.type === 'work-item.create'
            ? `/api/intervention-work-items/${clientId}`
            : operation.type === 'change.create'
              ? `/api/intervention-changes/${clientId}`
              : null;
  }

  /**
   * Checks whether an operation references a resource whose creation is in conflict.
   */
  private dependsOnBlockedResource(
    operation: InterventionOutboxOperation,
    blockedResources: ReadonlySet<string>,
  ): boolean {
    if (blockedResources.size === 0) return false;

    return this.containsBlockedResource(operation.payload, blockedResources);
  }

  /**
   * Recursively checks structured operation payloads for blocked resource IRIs.
   */
  private containsBlockedResource(value: unknown, blockedResources: ReadonlySet<string>): boolean {
    if (typeof value === 'string') return blockedResources.has(value);
    if (Array.isArray(value)) {
      return value.some((item: unknown): boolean =>
        this.containsBlockedResource(item, blockedResources),
      );
    }
    if (typeof value !== 'object' || value === null || value instanceof Blob) return false;

    return Object.values(value).some((item: unknown): boolean =>
      this.containsBlockedResource(item, blockedResources),
    );
  }
  //#endregion
}
