import { inject, Service } from '@angular/core';
import { Dispatcher } from '@ngrx/signals/events';
import { firstValueFrom } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import {
  InterventionOfflineService,
  InterventionService,
  InterventionTimeService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionCollectionsChange,
  InterventionOutboxOperation,
} from '@features/organization/features/interventions/models';
import { workloadAssessmentFromError } from '@features/organization/features/workload/utils';
import {
  CLIENT_RESOURCE_ALREADY_EXISTS_PROBLEM_TYPE,
  HTTP_CONFLICT,
  HTTP_PRECONDITION_FAILED,
  HTTP_SERVER_ERROR,
  PERMANENT_FAILURE_STATUSES,
} from './constants';
import { interventionSyncEvents } from './events';
import type { SyncProblemResponse } from './models';

/**
 * Detail surfaced on a queued operation whose parent resource can never be
 * created (its create is permanently failed or conflicted). Marking the
 * dependent `failed` makes an otherwise invisible, permanently-stuck operation
 * visible and actionable (retry after resolving the parent, or discard).
 */
const DEPENDENCY_UNAVAILABLE_DETAIL =
  'A resource this change depends on could not be created. Resolve the blocked operation it depends on, then retry.';

/**
 * Resources whose replay left a dependent-blocking marker in the current cycle.
 * `permanent` resources come from a failed/conflicted create and can never
 * appear on their own, so their dependents are surfaced as `failed`.
 * `transient` resources come from a retriable 5xx and will be re-attempted next
 * cycle, so their dependents stay `pending`.
 */
