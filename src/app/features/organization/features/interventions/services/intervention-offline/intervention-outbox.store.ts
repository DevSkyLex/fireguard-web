import { effect, inject, Injectable, signal, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { authStoreEvents } from '@features/auth/state';
import type {
  InterventionOutboxOperation,
  InterventionOutboxOperationFor,
  InterventionOutboxPayloadMap,
  InterventionOutboxQueueEntry,
  InterventionOutboxType,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from './intervention-database.service';

/**
 * Service InterventionOutboxStore
 * @class InterventionOutboxStore
 *
 * @description
 * Owns the intervention offline outbox: queues create/update operations for replay,
 * exposes pending-status for UI and update flows, and lets the sync service
 * dequeue or mark operations. Persists onto {@link InterventionDatabaseService}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionOutboxStore {
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
   * @type {InterventionDatabaseService}
   */
  private readonly database: InterventionDatabaseService = inject<InterventionDatabaseService>(InterventionDatabaseService);

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
  private readonly events: Events = inject<Events>(Events);

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
  private readonly unsynced: WritableSignal<boolean> = signal<boolean>(false);

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
   * @param {string} interventionId - Intervention identifier.
   * @param {InterventionOutboxType} type - Operation type.
   * @param {InterventionOutboxPayloadMap[Type]} payload - Operation payload.
   *
   * @return {Promise<void>} A promise resolving once the operation is queued.
   */
  public async queue<Type extends InterventionOutboxType>(
    interventionId: string,
    type: Type,
    payload: InterventionOutboxPayloadMap[Type],
  ): Promise<void> {
    await this.database.ensureOwnerBound();
    const clientId: string =
      typeof payload['clientId'] === 'string' ? payload['clientId'] : crypto.randomUUID();
    const queuedAt = Math.max(Date.now(), this.lastQueuedAt + 1);
    this.lastQueuedAt = queuedAt;
    const operation: InterventionOutboxOperationFor<Type> = {
      id: crypto.randomUUID(),
      interventionId,
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
    interventionId: string,
    entries: readonly InterventionOutboxQueueEntry[],
  ): Promise<readonly string[]> {
    await this.database.ensureOwnerBound();
    const operations = entries.map((entry): InterventionOutboxOperation => {
      const clientId =
        typeof entry.payload['clientId'] === 'string'
          ? entry.payload['clientId']
          : crypto.randomUUID();
      const queuedAt = Math.max(Date.now(), this.lastQueuedAt + 1);
      this.lastQueuedAt = queuedAt;
      return {
        id: crypto.randomUUID(),
        interventionId,
        type: entry.type,
        payload: { ...entry.payload, clientId },
        createdAt: new Date(queuedAt).toISOString(),
        status: 'pending',
        error: null,
      } as InterventionOutboxOperation;
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
   * Lists queued operations for one intervention, preserving field entry order.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Intervention identifier.
   *
   * @return {Promise<readonly InterventionOutboxOperation[]>} A promise resolving with the queued operations.
   */
  public async listOutbox(interventionId: string): Promise<readonly InterventionOutboxOperation[]> {
    if (!this.database.browser) return [];
    await this.database.ensureOwnerBound();
    const operations = await this.database.getAll<InterventionOutboxOperation>('outbox');
    return operations
      .filter((operation) => operation.interventionId === interventionId)
      .toSorted(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
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
  public async listInterventionIdsWithOutbox(): Promise<readonly string[]> {
    if (!this.database.browser) return [];
    await this.database.ensureOwnerBound();
    const operations = await this.database.getAll<InterventionOutboxOperation>('outbox');
    return [...new Set(operations.map((operation) => operation.interventionId))];
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
    const operation = await this.database.get<InterventionOutboxOperation>('outbox', id);
    if (!operation) return;
    await this.database.put('outbox', id, { ...operation, status: 'conflict', error });
    this.unsynced.set(true);
  }

  /**
   * Marks one permanently rejected operation as failed for explicit user resolution.
   */
  public async markOutboxFailed(id: string, error: string): Promise<void> {
    await this.database.ensureOwnerBound();
    const operation = await this.database.get<InterventionOutboxOperation>('outbox', id);
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
    const operation = await this.database.get<InterventionOutboxOperation>('outbox', id);
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
