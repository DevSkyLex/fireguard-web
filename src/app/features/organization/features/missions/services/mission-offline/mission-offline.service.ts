import { inject, Injectable, type Signal } from '@angular/core';
import type {
  MissionChangeOutput,
  MissionIssueOutput,
  MissionOutboxOperation,
  MissionOutboxPayloadMap,
  MissionOutboxQueueEntry,
  MissionOutboxType,
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';
import { MissionDatabaseService } from './mission-database.service';
import { MissionOutboxStore } from './mission-outbox.store';
import { MissionWorkspaceRepository } from './mission-workspace.repository';
import type { MissionScopedRecord } from './models';
import type { MissionWorkspaceSnapshot } from './models';

/**
 * Service MissionOfflineService
 * @class MissionOfflineService
 *
 * @description
 * Façade over the mission offline persistence layer. Delegates to the focused
 * units that own each responsibility — {@link MissionDatabaseService} for
 * IndexedDB infrastructure, {@link MissionOutboxStore} for the replay outbox
 * and {@link MissionWorkspaceRepository} for workspace persistence — while
 * keeping a single stable entry point for mission pages and stores. Cross-cutting
 * purges that span both workspace and outbox stores are orchestrated here.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionOfflineService {
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
   * @type {MissionDatabaseService}
   */
  private readonly database: MissionDatabaseService = inject(MissionDatabaseService);

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
   * @type {MissionOutboxStore}
   */
  private readonly outbox: MissionOutboxStore = inject(MissionOutboxStore);

  /**
   * Property workspace
   * @readonly
   *
   * @description
   * Repository persisting normalized mission workspaces.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {MissionWorkspaceRepository}
   */
  private readonly workspace: MissionWorkspaceRepository = inject(MissionWorkspaceRepository);

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
   * Persists a normalized mission workspace locally.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MissionOutput} mission - mission value.
   * @param {readonly MissionWorkItemOutput[]} workItems - work Items value.
   * @param {readonly MissionChangeOutput[]} changes - changes value.
   * @param {readonly MissionIssueOutput[]} issues - issues value.
   * @param {readonly unknown[]} [resources] - resources value.
   * @param {{ readonly replace?: boolean }} [options] - options value.
   *
   * @return {Promise<void>} Result of the save workspace operation.
   */
  public async saveWorkspace(
    mission: MissionOutput,
    workItems: readonly MissionWorkItemOutput[],
    changes: readonly MissionChangeOutput[],
    issues: readonly MissionIssueOutput[],
    resources: readonly unknown[] = [],
    options: { readonly replace?: boolean } = {},
  ): Promise<void> {
    if (options.replace === undefined && (await this.outbox.listOutbox(mission.id)).length > 0) {
      return;
    }
    await this.workspace.saveWorkspace(mission, workItems, changes, issues, resources, options);
  }

  /**
   * Method getWorkspace
   * @method getWorkspace
   *
   * @description
   * Reads a locally persisted mission workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - mission Id value.
   *
   * @return {Promise<{
   * mission: MissionOutput;
   * workItems: readonly MissionWorkItemOutput[];
   * changes: readonly MissionChangeOutput[];
   * issues: readonly MissionIssueOutput[];
   * } | null>} Result of the get workspace operation.
   */
  public getWorkspace(missionId: string): Promise<MissionWorkspaceSnapshot | null> {
    return this.workspace.getWorkspace(missionId);
  }

  /**
   * Method listMissions
   * @method listMissions
   *
   * @description
   * Lists locally persisted missions belonging to one organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization identifier.
   *
   * @return {Promise<readonly MissionOutput[]>} Locally persisted missions.
   */
  public listMissions(organizationId: string): Promise<readonly MissionOutput[]> {
    return this.workspace.listMissions(organizationId);
  }

  /**
   * Method organizationIdForMission
   * @method organizationIdForMission
   *
   * @description
   * Resolves the organization owning a locally persisted mission.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - Mission identifier.
   *
   * @return {Promise<string | null>} Owning organization identifier when available.
   */
  public organizationIdForMission(missionId: string): Promise<string | null> {
    return this.workspace.organizationIdForMission(missionId);
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
   * @param {string} missionId - Mission identifier.
   * @param {MissionOutboxType} type - Operation type.
   * @param {MissionOutboxPayloadMap[Type]} payload - Operation payload.
   *
   * @return {Promise<void>} A promise resolving once the operation is queued.
   */
  public queue<Type extends MissionOutboxType>(
    missionId: string,
    type: Type,
    payload: MissionOutboxPayloadMap[Type],
  ): Promise<void> {
    return this.outbox.queue(missionId, type, payload);
  }

  /**
   * Atomically queues every operation belonging to one field intention.
   */
  public queueMany(
    missionId: string,
    entries: readonly MissionOutboxQueueEntry[],
  ): Promise<readonly string[]> {
    return this.outbox.queueMany(missionId, entries);
  }

  /**
   * Method listOutbox
   * @method listOutbox
   *
   * @description
   * Lists queued operations for one mission.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - Mission identifier.
   *
   * @return {Promise<readonly MissionOutboxOperation[]>} A promise resolving with the queued operations.
   */
  public listOutbox(missionId: string): Promise<readonly MissionOutboxOperation[]> {
    return this.outbox.listOutbox(missionId);
  }

  /**
   * Method listMissionIdsWithOutbox
   * @method listMissionIdsWithOutbox
   *
   * @description
   * Lists the distinct mission identifiers that still have queued operations.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<readonly string[]>} Result of the list mission ids with outbox operation.
   */
  public listMissionIdsWithOutbox(): Promise<readonly string[]> {
    return this.outbox.listMissionIdsWithOutbox();
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
   * Method clearMission
   * @method clearMission
   *
   * @description
   * Clears local snapshot and outbox entries for one mission, then recomputes
   * the pending-sync state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - Mission identifier.
   *
   * @return {Promise<void>} A promise resolving once local mission data is cleared.
   */
  public async clearMission(missionId: string): Promise<void> {
    await this.database.ensureOwnerBound();
    const missionIri = `/api/missions/${missionId}`;
    await Promise.all([
      this.database.remove('missions', missionId),
      this.database.removeWhere<MissionWorkItemOutput>(
        'workItems',
        (item) => item.mission === missionIri,
      ),
      this.database.removeWhere<MissionChangeOutput>(
        'changes',
        (change) => change.mission === missionIri,
      ),
      this.database.removeWhere<MissionScopedRecord>(
        'resources',
        (resource) => resource.missionId === missionId,
      ),
      this.database.removeWhere<MissionScopedRecord>(
        'media',
        (media) => media.missionId === missionId,
      ),
      this.database.removeWhere<MissionOutboxOperation>(
        'outbox',
        (operation) => operation.missionId === missionId,
      ),
    ]);
    await this.outbox.refresh();
  }

  /**
   * Method clearAll
   * @method clearAll
   *
   * @description
   * Clears all mission offline stores and recomputes the pending-sync state.
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