interface BlockedResources {
  readonly permanent: Set<string>;
  readonly transient: Set<string>;
}

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
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionSyncService {
  /**
   * Property dispatcher
   * @readonly
   * @description Publishes cross-layer consequences; this service never listens to its own group.
   * @access private
   * @since 1.0.0
   * @type {Dispatcher}
   */
  private readonly dispatcher: Dispatcher = inject(Dispatcher);

  /**
   * Property time
   * @readonly
   *
   * @description
   * Independent journal transport for idempotent time replay.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionTimeService}
   */
  private readonly time: InterventionTimeService = inject(InterventionTimeService);
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
  private readonly service: InterventionService = inject<InterventionService>(InterventionService);

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
  private readonly facilities: FacilityService = inject<FacilityService>(FacilityService);

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
  private readonly equipment: EquipmentService = inject<EquipmentService>(EquipmentService);

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
  private readonly inspections: InspectionService = inject<InspectionService>(InspectionService);

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
  private readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

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
   * Replays every queued operation of an intervention sequentially, preserving
   * field entry order, and removes each replayed operation from the outbox.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} interventionId - Intervention identifier.
   *
   * @returns {Promise<number>} A promise resolving with the number of replayed operations.
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
   * Method replayInterventionOutbox
   * @method replayInterventionOutbox
   *
   * @description
   * Replays an outbox after intervention-level serialization has been acquired.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} interventionId - Intervention identifier.
   * @returns {Promise<number>} Number of operations effectively replayed.
   */
  private async replayInterventionOutbox(
    organizationId: string,
    interventionId: string,
  ): Promise<number> {
    const operations = await this.offline.listOutbox(interventionId);
    const collections = new Set<InterventionCollectionsChange['collections'][number]>();
    const applied = (operation: InterventionOutboxOperation): void => {
      switch (operation.type) {
        case 'time-entry.create':
        case 'time-entry.correct':
        case 'time-entry.cancel':
          collections.add('workItems');
          break;
        case 'work-item.create':
        case 'work-item.update':
          collections.add('workItems');
          collections.add('changes');
          break;
        case 'change.create':
        case 'change.update':
          collections.add('changes');
          break;
        case 'intervention.update':
          collections.add('workItems');
          collections.add('changes');
          collections.add('activity');
          break;
        case 'comment.create':
          collections.add('activity');
          break;
        case 'facility.create':
          collections.add('facilities');
          collections.add('workItems');
          break;
        case 'equipment.create':
          collections.add('equipment');
          collections.add('workItems');
          break;
        case 'inspection.create':
          collections.add('inspections');
          collections.add('workItems');
          break;
        case 'media.create':
          collections.add('equipment');
          break;
        case 'attachment.upload':
          collections.add('attachments');
          collections.add('workItems');
          break;
      }
    };
    try {
      return await this.replayOperations(
        organizationId,
        operations,
        0,
        0,
        {
          permanent: new Set<string>(),
          transient: new Set<string>(),
        },
        applied,
      );
    } finally {
      if (collections.size)
        this.dispatcher.dispatch(
          interventionSyncEvents.replaySucceeded({
            interventionId,
            source: 'replayed',
            collections: [...collections],
          }),
        );
    }
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
   * @param {BlockedResources} blocked - Resources blocking their dependents this cycle.
   * @param {(operation: InterventionOutboxOperation) => void} applied - Records affected collections.
   *
   * @returns {Promise<number>} Result of the replay operations operation.
   */
  private async replayOperations(
    organizationId: string,
    operations: readonly InterventionOutboxOperation[],
    index: number,
    replayed: number,
    blocked: BlockedResources,
    applied: (operation: InterventionOutboxOperation) => void,
  ): Promise<number> {
    const operation = operations[index];
    if (!operation) return replayed;

    const advance = (next: number): Promise<number> =>
      this.replayOperations(organizationId, operations, index + 1, next, blocked, applied);

    // A previously failed/conflicted operation keeps permanently blocking its
    // dependents until the user retries or discards it.
    if (operation.status === 'conflict' || operation.status === 'failed') {
      this.block(operation, blocked.permanent);
      return advance(replayed);
    }

    // A dependent of a permanently blocked resource can never succeed on its
    // own: surface it as `failed` (so it is counted and actionable instead of
    // sitting invisibly `pending`) and cascade the permanent block onward.
    if (this.dependsOnBlockedResource(operation, blocked.permanent)) {
      await this.offline.markOutboxFailed(operation.id, DEPENDENCY_UNAVAILABLE_DETAIL);
      this.block(operation, blocked.permanent);
      return advance(replayed);
    }

    // A dependent of a transiently blocked (5xx) resource must stay `pending`
    // so it retries next cycle once the parent is created; cascade the
    // transient block so its own dependents also wait rather than fail.
    if (this.dependsOnBlockedResource(operation, blocked.transient)) {
      this.block(operation, blocked.transient);
      return advance(replayed);
    }

    try {
      await this.replay(organizationId, operation);
      await this.offline.removeOutbox(operation.id);
      applied(operation);
      return advance(replayed + 1);
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
        applied(operation);
        return advance(replayed + 1);
      }
      const assessment =
        workloadAssessmentFromError(error) ?? workloadAssessmentFromError(response.error);
      if (response.status === HTTP_CONFLICT && assessment) {
        await this.offline.markOutboxConflict(operation.id, detail, assessment);
        this.block(operation, blocked.permanent);
        return advance(replayed);
      }
      if (response.status === HTTP_PRECONDITION_FAILED) {
        if (
          operation.type.startsWith('time-entry.') ||
          (operation.type === 'intervention.update' &&
            ('plannedStartAt' in operation.payload ||
              'dueAt' in operation.payload ||
              'status' in operation.payload ||
              'responsible' in operation.payload ||
              'participants' in operation.payload)) ||
          (operation.type === 'work-item.update' &&
            ('assignee' in operation.payload ||
              'remainingMinutes' in operation.payload ||
              'estimatedMinutes' in operation.payload ||
              'workStartsOn' in operation.payload ||
              'workEndsOn' in operation.payload))
        ) {
          const review = await this.currentValues(operation);
          await this.offline.markOutboxConflict(operation.id, detail, null, review);
          this.block(operation, blocked.permanent);
          return advance(replayed);
        }
        // A stale-revision conflict would otherwise loop forever on retry (the
        // same If-Match is re-sent). Re-fetch the current server revision and
        // rebase the queued payload so a retry sends a valid If-Match; fall back
        // to a plain conflict mark when the revision cannot be resolved (the
        // re-fetch failed, or the operation carries no revision to rebase).
        const rebasedRevision = await this.currentRevision(operation);
        if (rebasedRevision !== null) {
          await this.offline.rebaseOutboxRevision(operation.id, rebasedRevision, detail);
        } else {
          await this.offline.markOutboxConflict(operation.id, detail);
        }
        this.block(operation, blocked.permanent);
        return advance(replayed);
      }
      if (this.isPermanentFailure(error, response)) {
        await this.offline.markOutboxFailed(operation.id, detail);
        this.block(operation, blocked.permanent);
        return advance(replayed);
      }
      if (typeof response.status === 'number' && response.status >= HTTP_SERVER_ERROR) {
        // A transient server error (5xx) on one operation must not freeze the
        // rest of the queue: leave this one pending (it retries next cycle),
        // transiently block its created resource so dependents wait without
        // being failed, and keep replaying the others instead of aborting.
        this.block(operation, blocked.transient);
        return advance(replayed);
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
   * @returns {Promise<void>} A promise resolving once the operation is replayed.
   */
  private async replay(
    organizationId: string,
    operation: InterventionOutboxOperation,
  ): Promise<void> {
    switch (operation.type) {
      case 'time-entry.create':
        await firstValueFrom(
          this.time.createEntry(operation.payload.workItemId, {
            id: operation.payload.id,
            memberId: operation.payload.memberId,
            workedOn: operation.payload.workedOn,
            minutes: operation.payload.minutes,
            note: operation.payload.note,
          }),
        );
        break;
      case 'time-entry.correct':
        await firstValueFrom(
          this.time.correctEntry(
            operation.payload.workItemId,
            {
              id: operation.payload.id,
              memberId: operation.payload.memberId,
              workedOn: operation.payload.workedOn,
              minutes: operation.payload.minutes,
              note: operation.payload.note,
            },
            operation.payload.revision,
          ),
        );
        break;
      case 'time-entry.cancel':
        await firstValueFrom(
          this.time.cancelEntry(
            operation.payload.workItemId,
            operation.payload.id,
            operation.payload.revision,
          ),
        );
        break;
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
      case 'attachment.upload': {
        const file = operation.payload['file'];
        const fileName = operation.payload['fileName'];
        if (!(file instanceof Blob) || typeof fileName !== 'string') {
          throw new Error('Invalid offline attachment operation');
        }
        await firstValueFrom(
          this.service.uploadAttachment(
            operation.interventionId,
            file,
            fileName,
            operation.payload.label,
            operation.payload.workItemId,
            operation.payload.kind,
            operation.payload.clientId, // multipart idempotency key: a crash replay returns the existing attachment
          ),
        );
        break;
      }
      case 'comment.create': {
        const body = operation.payload['body'];
        if (typeof body !== 'string') throw new Error('Invalid offline comment operation');
        const clientId = operation.payload['clientId'];
        await firstValueFrom(
          this.service.addComment(
            operation.interventionId,
            body,
            typeof clientId === 'string' ? clientId : undefined,
          ),
        );
        break;
      }
      case 'intervention.update': {
        const revision = operation.payload['revision'];
        const {
          revision: _revision,
          clientId: _clientId,
          plannedStartAt,
          dueAt,
          ...input
        } = operation.payload;
        await firstValueFrom(
          this.service.update(
            operation.interventionId,
            {
              ...input,
              // Outbox payloads persist dates as ISO strings; rehydrate them
              // to `Date` for the typed update contract.
              ...(plannedStartAt !== undefined
                ? { plannedStartAt: plannedStartAt ? new Date(plannedStartAt) : null }
                : {}),
              ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
            },
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
   * Method createdResource
   * @method createdResource
   *
   * @description
   * Resolves the canonical resource created by an outbox operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Outbox entry with a client identifier.
   * @returns {string | null} Canonical resource path when the operation creates one.
   */
  private createdResource(operation: InterventionOutboxOperation): string | null {
    const clientId = operation.payload['clientId'];
    if (typeof clientId !== 'string') return null;

    switch (operation.type) {
      case 'facility.create':
        return `/api/facilities/${clientId}`;
      case 'equipment.create':
        return `/api/equipment/${clientId}`;
      case 'inspection.create':
        return `/api/inspections/${clientId}`;
      case 'work-item.create':
        return `/api/intervention-work-items/${clientId}`;
      case 'change.create':
        return `/api/intervention-changes/${clientId}`;
      default:
        return null;
    }
  }

  /**
   * Method block
   * @method block
   *
   * @description
   * Blocks the resource created or modified by a conflicted operation so later
   * dependent writes cannot replay against stale task or time-entry data.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Operation that could not replay.
   * @param {Set<string>} resources - Resource identifiers to block in this replay.
   * @returns {void}
   */
  private block(operation: InterventionOutboxOperation, resources: Set<string>): void {
    if (operation.type.startsWith('time-entry.') && 'id' in operation.payload)
      resources.add(`/api/time-entries/${operation.payload.id}`);
    if (operation.type === 'work-item.update')
      resources.add(`/api/intervention-work-items/${operation.payload.workItemId}`);
    const createdResource = this.createdResource(operation);
    if (createdResource) resources.add(createdResource);
  }

  /**
   * Re-fetches the current server revision of the resource an update operation
   * targets, so a stale-revision conflict can be rebased. Returns `null` for
   * non-update operations, when the target can no longer be found, or when the
   * re-fetch itself fails (offline mid-replay) — the caller then falls back to
   * a plain conflict mark.
   */
  private async currentRevision(operation: InterventionOutboxOperation): Promise<number | null> {
    try {
      switch (operation.type) {
        case 'intervention.update': {
          const intervention = await firstValueFrom(this.service.get(operation.interventionId));
          return intervention.revision;
        }
        case 'work-item.update': {
          const workItemId = operation.payload['workItemId'];
          const items = await firstValueFrom(
            this.service.listAllWorkItems(operation.interventionId),
          );
          return items.find((item) => item.id === workItemId)?.revision ?? null;
        }
        case 'change.update': {
          const changeId = operation.payload['changeId'];
          const changes = await firstValueFrom(
            this.service.listAllChanges(operation.interventionId),
          );
          return changes.find((change) => change.id === changeId)?.revision ?? null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Method currentValues
   * @method currentValues
   *
   * @description
   * Reads a small authorized comparison without rebasing the queued intention.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Conflicting write.
   * @returns {Promise<{ readonly revision: number; readonly values: Readonly<Record<string, string | number | boolean | null>> } | null>}
   */
  private async currentValues(operation: InterventionOutboxOperation): Promise<{
    readonly revision: number;
    readonly values: Readonly<Record<string, string | number | boolean | null>>;
  } | null> {
    try {
      if (operation.type === 'time-entry.correct' || operation.type === 'time-entry.cancel') {
        const journal = await firstValueFrom(this.time.journal(operation.payload.workItemId));
        const entry = journal.entries.find((row) => row.id === operation.payload.id);
        return entry
          ? {
              revision: entry.revision,
              values: {
                memberId: entry.memberId,
                workedOn: entry.workedOn,
                minutes: entry.minutes,
                note: entry.note ?? null,
                cancelled: entry.cancelled,
              },
            }
          : null;
      }
      if (operation.type === 'work-item.update') {
        const rows = await firstValueFrom(this.service.listAllWorkItems(operation.interventionId));
        const item = rows.find((row) => row.id === operation.payload.workItemId);
        return item
          ? {
              revision: item.revision,
              values: {
                assignee: item.assignee ?? null,
                status: item.status,
                estimatedMinutes: item.estimatedMinutes ?? null,
                remainingMinutes: item.remainingMinutes ?? null,
                workStartsOn: item.workStartsOn ?? null,
                workEndsOn: item.workEndsOn ?? null,
              },
            }
          : null;
      }
      if (operation.type === 'intervention.update') {
        const item = await firstValueFrom(this.service.get(operation.interventionId));
        return {
          revision: item.revision,
          values: {
            status: item.status,
            plannedStartAt: item.plannedStartAt ?? null,
            dueAt: item.dueAt ?? null,
            responsible: item.responsible ?? null,
          },
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method dependsOnBlockedResource
   * @method dependsOnBlockedResource
   *
   * @description
   * Checks whether a queued write depends on a resource blocked earlier in this replay.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Queued write to evaluate.
   * @param {ReadonlySet<string>} blockedResources - Resources awaiting successful replay or review.
   * @returns {boolean} Whether the operation must wait for a blocked resource.
   */
  private dependsOnBlockedResource(
    operation: InterventionOutboxOperation,
    blockedResources: ReadonlySet<string>,
  ): boolean {
    if (blockedResources.size === 0) return false;

    if (
      'workItemId' in operation.payload &&
      blockedResources.has(`/api/intervention-work-items/${operation.payload.workItemId}`)
    )
      return true;
    if (
      operation.type.startsWith('time-entry.') &&
      'id' in operation.payload &&
      blockedResources.has(`/api/time-entries/${operation.payload.id}`)
    )
      return true;

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
