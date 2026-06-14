import { effect, inject, Injectable, signal, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { authStoreEvents } from '@features/auth/state';
import type {
  MissionOutboxOperation,
  MissionOutboxOperationFor,
  MissionOutboxPayloadMap,
  MissionOutboxQueueEntry,
  MissionOutboxType,
} from '@features/organization/features/missions/models';
import { MissionDatabaseService } from './mission-database.service';

/**
 * Service MissionOutboxStore
 * @class MissionOutboxStore
 *
 * @description
 * Owns the mission offline outbox: queues create/update operations for replay,
 * exposes pending-status for UI and update flows, and lets the sync service
 * dequeue or mark operations. Persists onto {@link MissionDatabaseService}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionOutboxStore {
  //#region Properties
  /**
   * Property database
   * @readonly
   *
   * @description
   * IndexedDB infrastructure backing the outbox object store.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MissionDatabaseService}
   */
  private readonly database: MissionDatabaseService = inject(MissionDatabaseService);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx signal events stream used to react to authentication events.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject(Events);

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Identity port exposing the authenticated user profile.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject<UserIdentityPort>(USER_IDENTITY_PORT);

  /**
   * Property unsynced
   * @readonly
   *
   * @description
   * Internal flag tracking whether queued operations remain in the outbox.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly unsynced: WritableSignal<boolean> = signal(false);

  /**
   * Property lastQueuedAt
   *
   * @description
   * Monotonic local timestamp preserving FIFO order for operations queued
   * within the same millisecond.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private lastQueuedAt: number = 0;

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
  public readonly hasUnsyncedChanges = this.unsynced.asReadonly();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the pending state on logout and recomputes it once the local
   * stores are bound to the authenticated user.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.events
      .on(authStoreEvents.logoutSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.unsynced.set(false));

    if (this.database.browser) {
      effect(() => {
        const profile = this.identity.profile();
        if (!profile?.sub) {
          return;
        }
        void this.database
          .ensureOwnerBound(profile.sub as string)
          .then(() => this.refresh())
          .catch(() => undefined);
      });
    }
  }
  //#endregion

  //#region Methods
  /**
   * Method queue
   * @method queue
   *
   * @description
   * Queues an operation for replay and marks unsynced state as true.
   * A `clientId` is attached to the payload for idempotent server replay.
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
  public async queue<Type extends MissionOutboxType>(
    missionId: string,
    type: Type,
    payload: MissionOutboxPayloadMap[Type],
  ): Promise<void> {
    await this.database.ensureOwnerBound();
    const clientId: string =
      typeof payload['clientId'] === 'string' ? payload['clientId'] : crypto.randomUUID();
    const queuedAt = Math.max(Date.now(), this.lastQueuedAt + 1);
    this.lastQueuedAt = queuedAt;
    const operation: MissionOutboxOperationFor<Type> = {
      id: crypto.randomUUID(),
      missionId,
      type,
      payload: { ...payload, clientId },
      createdAt: new Date(queuedAt).toISOString(),
      status: 'pending',
      error: null,
    };
    await this.database.put('outbox', operation.id, operation);
    this.unsynced.set(true);
  }

  /**
   * Atomically queues every operation belonging to one field intention.
   */
  public async queueMany(
    missionId: string,
    entries: readonly MissionOutboxQueueEntry[],
  ): Promise<readonly string[]> {
    await this.database.ensureOwnerBound();
    const operations = entries.map((entry): MissionOutboxOperation => {
      const clientId =
        typeof entry.payload['clientId'] === 'string'
          ? entry.payload['clientId']
          : crypto.randomUUID();
      const queuedAt = Math.max(Date.now(), this.lastQueuedAt + 1);
      this.lastQueuedAt = queuedAt;
      return {
        id: crypto.randomUUID(),
        missionId,
        type: entry.type,
        payload: { ...entry.payload, clientId },
        createdAt: new Date(queuedAt).toISOString(),
        status: 'pending',
        error: null,
      } as MissionOutboxOperation;
    });

    await this.database.putTransaction({
      outbox: operations.map((operation) => ({ key: operation.id, value: operation })),
    });
    if (operations.length > 0) this.unsynced.set(true);
    return operations.map((operation) => operation.id);
  }

  /**
   * Method listOutbox
   * @method listOutbox
   *
   * @description
   * Lists queued operations for one mission, preserving field entry order.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - Mission identifier.
   *
   * @return {Promise<readonly MissionOutboxOperation[]>} A promise resolving with the queued operations.
   */
  public async listOutbox(missionId: string): Promise<readonly MissionOutboxOperation[]> {
    if (!this.database.browser) return [];
    await this.database.ensureOwnerBound();
    const operations = await this.database.getAll<MissionOutboxOperation>('outbox');
    return operations
      .filter((operation) => operation.missionId === missionId)
      .toSorted(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
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
  public async listMissionIdsWithOutbox(): Promise<readonly string[]> {
    if (!this.database.browser) return [];
    await this.database.ensureOwnerBound();
    const operations = await this.database.getAll<MissionOutboxOperation>('outbox');
    return [...new Set(operations.map((operation) => operation.missionId))];
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
  public async removeOutbox(id: string): Promise<void> {
    await this.database.ensureOwnerBound();
    await this.database.remove('outbox', id);
    await this.refresh();
  }

  /**
   * Method markOutboxConflict
   * @method markOutboxConflict
   *
   * @description
   * Marks one queued operation as a conflict and keeps unsynced state true.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - id value.
   * @param {string} error - error value.
   *
   * @return {Promise<void>} Result of the mark outbox conflict operation.
   */
  public async markOutboxConflict(id: string, error: string): Promise<void> {
    await this.database.ensureOwnerBound();
    const operation = await this.database.get<MissionOutboxOperation>('outbox', id);
    if (!operation) return;
    await this.database.put('outbox', id, { ...operation, status: 'conflict', error });
    this.unsynced.set(true);
  }

  /**
   * Marks one permanently rejected operation as failed for explicit user resolution.
   */
  public async markOutboxFailed(id: string, error: string): Promise<void> {
    await this.database.ensureOwnerBound();
    const operation = await this.database.get<MissionOutboxOperation>('outbox', id);
    if (!operation) return;
    await this.database.put('outbox', id, { ...operation, status: 'failed', error });
    this.unsynced.set(true);
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
  public async retryOutbox(id: string): Promise<void> {
    await this.database.ensureOwnerBound();
    const operation = await this.database.get<MissionOutboxOperation>('outbox', id);
    if (!operation) return;
    await this.database.put('outbox', id, { ...operation, status: 'pending', error: null });
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Recomputes whether any queued operations remain in the outbox.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} A promise resolving once the state is recomputed.
   */
  public async refresh(): Promise<void> {
    if (!this.database.browser) return;
    await this.database.ensureOwnerBound();
    const count = await this.database.count('outbox');
    this.unsynced.set(count > 0);
  }
  //#endregion
}
