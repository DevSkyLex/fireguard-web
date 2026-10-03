import { inject, Service } from '@angular/core';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { firstValueFrom, takeUntil, type Observable } from 'rxjs';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { authStoreEvents } from '@features/auth/state';
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
  InterventionOutboxOperationFor,
} from '@features/organization/features/interventions/models';
import { workloadAssessmentFromError } from '@features/organization/features/workload/utils';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
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
 * Constant DEPENDENCY_UNAVAILABLE_DETAIL
 *
 * @description
 * created (its create is permanently failed or conflicted). Marking the
 * dependent `failed` makes an otherwise invisible, permanently-stuck operation
 * visible and actionable (retry after resolving the parent, or discard).
 */
const DEPENDENCY_UNAVAILABLE_DETAIL =
  'A resource this change depends on could not be created. Resolve the blocked operation it depends on, then retry.';

/**
 * Interface BlockedResources
 * @interface
 *
 * @description
 * `permanent` resources come from a failed/conflicted create and can never
 * appear on their own, so their dependents are surfaced as `failed`.
 * `transient` resources come from a retriable 5xx and will be re-attempted next
 * cycle, so their dependents stay `pending`.
 */
interface BlockedResources {
  /**
   * Property permanent
   * @readonly
   *
   * @description
   * Lists resource keys blocked for the lifetime of the session.
   *
   * @access public
   *
   * @type {Set<string>}
   */
  readonly permanent: Set<string>;

  /**
   * Property transient
   * @readonly
   *
   * @description
   * Lists resource keys blocked while a temporary operation is active.
   *
   * @access public
   *
   * @type {Set<string>}
   */
  readonly transient: Set<string>;
}

