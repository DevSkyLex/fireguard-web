import { inject, Service } from '@angular/core';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { firstValueFrom, takeUntil, type Observable } from 'rxjs';
import { getIdempotencyErrorCode, isIdempotencyOperationCompleted } from '@core/api';
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
  InterventionInventoryRepository,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionCollectionsChange,
  InterventionOutboxOperation,
  InterventionOutboxOperationFor,
} from '@features/organization/features/interventions/models';
import { InventoryService } from '@features/organization/features/inventory/data-access';
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
import { AcceptedInventoryPersistenceError } from './models/accepted-inventory-persistence-error';

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

  /**
   * Property inventory
   * @readonly
   *
   * @description
   * Owner-published quantitative declaration transport; valuation stays in the private cost API.
   *
   * @access private
   * @since unreleased
   *
   * @type {InventoryService}
   */
  private readonly inventory: InventoryService = inject(InventoryService);

  /**
   * Property inventorySnapshots
   * @readonly
   *
   * @description
   * Keeps accepted server receipts durable before their idempotent queue rows are removed.
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionInventoryRepository}
   */
  private readonly inventorySnapshots: InterventionInventoryRepository = inject(
    InterventionInventoryRepository,
  );
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
    if (activeReplay !== undefined) return activeReplay;

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
        case 'inventory-consumption.declare':
          collections.add('consumptions');
          break;
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

    let inventoryAcceptedByServer = false;
    try {
      await this.replay(organizationId, operation);
      inventoryAcceptedByServer = operation.type === 'inventory-consumption.declare';
      if (!isCurrent()) return replayed;
      await this.offline.removeOutbox(operation.id);
      if (!isCurrent()) return replayed;
      applied(operation);
      return advance(replayed + 1);
    } catch (error: unknown) {
      if (!isCurrent()) return replayed;
      if (inventoryAcceptedByServer) throw new AcceptedInventoryPersistenceError(error);
      const outcome = await this.handleReplayFailure(
        organizationId,
        operation,
        error,
        blocked,
        isCurrent,
      );
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
   * @param {string} organizationId - Organization owning the completed projection.
   * @param {InterventionOutboxOperation} operation - Rejected operation.
   * @param {unknown} error - Transport failure.
   * @param {BlockedResources} blocked - Resource blockers for this replay cycle.
   * @param {() => boolean} isCurrent - Whether the initiating session and workspace still own
   *   replay.
   *
   * @returns {Promise<'applied' | 'blocked'>} Replay disposition.
   */
  private async handleReplayFailure(
    organizationId: string,
    operation: InterventionOutboxOperation,
    error: unknown,
    blocked: BlockedResources,
    isCurrent: () => boolean,
  ): Promise<'applied' | 'blocked'> {
    if (error instanceof AcceptedInventoryPersistenceError) throw error;
    const response = error as SyncProblemResponse;
    const detail =
      response.detail ??
      response.error?.detail ??
      (error instanceof Error ? error.message : 'The server rejected this operation.');
    if (isIdempotencyOperationCompleted(error)) {
      return this.acknowledgeCompletedOperation(organizationId, operation, blocked, isCurrent);
    }
    const receiptFailure = getIdempotencyErrorCode(error);
    if (receiptFailure === 'idempotency_in_progress') {
      this.block(operation, blocked.transient);
      return 'blocked';
    }
    if (receiptFailure) {
      await this.offline.markOutboxFailed(operation.id, detail);
      this.block(operation, blocked.permanent);
      return 'blocked';
    }
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
   * Method acknowledgeCompletedOperation
   * @method acknowledgeCompletedOperation
   *
   * @description
   * Removes a completed intent only after current-owner reconciliation succeeds. Failed reads or
   * device acknowledgements retain the original operation for a later replay.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the completed projection.
   * @param {InterventionOutboxOperation} operation - Completed intent with its original identity.
   * @param {BlockedResources} blocked - Resource blockers for this replay cycle.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<'applied' | 'blocked'>} Guarded acknowledgement disposition.
   */
  private async acknowledgeCompletedOperation(
    organizationId: string,
    operation: InterventionOutboxOperation,
    blocked: BlockedResources,
    isCurrent: () => boolean,
  ): Promise<'applied' | 'blocked'> {
    try {
      await this.reconcileCompletedOperation(organizationId, operation, isCurrent);
      if (!isCurrent()) return 'blocked';
      await this.offline.removeOutbox(operation.id);
      return isCurrent() ? 'applied' : 'blocked';
    } catch {
      this.block(operation, blocked.transient);
      return 'blocked';
    }
  }

  /**
   * Method reconcileCompletedOperation
   * @method reconcileCompletedOperation
   *
   * @description
   * Acquires current owner projections before dropping a completed intent whose response expired.
   * Physical receipts are saved durably; other projections use the existing invalidation lifecycle
   * after acknowledgement without overwriting pending workspace edits.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the replay.
   * @param {InterventionOutboxOperation} operation - Completed operation with stable native
   *   identity.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<void>} Completes only after authorized reconciliation succeeds.
   */
  private async reconcileCompletedOperation(
    organizationId: string,
    operation: InterventionOutboxOperation,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (operation.type === 'inventory-consumption.declare') {
      await this.reconcileCompletedConsumption(organizationId, operation, isCurrent);
      return;
    }
    const intervention = await this.readCurrentReplay(
      this.service.get(operation.interventionId),
      isCurrent,
    );
    if (
      intervention.id !== operation.interventionId ||
      intervention.organization !== `/api/organizations/${organizationId}`
    )
      throw new Error('The completed operation belongs to another workspace.');
    switch (operation.type) {
      case 'intervention.update':
        return;
      case 'time-entry.create':
      case 'time-entry.correct':
      case 'time-entry.cancel':
        return this.reconcileCompletedTimeEntry(operation, isCurrent);
      case 'work-item.create':
      case 'work-item.update':
        return this.reconcileCompletedWorkItem(operation, isCurrent);
      case 'change.create':
      case 'change.update':
        return this.reconcileCompletedChange(operation, isCurrent);
      case 'facility.create':
        if (!operation.payload.clientId)
          throw new Error('The completed facility identity is unavailable.');
        await this.readCurrentReplay(
          this.facilities.get(organizationId, operation.payload.clientId),
          isCurrent,
        );
        return;
      case 'equipment.create':
        if (!operation.payload.clientId)
          throw new Error('The completed equipment identity is unavailable.');
        await this.readCurrentReplay(
          this.equipment.get(organizationId, operation.payload.clientId),
          isCurrent,
        );
        return;
      case 'inspection.create':
        if (!operation.payload.clientId)
          throw new Error('The completed inspection identity is unavailable.');
        await this.readCurrentReplay(
          this.inspections.get(organizationId, operation.payload.clientId),
          isCurrent,
        );
        return;
      case 'media.create':
        await this.readCurrentReplay(
          this.equipment.listAttachments(organizationId, operation.payload.equipmentId),
          isCurrent,
        );
        return;
      case 'attachment.upload':
        await this.readCurrentReplay(
          this.service.listAttachments(operation.interventionId, operation.payload.workItemId),
          isCurrent,
        );
        return;
      case 'comment.create':
        await this.readCurrentReplay(
          this.service.listActivities(operation.interventionId),
          isCurrent,
        );
        return;
    }
  }

  /**
   * Method reconcileCompletedTimeEntry
   * @method reconcileCompletedTimeEntry
   *
   * @description
   * Acquires the exact journal entry and its intervention work-item projection before acknowledging
   * a completed journal write.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionOutboxOperationFor<
   *   'time-entry.create' | 'time-entry.correct' | 'time-entry.cancel'
   * >} operation
   *   - Completed journal intent with its original entry identity.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<void>} Completes after both current-owner reads succeed.
   */
  private async reconcileCompletedTimeEntry(
    operation: InterventionOutboxOperationFor<
      'time-entry.create' | 'time-entry.correct' | 'time-entry.cancel'
    >,
    isCurrent: () => boolean,
  ): Promise<void> {
    const current = await this.readCurrentReplay(
      this.time.getEntry(operation.payload.workItemId, operation.payload.id),
      isCurrent,
    );
    if (current.entry?.id !== operation.payload.id)
      throw new Error('The completed time entry is unavailable.');
    await this.readCurrentReplay(
      this.service.listAllWorkItems(operation.interventionId),
      isCurrent,
    );
  }

  /**
   * Method reconcileCompletedWorkItem
   * @method reconcileCompletedWorkItem
   *
   * @description
   * Verifies the original create or update target exists in the authorized current work items
   * without rebasing the queued intent.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionOutboxOperationFor<'work-item.create'>
   *   | InterventionOutboxOperationFor<'work-item.update'>} operation
   *   - Completed work-item intent.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<void>} Completes only when the exact native target is available.
   */
  private async reconcileCompletedWorkItem(
    operation:
      | InterventionOutboxOperationFor<'work-item.create'>
      | InterventionOutboxOperationFor<'work-item.update'>,
    isCurrent: () => boolean,
  ): Promise<void> {
    const rows = await this.readCurrentReplay(
      this.service.listAllWorkItems(operation.interventionId),
      isCurrent,
    );
    const target =
      operation.type === 'work-item.create'
        ? operation.payload.clientId
        : operation.payload.workItemId;
    if (!rows.some((row) => row.id === target))
      throw new Error('The completed work item is unavailable.');
  }

  /**
   * Method reconcileCompletedChange
   * @method reconcileCompletedChange
   *
   * @description
   * Verifies the original create or update target exists in the authorized current changes
   * without rebasing the queued intent.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionOutboxOperationFor<'change.create'>
   *   | InterventionOutboxOperationFor<'change.update'>} operation
   *   - Completed change intent.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<void>} Completes only when the exact native target is available.
   */
  private async reconcileCompletedChange(
    operation:
      | InterventionOutboxOperationFor<'change.create'>
      | InterventionOutboxOperationFor<'change.update'>,
    isCurrent: () => boolean,
  ): Promise<void> {
    const rows = await this.readCurrentReplay(
      this.service.listAllChanges(operation.interventionId),
      isCurrent,
    );
    const target =
      operation.type === 'change.create' ? operation.payload.clientId : operation.payload.changeId;
    if (!rows.some((row) => row.id === target))
      throw new Error('The completed change is unavailable.');
  }

  /**
   * Method reconcileCompletedConsumption
   * @method reconcileCompletedConsumption
   *
   * @description
   * Reads the exact original client operation through the server receipt correlation and restores
   * its physical receipt durably before acknowledgement. Field similarity never identifies it.
   * Timestamp checks use the API's second precision without changing the original physical fact.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} organizationId - Organization owning the declaration.
   * @param {InterventionOutboxOperationFor<'inventory-consumption.declare'>} operation - Original
   *   physical fact.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<void>} Durable authoritative physical receipt completion.
   */
  private async reconcileCompletedConsumption(
    organizationId: string,
    operation: InterventionOutboxOperationFor<'inventory-consumption.declare'>,
    isCurrent: () => boolean,
  ): Promise<void> {
    const input = operation.payload;
    const accountId = this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
    if (!accountId || accountId !== input.actorId)
      throw new Error('Physical declaration ownership changed.');
    const projection = await this.readCurrentReplay(
      this.inventory.listConsumptions(organizationId, {
        clientOperationId: input.clientOperationId,
        itemsPerPage: 1,
      }),
      isCurrent,
    );
    const receipt = projection.member[0];
    const occurredAt = receipt ? Date.parse(receipt.occurredAt) : Number.NaN;
    const inputOccurredAt = Date.parse(input.occurredAt);
    if (
      projection.totalItems !== 1 ||
      projection.member.length !== 1 ||
      !receipt ||
      typeof receipt.id !== 'string' ||
      receipt.id.length === 0 ||
      (receipt.status !== 'confirmed' && receipt.status !== 'received_pending') ||
      receipt.quantity !== input.quantity ||
      !Number.isFinite(occurredAt) ||
      !Number.isFinite(inputOccurredAt) ||
      Math.floor(occurredAt / 1000) !== Math.floor(inputOccurredAt / 1000) ||
      receipt.interventionId !== operation.interventionId ||
      receipt.actorId !== accountId ||
      receipt.partId !== input.partId ||
      receipt.warehouseId !== input.warehouseId ||
      (receipt.workItemId ?? null) !== (input.workItemId ?? null) ||
      (receipt.equipmentId ?? null) !== (input.equipmentId ?? null)
    )
      throw new Error('The exact completed physical receipt is unavailable.');
    await this.inventorySnapshots.saveReceipt(organizationId, accountId, receipt, isCurrent);
    if (!isCurrent()) throw new DOMException('Offline operation ownership changed.', 'AbortError');
  }

  /**
   * Method readCurrentReplay
   * @method readCurrentReplay
   *
   * @description
   * Acquires a current-owner projection while suppressing obsolete responses at every await.
   *
   * @access private
   * @since unreleased
   *
   * @template Response
   *
   * @param {Observable<Response>} request - Authorized owner projection request.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   *
   * @returns {Promise<Response>} Projection still owned by the initiating replay context.
   */
  private async readCurrentReplay<Response>(
    request: Observable<Response>,
    isCurrent: () => boolean,
  ): Promise<Response> {
    if (!isCurrent()) throw new DOMException('Offline operation ownership changed.', 'AbortError');
    const response = await this.awaitReplay(request);
    if (!isCurrent()) throw new DOMException('Offline operation ownership changed.', 'AbortError');
    return response;
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
        ('executionResult' in operation.payload ||
          'assignee' in operation.payload ||
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
    const isCurrent = this.captureReplayContext();
    const idempotencyKey =
      operation.idempotencyKey ?? (await this.offline.ensureOutboxIdempotencyKey(operation.id));
    if (!isCurrent() || !idempotencyKey)
      throw new DOMException('Offline operation ownership changed.', 'AbortError');
    operation = { ...operation, idempotencyKey };
    switch (operation.type) {
      case 'inventory-consumption.declare': {
        const accountId = this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
        if (!accountId || accountId !== operation.payload.actorId)
          throw new DOMException(
            'The physical declaration belongs to another account.',
            'AbortError',
          );
        const input = operation.payload;
        const receipt = await this.awaitReplay(
          this.inventory.declareConsumption(
            organizationId,
            {
              clientOperationId: input.clientOperationId,
              partId: input.partId,
              warehouseId: input.warehouseId,
              quantity: input.quantity,
              interventionId: input.interventionId,
              workItemId: input.workItemId,
              equipmentId: input.equipmentId,
              occurredAt: input.occurredAt,
            },
            { idempotencyKey: operation.idempotencyKey },
          ),
        );
        if (!isCurrent()) return;
        if (receipt.interventionId !== operation.interventionId)
          throw new Error('The server declaration does not belong to this workspace.');
        try {
          await this.inventorySnapshots.saveReceipt(organizationId, accountId, receipt, isCurrent);
        } catch (error: unknown) {
          throw new AcceptedInventoryPersistenceError(error);
        }
        break;
      }
      case 'time-entry.create':
        await this.awaitReplay(
          this.time.createEntry(
            operation.payload.workItemId,
            {
              id: operation.payload.id,
              memberId: operation.payload.memberId,
              workedOn: operation.payload.workedOn,
              minutes: operation.payload.minutes,
              note: operation.payload.note,
            },
            { idempotencyKey: operation.idempotencyKey },
          ),
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
            { idempotencyKey: operation.idempotencyKey },
          ),
        );
        break;
      case 'time-entry.cancel':
        await this.awaitReplay(
          this.time.cancelEntry(
            operation.payload.workItemId,
            operation.payload.id,
            operation.payload.revision,
            { idempotencyKey: operation.idempotencyKey },
          ),
        );
        break;
      case 'facility.create':
        await this.awaitReplay(
          this.facilities.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
            { idempotencyKey: operation.idempotencyKey },
          ),
        );
        break;
      case 'equipment.create':
        await this.awaitReplay(
          this.equipment.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
            { idempotencyKey: operation.idempotencyKey },
          ),
        );
        break;
      case 'inspection.create':
        await this.awaitReplay(
          this.inspections.createForIntervention(
            organizationId,
            operation.interventionId,
            operation.payload,
            { idempotencyKey: operation.idempotencyKey },
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
        await this.awaitReplay(
          this.service.createWorkItem(operation.payload, {
            idempotencyKey: operation.idempotencyKey,
          }),
        );
        break;
      case 'work-item.update': {
        await this.replayWorkItemUpdate(operation);
        break;
      }
      case 'change.create':
        await this.awaitReplay(
          this.service.createChange(operation.payload, {
            idempotencyKey: operation.idempotencyKey,
          }),
        );
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
        { idempotencyKey: operation.idempotencyKey },
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
        {
          label: operation.payload.label,
          workItemId: operation.payload.workItemId,
          kind: operation.payload.kind,
          clientId: operation.payload.clientId,
        },
        { idempotencyKey: operation.idempotencyKey },
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
        { idempotencyKey: operation.idempotencyKey },
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
        { idempotencyKey: operation.idempotencyKey },
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
        { idempotencyKey: operation.idempotencyKey },
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
        { idempotencyKey: operation.idempotencyKey },
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
        const current = await this.awaitReplay(
          this.time.getEntry(operation.payload.workItemId, operation.payload.id),
        );
        const entry = current.entry;
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
                ...('resultResource' in operation.payload
                  ? { resultResource: item.resultResource ?? null }
                  : {}),
                ...('executionResult' in operation.payload
                  ? {
                      equipmentId: item.executionResult?.equipmentId ?? null,
                      performedAt: item.executionResult?.performedAt ?? null,
                      outcome: item.executionResult?.outcome ?? null,
                      workPerformed: item.executionResult?.workPerformed ?? null,
                      authorId: item.executionResult?.authorId ?? null,
                      resultState: item.executionResult?.state ?? null,
                      validatedAt: item.executionResult?.validatedAt ?? null,
                    }
                  : {}),
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
