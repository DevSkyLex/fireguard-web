import {
  effect,
  inject,
  Injectable,
  Injector,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { pageVisibility } from '@signality/core';
import { ConnectivityService } from '@core/services/connectivity';
import { MissionOfflineService } from '../mission-offline';
import { MissionSyncService } from '../mission-sync';

/**
 * Service MissionSyncCoordinatorService
 * @class MissionSyncCoordinatorService
 *
 * @description
 * Provides mission sync coordinator operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionSyncCoordinatorService {
  /**
   * Property syncingState
   * @readonly
   *
   * @description
   * Provides the syncing state value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly syncingState: WritableSignal<boolean> = signal(false);

  private readonly blockedOperationsState: WritableSignal<number> = signal(0);

  private readonly problemState: WritableSignal<string | null> = signal(null);

  /**
   * Property syncing
   * @readonly
   *
   * @description
   * Provides the syncing value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly syncing: Signal<boolean> = this.syncingState.asReadonly();

  public readonly blockedOperations: Signal<number> = this.blockedOperationsState.asReadonly();

  public readonly problem: Signal<string | null> = this.problemState.asReadonly();

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Provides the offline value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MissionOfflineService}
   */
  private readonly offline: MissionOfflineService = inject(MissionOfflineService);

  /**
   * Property sync
   * @readonly
   *
   * @description
   * Provides the sync value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MissionSyncService}
   */
  private readonly sync: MissionSyncService = inject(MissionSyncService);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Owning injector used to create the connectivity effect lazily from
   * within `start()`, outside of the constructor injection context.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared connectivity source of truth. Its `online` signal drives outbox
   * replay when connectivity is regained.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property visibility
   * @readonly
   *
   * @description
   * Reactive page visibility signal. Used to replay the outbox when the
   * user brings the application tab back to the foreground. SSR-safe.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<DocumentVisibilityState>}
   */
  private readonly visibility: Signal<DocumentVisibilityState> = pageVisibility();

  /**
   * Property started
   *
   * @description
   * Provides the started value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private started: boolean = false;

  /**
   * Method start
   * @method start
   *
   * @description
   * Starts the connectivity watcher. A reactive effect replays the outbox
   * whenever the application is both online and visible, covering the
   * "connectivity regained" and "tab brought back to foreground" cases
   * previously handled by manual `online` / `visibilitychange` listeners.
   * Idempotent and a no-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void} Result of the start operation.
   */
  public start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    effect(
      (): void => {
        if (this.connectivity.online() && this.visibility() === 'visible') {
          untracked(() => void this.syncAll());
        }
      },
      { injector: this.injector },
    );
  }

  /**
   * Method syncAll
   * @method syncAll
   *
   * @description
   * Executes the sync all operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} Result of the sync all operation.
   */
  public async syncAll(): Promise<void> {
    if (this.connectivity.isOffline() || this.syncing()) {
      return;
    }
    this.syncingState.set(true);
    this.problemState.set(null);
    try {
      const missionIds = await this.offline.listMissionIdsWithOutbox();
      await missionIds.reduce(
        (previous, missionId) =>
          previous.then(async (): Promise<void> => {
            const organizationId = await this.offline.organizationIdForMission(missionId);
            if (!organizationId) return;
            try {
              await this.sync.replayOutbox(organizationId, missionId);
            } catch {
              this.problemState.set('A temporary synchronization error interrupted this mission.');
            }
          }),
        Promise.resolve(),
      );
    } finally {
      await this.refreshStatus();
      this.syncingState.set(false);
    }
  }

  /**
   * Retries operations that require explicit user resolution.
   */
  public async retryBlocked(): Promise<void> {
    const missionIds = await this.offline.listMissionIdsWithOutbox();
    const operations = (
      await Promise.all(missionIds.map((missionId) => this.offline.listOutbox(missionId)))
    ).flat();
    await Promise.all(
      operations
        .filter((operation) => operation.status === 'conflict' || operation.status === 'failed')
        .map((operation) => this.offline.retryOutbox(operation.id)),
    );
    await this.syncAll();
  }

  /**
   * Refreshes the blocked-operation summary exposed to mission UI.
   */
  public async refreshStatus(): Promise<void> {
    const missionIds = await this.offline.listMissionIdsWithOutbox();
    const operations = (
      await Promise.all(missionIds.map((missionId) => this.offline.listOutbox(missionId)))
    ).flat();
    const blocked = operations.filter(
      (operation) => operation.status === 'conflict' || operation.status === 'failed',
    );
    this.blockedOperationsState.set(blocked.length);
    if (blocked[0]?.error) this.problemState.set(blocked[0].error);
  }
}
