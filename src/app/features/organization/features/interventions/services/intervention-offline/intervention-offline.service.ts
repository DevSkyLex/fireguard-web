import { inject, Injectable, type Signal } from '@angular/core';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutboxOperation,
  InterventionOutboxPayloadMap,
  InterventionOutboxQueueEntry,
  InterventionOutboxType,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from './intervention-database.service';
import { InterventionOutboxStore } from './intervention-outbox.store';
import { InterventionWorkspaceRepository } from './intervention-workspace.repository';
import type { InterventionScopedRecord } from './models';
import type { InterventionWorkspaceSnapshot } from './models';

/**
 * Service InterventionOfflineService
 * @class InterventionOfflineService
 *
 * @description
 * Façade over the intervention offline persistence layer. Delegates to the focused
 * units that own each responsibility — {@link InterventionDatabaseService} for
 * IndexedDB infrastructure, {@link InterventionOutboxStore} for the replay outbox
 * and {@link InterventionWorkspaceRepository} for workspace persistence — while
 * keeping a single stable entry point for intervention pages and stores. Cross-cutting
 * purges that span both workspace and outbox stores are orchestrated here.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionOfflineService {
  //#region Properties
  /**
   * Property database
   * @readonly
   *
   * @description
   * IndexedDB infrastructure (connection, primitives, owner binding).
   *
   * @access private
   * @since 2.0.0
   *
   * @type {InterventionDatabaseService}
   */
  private readonly database: InterventionDatabaseService = inject<InterventionDatabaseService>(
    InterventionDatabaseService,
  );

  /**
   * Property outbox
   * @readonly
   *
   * @description
   * Outbox store owning queued operations and the pending-sync state.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {InterventionOutboxStore}
   */
  private readonly outbox: InterventionOutboxStore =
    inject<InterventionOutboxStore>(InterventionOutboxStore);

  /**
   * Property workspace
   * @readonly
   *
   * @description
   * Repository persisting normalized intervention workspaces.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {InterventionWorkspaceRepository}
   */
  private readonly workspace: InterventionWorkspaceRepository = inject(
    InterventionWorkspaceRepository,
  );

  /**
   * Property hasUnsyncedChanges
   * @readonly
   *
   * @description
   * Whether unsynchronized field operations are queued locally.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly hasUnsyncedChanges: Signal<boolean> = this.outbox.hasUnsyncedChanges;
  //#endregion

  //#region Workspace
  /**
   * Method saveWorkspace
   * @method saveWorkspace
   *
   * @description
   * Persists a normalized intervention workspace locally.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - intervention value.
   * @param {readonly InterventionWorkItemOutput[]} workItems - work Items value.
   * @param {readonly InterventionChangeOutput[]} changes - changes value.
   * @param {readonly InterventionIssueOutput[]} issues - issues value.
   * @param {readonly unknown[]} [resources] - resources value.
   * @param {{ readonly replace?: boolean }} [options] - options value.
   *
   * @return {Promise<void>} Result of the save workspace operation.
   */
  public async saveWorkspace(
    intervention: InterventionOutput,
    workItems: readonly InterventionWorkItemOutput[],
    changes: readonly InterventionChangeOutput[],
    issues: readonly InterventionIssueOutput[],
    resources: readonly unknown[] = [],
    options: { readonly replace?: boolean } = {},
  ): Promise<void> {
    if (
      options.replace === undefined &&
      (await this.outbox.listOutbox(intervention.id)).length > 0
    ) {
      return;
    }
    await this.workspace.saveWorkspace(
      intervention,
      workItems,
      changes,
      issues,
      resources,
      options,
    );
  }

  /**
   * Method getWorkspace
   * @method getWorkspace
   *
   * @description
   * Reads a locally persisted intervention workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   *
   * @return {Promise<{
   * intervention: InterventionOutput;
   * workItems: readonly InterventionWorkItemOutput[];
   * changes: readonly InterventionChangeOutput[];
   * issues: readonly InterventionIssueOutput[];
   * } | null>} Result of the get workspace operation.
   */
  public getWorkspace(interventionId: string): Promise<InterventionWorkspaceSnapshot | null> {
    return this.workspace.getWorkspace(interventionId);
  }

  /**
   * Method listInterventions
   * @method listInterventions
   *
   * @description
   * Lists locally persisted interventions belonging to one organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization identifier.
   *
   * @return {Promise<readonly InterventionOutput[]>} Locally persisted interventions.
   */
  public listInterventions(organizationId: string): Promise<readonly InterventionOutput[]> {
    return this.workspace.listInterventions(organizationId);
  }

  /**
   * Method organizationIdForIntervention
   * @method organizationIdForIntervention
   *
   * @description
   * Resolves the organization owning a locally persisted intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Intervention identifier.
   *
   * @return {Promise<string | null>} Owning organization identifier when available.
   */
  public organizationIdForIntervention(interventionId: string): Promise<string | null> {
    return this.workspace.organizationIdForIntervention(interventionId);
  }
  //#endregion

  //#region Outbox
  /**
   * Method queue
   * @method queue
   *
   * @description
   * Queues an operation for replay and marks unsynced state as true.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Intervention identifier.
   * @param {InterventionOutboxType} type - Operation type.
   * @param {InterventionOutboxPayloadMap[Type]} payload - Operation payload.
   *
   * @return {Promise<void>} A promise resolving once the operation is queued.
   */
  public queue<Type extends InterventionOutboxType>(
    interventionId: string,
    type: Type,
    payload: InterventionOutboxPayloadMap[Type],
  ): Promise<void> {
    return this.outbox.queue(interventionId, type, payload);
  }

  /**
   * Atomically queues every operation belonging to one field intention.
   */
  public queueMany(
    interventionId: string,
    entries: readonly InterventionOutboxQueueEntry[],
  ): Promise<readonly string[]> {
    return this.outbox.queueMany(interventionId, entries);
  }

  /**
   * Method listOutbox
   * @method listOutbox
   *
   * @description
   * Lists queued operations for one intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Intervention identifier.
   *
   * @return {Promise<readonly InterventionOutboxOperation[]>} A promise resolving with the queued operations.
   */
  public listOutbox(interventionId: string): Promise<readonly InterventionOutboxOperation[]> {
    return this.outbox.listOutbox(interventionId);
  }

  /**
   * Method listInterventionIdsWithOutbox
   * @method listInterventionIdsWithOutbox
   *
   * @description
   * Lists the distinct intervention identifiers that still have queued operations.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<readonly string[]>} Result of the list intervention ids with outbox operation.
   */
  public listInterventionIdsWithOutbox(): Promise<readonly string[]> {
    return this.outbox.listInterventionIdsWithOutbox();
  }

  /**
   * Method removeOutbox
   * @method removeOutbox
   *
   * @description
   * Removes one queued operation and recomputes unsynced state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Outbox operation identifier.
   *
   * @return {Promise<void>} A promise resolving once the operation is removed.
   */
  public removeOutbox(id: string): Promise<void> {
    return this.outbox.removeOutbox(id);
  }

  /**
   * Method markOutboxConflict
   * @method markOutboxConflict
   *
   * @description
   * Marks one queued operation as a conflict.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - id value.
   * @param {string} error - error value.
   *
   * @return {Promise<void>} Result of the mark outbox conflict operation.
   */
  public markOutboxConflict(id: string, error: string): Promise<void> {
    return this.outbox.markOutboxConflict(id, error);
  }

  /**
   * Marks one permanently rejected operation as failed.
   */
  public markOutboxFailed(id: string, error: string): Promise<void> {
    return this.outbox.markOutboxFailed(id, error);
  }

  /**
   * Method retryOutbox
   * @method retryOutbox
   *
   * @description
   * Resets one conflicted operation back to a pending state for replay.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - id value.
   *
   * @return {Promise<void>} Result of the retry outbox operation.
   */
  public retryOutbox(id: string): Promise<void> {
    return this.outbox.retryOutbox(id);
  }
  //#endregion

  //#region Purge
  /**
   * Method clearIntervention
   * @method clearIntervention
   *
   * @description
   * Clears local snapshot and outbox entries for one intervention, then recomputes
   * the pending-sync state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Intervention identifier.
   *
   * @return {Promise<void>} A promise resolving once local intervention data is cleared.
   */
  public async clearIntervention(interventionId: string): Promise<void> {
    await this.database.ensureOwnerBound();
    const interventionIri = `/api/interventions/${interventionId}`;
    await Promise.all([
      this.database.remove('interventions', interventionId),
      this.database.removeWhere<InterventionWorkItemOutput>(
        'workItems',
        (item) => item.intervention === interventionIri,
      ),
      this.database.removeWhere<InterventionChangeOutput>(
        'changes',
        (change) => change.intervention === interventionIri,
      ),
      this.database.removeWhere<InterventionScopedRecord>(
        'resources',
        (resource) => resource.interventionId === interventionId,
      ),
      this.database.removeWhere<InterventionScopedRecord>(
        'media',
        (media) => media.interventionId === interventionId,
      ),
      this.database.removeWhere<InterventionOutboxOperation>(
        'outbox',
        (operation) => operation.interventionId === interventionId,
      ),
    ]);
    await this.outbox.refresh();
  }

  /**
   * Method clearAll
   * @method clearAll
   *
   * @description
   * Clears all intervention offline stores and recomputes the pending-sync state.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} A promise resolving once every store is cleared.
   */
  public async clearAll(): Promise<void> {
    await this.database.clearAll();
    await this.outbox.refresh();
  }
  //#endregion
}