/**
 * Class InterventionSyncService
 * @class InterventionSyncService
 *
 * @description
 * Outbox replay service for intervention offline workflows.
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
  //#region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Auth-owned revision invalidating queued work when the local session changes.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Account identity owning the intervention outbox.
   *
   * @access private
   * @since unreleased
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject(USER_IDENTITY_PORT);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Workspace context invalidating an obsolete replay pass.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organization: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property dispatcher
   * @readonly
   *
   * @description
   * Publishes cross-layer consequences; this service never listens to its own group.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Dispatcher}
   */
  private readonly dispatcher: Dispatcher = inject(Dispatcher);

  /**
   * Property events
   * @readonly
   *
   * @description
   * Session-end notifications cancelling the departing account's active replay subscription.
   *
   * @access private
   * @since unreleased
   *
   * @type {Events}
   */
  private readonly events: Events = inject(Events);

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
   * Property activeReplays
   * @readonly
   *
   * @description
   * Tracks in-flight replay promises by intervention so concurrent requests share one replay.
   *
   * @access private
   * @since 0.1.0
   *
   * @type {Map<string, Promise<number>>}
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
   *
   * @returns {Promise<number>} Number of operations effectively replayed.
   */
  private async replayInterventionOutbox(
    organizationId: string,
    interventionId: string,
  ): Promise<number> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent()) return 0;
    const owningOrganizationId = await this.offline.organizationIdForIntervention(interventionId);
    if (!isCurrent() || owningOrganizationId !== organizationId) return 0;
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
        isCurrent,
      );
    } finally {
      if (isCurrent() && collections.size)
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
   * @param {(operation: InterventionOutboxOperation) => void} applied - Records affected
   *   collections.
   * @param {() => boolean} isCurrent - Whether the initiating session and workspace still own
   *   replay.
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
    isCurrent: () => boolean,
  ): Promise<number> {
    if (!isCurrent()) return replayed;
    const operation = operations[index];
    if (!operation) return replayed;

    const advance = (next: number): Promise<number> =>
      this.replayOperations(
        organizationId,
        operations,
        index + 1,
        next,
        blocked,
        applied,
        isCurrent,
      );

    if (await this.skipBlockedOperation(operation, blocked)) return advance(replayed);
    if (!isCurrent()) return replayed;

    try {
      await this.replay(organizationId, operation);
      if (!isCurrent()) return replayed;
      await this.offline.removeOutbox(operation.id);
      if (!isCurrent()) return replayed;
      applied(operation);
      return advance(replayed + 1);
    } catch (error: unknown) {
      if (!isCurrent()) return replayed;
      const outcome = await this.handleReplayFailure(operation, error, blocked, isCurrent);
      if (!isCurrent()) return replayed;
      if (outcome === 'applied') {
        applied(operation);
        return advance(replayed + 1);
      }
      return advance(replayed);
    }
  }

  /**
   * Method skipBlockedOperation
   * @method skipBlockedOperation
   *
   * @description
   * Keeps dependents of permanent failures actionable and those of transient failures pending.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Queued operation.
   * @param {BlockedResources} blocked - Resource blockers for this replay cycle.
   *
   * @returns {Promise<boolean>} Whether replay must skip this operation.
   */
  private async skipBlockedOperation(
    operation: InterventionOutboxOperation,
    blocked: BlockedResources,
  ): Promise<boolean> {
    if (operation.status === 'conflict' || operation.status === 'failed') {
      this.block(operation, blocked.permanent);
      return true;
    }
    if (this.dependsOnBlockedResource(operation, blocked.permanent)) {
      await this.offline.markOutboxFailed(operation.id, DEPENDENCY_UNAVAILABLE_DETAIL);
      this.block(operation, blocked.permanent);
      return true;
    }
    if (this.dependsOnBlockedResource(operation, blocked.transient)) {
      this.block(operation, blocked.transient);
      return true;
    }
    return false;
  }

  /**
   * Method handleReplayFailure
   * @method handleReplayFailure
   *
   * @description
   * Classifies an API rejection while preserving outbox and dependent-resource state.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Rejected operation.
   * @param {unknown} error - Transport failure.
   * @param {BlockedResources} blocked - Resource blockers for this replay cycle.
   * @param {() => boolean} isCurrent - Whether the initiating session and workspace still own
   *   replay.
   *
   * @returns {Promise<'applied' | 'blocked'>} Replay disposition.
   */
  private async handleReplayFailure(
    operation: InterventionOutboxOperation,
    error: unknown,
    blocked: BlockedResources,
    isCurrent: () => boolean,
  ): Promise<'applied' | 'blocked'> {
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
      return 'applied';
    }
    const assessment =
      workloadAssessmentFromError(error) ?? workloadAssessmentFromError(response.error);
    if (response.status === HTTP_CONFLICT && assessment) {
      await this.offline.markOutboxConflict(operation.id, detail, assessment);
      this.block(operation, blocked.permanent);
      return 'blocked';
    }
    if (response.status === HTTP_PRECONDITION_FAILED) {
      await this.handlePreconditionFailure(operation, detail, blocked.permanent, isCurrent);
      return 'blocked';
    }
    if (this.isPermanentFailure(error, response)) {
      await this.offline.markOutboxFailed(operation.id, detail);
      this.block(operation, blocked.permanent);
      return 'blocked';
    }
    if (typeof response.status === 'number' && response.status >= HTTP_SERVER_ERROR) {
      this.block(operation, blocked.transient);
      return 'blocked';
    }
    throw error;
  }

  /**
   * Method handlePreconditionFailure
   * @method handlePreconditionFailure
   *
   * @description
   * Captures current values for human review or rebases the queued revision for retry.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Rejected operation.
   * @param {string} detail - Server problem detail.
   * @param {Set<string>} permanent - Resource blockers for this replay cycle.
   * @param {() => boolean} isCurrent - Whether the initiating session and workspace still own
   *   replay.
   *
   * @returns {Promise<void>}
   */
  private async handlePreconditionFailure(
    operation: InterventionOutboxOperation,
    detail: string,
    permanent: Set<string>,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (this.requiresCurrentValueReview(operation)) {
      const review = await this.currentValues(operation);
      if (!isCurrent()) return;
      await this.offline.markOutboxConflict(operation.id, detail, null, review);
      this.block(operation, permanent);
      return;
    }
    const rebasedRevision = await this.currentRevision(operation);
    if (!isCurrent()) return;
    if (rebasedRevision !== null)
      await this.offline.rebaseOutboxRevision(operation.id, rebasedRevision, detail);
    else await this.offline.markOutboxConflict(operation.id, detail);
    this.block(operation, permanent);
  }

  /**
   * Method requiresCurrentValueReview
   * @method requiresCurrentValueReview
   *
   * @description
   * Identifies queued edits that need an explicit value comparison after a revision conflict.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperation} operation - Rejected operation.
   *
   * @returns {boolean} Whether current server values must be shown before retry.
   */
  private requiresCurrentValueReview(operation: InterventionOutboxOperation): boolean {
    return (
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
    );
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
        await this.awaitReplay(
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
        await this.awaitReplay(
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
        await this.awaitReplay(
          this.time.cancelEntry(
            operation.payload.workItemId,
            operation.payload.id,
            operation.payload.revision,
          ),
        );
        break;
      case 'facility.create':
        await this.awaitReplay(
          this.facilities.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
          ),
        );
        break;
      case 'equipment.create':
        await this.awaitReplay(
          this.equipment.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
          ),
        );
        break;
      case 'inspection.create':
        await this.awaitReplay(
          this.inspections.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
          ),
        );
        break;
      case 'media.create': {
        await this.replayMediaCreate(operation);
        break;
      }
      case 'attachment.upload': {
        await this.replayAttachmentUpload(operation);
        break;
      }
      case 'comment.create': {
        await this.replayCommentCreate(operation);
        break;
      }
      case 'intervention.update': {
        await this.replayInterventionUpdate(operation);
        break;
      }
      case 'work-item.create':
        await this.awaitReplay(this.service.createWorkItem(operation.payload));
        break;
      case 'work-item.update': {
        await this.replayWorkItemUpdate(operation);
        break;
      }
      case 'change.create':
        await this.awaitReplay(this.service.createChange(operation.payload));
        break;
      case 'change.update': {
        await this.replayChangeUpdate(operation);
        break;
      }
    }
  }

  /**
   * Method replayMediaCreate
   * @method replayMediaCreate
   *
   * @description
   * Validates a persisted media payload before uploading its evidence.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperationFor<'media.create'>} operation - Queued media creation.
   *
   * @returns {Promise<void>}
   */
  private async replayMediaCreate(
    operation: InterventionOutboxOperationFor<'media.create'>,
  ): Promise<void> {
    const file = operation.payload['file'];
    const equipmentId = operation.payload['equipmentId'];
    const fileName = operation.payload['fileName'];
    if (
      !(file instanceof Blob) ||
      typeof equipmentId !== 'string' ||
      typeof fileName !== 'string'
    ) {
      throw new TypeError('Invalid offline media operation');
    }
    await this.awaitReplay(
      this.equipment.uploadEvidence(
        equipmentId,
        file,
        fileName,
        operation.interventionId,
        operation.payload.clientId,
      ),
    );
  }

  /**
   * Method replayAttachmentUpload
   * @method replayAttachmentUpload
   *
   * @description
   * Validates an attachment before replaying the idempotent multipart upload.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperationFor<'attachment.upload'>} operation - Queued upload.
   *
   * @returns {Promise<void>}
   */
  private async replayAttachmentUpload(
    operation: InterventionOutboxOperationFor<'attachment.upload'>,
  ): Promise<void> {
    const file = operation.payload['file'];
    const fileName = operation.payload['fileName'];
    if (!(file instanceof Blob) || typeof fileName !== 'string') {
      throw new TypeError('Invalid offline attachment operation');
    }
    await this.awaitReplay(
      this.service.uploadAttachment(
        operation.interventionId,
        file,
        fileName,
        operation.payload.label,
        operation.payload.workItemId,
        operation.payload.kind,
        operation.payload.clientId,
      ),
    );
  }

  /**
   * Method replayCommentCreate
   * @method replayCommentCreate
   *
   * @description
   * Replays a text comment with its optional idempotency key.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperationFor<'comment.create'>} operation - Queued comment.
   *
   * @returns {Promise<void>}
   */
  private async replayCommentCreate(
    operation: InterventionOutboxOperationFor<'comment.create'>,
  ): Promise<void> {
    const body = operation.payload['body'];
    if (typeof body !== 'string') throw new TypeError('Invalid offline comment operation');
    const clientId = operation.payload['clientId'];
    await this.awaitReplay(
      this.service.addComment(
        operation.interventionId,
        body,
        typeof clientId === 'string' ? clientId : undefined,
      ),
    );
  }

  /**
   * Method replayInterventionUpdate
   * @method replayInterventionUpdate
   *
   * @description
   * Rehydrates persisted ISO dates for the typed update transport.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperationFor<'intervention.update'>} operation - Queued intervention
   *   edit.
   *
   * @returns {Promise<void>}
   */
  private async replayInterventionUpdate(
    operation: InterventionOutboxOperationFor<'intervention.update'>,
  ): Promise<void> {
    const revision = operation.payload['revision'];
    const {
      revision: _revision,
      clientId: _clientId,
      plannedStartAt,
      dueAt,
      ...input
    } = operation.payload;
    await this.awaitReplay(
      this.service.update(
        operation.interventionId,
        {
          ...input,
          ...(plannedStartAt !== undefined
            ? { plannedStartAt: plannedStartAt ? new Date(plannedStartAt) : null }
            : {}),
          ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
        },
        typeof revision === 'number' ? revision : undefined,
      ),
    );
  }

  /**
   * Method replayWorkItemUpdate
   * @method replayWorkItemUpdate
   *
   * @description
   * Removes outbox metadata before replaying one work-item edit.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperationFor<'work-item.update'>} operation - Queued work-item edit.
   *
   * @returns {Promise<void>}
   */
  private async replayWorkItemUpdate(
    operation: InterventionOutboxOperationFor<'work-item.update'>,
  ): Promise<void> {
    const workItemId = operation.payload['workItemId'];
    const revision = operation.payload['revision'];
    if (typeof workItemId !== 'string') throw new TypeError('Invalid work item operation');
    const {
      workItemId: _workItemId,
      revision: _revision,
      clientId: _clientId,
      ...input
    } = operation.payload;
    await this.awaitReplay(
      this.service.updateWorkItem(
        workItemId,
        input,
        typeof revision === 'number' ? revision : undefined,
      ),
    );
  }

  /**
   * Method replayChangeUpdate
   * @method replayChangeUpdate
   *
   * @description
   * Removes outbox metadata before replaying one change edit.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionOutboxOperationFor<'change.update'>} operation - Queued change edit.
   *
   * @returns {Promise<void>}
   */
  private async replayChangeUpdate(
    operation: InterventionOutboxOperationFor<'change.update'>,
  ): Promise<void> {
    const changeId = operation.payload['changeId'];
    const revision = operation.payload['revision'];
    if (typeof changeId !== 'string') throw new TypeError('Invalid intervention change operation');
    const {
      changeId: _changeId,
      revision: _revision,
      clientId: _clientId,
      ...input
    } = operation.payload;
    await this.awaitReplay(
      this.service.updateChange(
        changeId,
        input,
        typeof revision === 'number' ? revision : undefined,
      ),
    );
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
   * @returns {boolean} Result of the is create operation.
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
   * @returns {string | undefined} Stable problem type when present.
   */
  private problemType(response: SyncProblemResponse): string | undefined {
    return response.type ?? response.error?.type;
  }

  /**
   * Method isPermanentFailure
   * @method isPermanentFailure
   *
   * @description
   * Determines whether the server response makes an outbox operation permanently unreplayable.
   *
   * @access private
   * @since 0.1.0
   *
   * @param {unknown} error - Error raised while submitting the operation.
   * @param {SyncProblemResponse} response - Normalized HTTP problem response.
   *
   * @returns {boolean} Whether replay should stop retrying this operation.
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
   *
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
   *
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
   * Method currentRevision
   * @method currentRevision
   *
   * @description
   * Fetches the latest revision for an update target so conflict recovery can rebase it.
   * Returns null when the operation has no update target, the target is missing, or the
   * revision lookup fails during an offline replay.
   *
   * @access private
   * @since 0.1.0
   *
   * @param {InterventionOutboxOperation} operation - Queued update whose target revision is needed.
   *
   * @returns {Promise<number | null>} Current target revision, or null when it cannot be fetched.
   */
  private async currentRevision(operation: InterventionOutboxOperation): Promise<number | null> {
    try {
      switch (operation.type) {
        case 'intervention.update': {
          const intervention = await this.awaitReplay(this.service.get(operation.interventionId));
          return intervention.revision;
        }
        case 'work-item.update': {
          const workItemId = operation.payload['workItemId'];
          const items = await this.awaitReplay(
            this.service.listAllWorkItems(operation.interventionId),
          );
          return items.find((item) => item.id === workItemId)?.revision ?? null;
        }
        case 'change.update': {
          const changeId = operation.payload['changeId'];
          const changes = await this.awaitReplay(
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
   *
   * @returns {Promise<{
   *   readonly revision: number;
   *   readonly values: Readonly<Record<string, string | number | boolean | null>>;
   * } | null>}
   */
  private async currentValues(operation: InterventionOutboxOperation): Promise<{
    readonly revision: number;
    readonly values: Readonly<Record<string, string | number | boolean | null>>;
  } | null> {
    try {
      if (operation.type === 'time-entry.correct' || operation.type === 'time-entry.cancel') {
        const journal = await this.awaitReplay(this.time.journal(operation.payload.workItemId));
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
        const rows = await this.awaitReplay(
          this.service.listAllWorkItems(operation.interventionId),
        );
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
        const item = await this.awaitReplay(this.service.get(operation.interventionId));
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
   *
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
   * Method containsBlockedResource
   * @method containsBlockedResource
   *
   * @description
   * Checks whether a payload contains any resource identifier blocked by an earlier conflict.
   *
   * @access private
   * @since 0.1.0
   *
   * @param {unknown} value - Payload value to inspect recursively.
   * @param {ReadonlySet<string>} blockedResources - Resource identifiers that cannot be replayed.
   *
   * @returns {boolean} Whether the value references a blocked resource.
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

  /**
   * Method captureReplayContext
   * @method captureReplayContext
   *
   * @description
   * Captures ownership before loading the queue; replacement sessions invalidate it even for the
   * same account.
   *
   * @access private
   * @since unreleased
   *
   * @returns {() => boolean} Guard checked before every send and replay consequence.
   */
  private captureReplayContext(): () => boolean {
    const revision = this.session.sessionRevision();
    const owner = this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
    const organizationId = this.organization.selectedOrganizationId();
    return (): boolean =>
      owner !== null &&
      this.session.isAuthenticated() &&
      revision === this.session.sessionRevision() &&
      owner === (this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null) &&
      organizationId === this.organization.selectedOrganizationId();
  }

  /**
   * Method awaitReplay
   * @method awaitReplay
   *
   * @description
   * Cancels this account's transport subscription on session end; guards still suppress late replay
   * consequences.
   *
   * @access private
   * @since unreleased
   *
   * @template Response
   *
   * @param {Observable<Response>} request - Transport request belonging to the current replay pass.
   *
   * @returns {Promise<Response>} First response while the initiating session remains active.
   */
  private awaitReplay<Response>(request: Observable<Response>): Promise<Response> {
    return firstValueFrom(request.pipe(takeUntil(this.events.on(authStoreEvents.sessionEnded))));
  }
  //#endregion
}
