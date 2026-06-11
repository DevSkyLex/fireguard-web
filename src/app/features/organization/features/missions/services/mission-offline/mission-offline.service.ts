import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { authStoreEvents } from '@features/auth/state';
import type { MissionSnapshot } from '@features/organization/features/missions/models';

/**
 * Type MissionOutboxType
 *
 * @description
 * Supported operation types queued in the mission offline outbox.
 */
export type MissionOutboxType =
  | 'facility.create'
  | 'equipment.create'
  | 'inspection.create'
  | 'media.create';

/**
 * Interface MissionOutboxOperation
 *
 * @description
 * Single queued operation persisted locally and replayed when connectivity
 * returns.
 */
export interface MissionOutboxOperation {
  readonly id: string;
  readonly missionId: string;
  readonly type: MissionOutboxType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

/**
 * Service MissionOfflineService
 * @class MissionOfflineService
 *
 * @description
 * Browser-only persistence service for mission offline workflows.
 *
 * Responsibilities:
 * - persist mission snapshots in IndexedDB,
 * - queue create/upload operations in an outbox,
 * - expose pending outbox status for UI and update flows,
 * - clear local mission data on logout to avoid cross-user leakage.
 *
 * @since 1.0.0
 */
@Injectable({ providedIn: 'root' })
export class MissionOfflineService {
  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly events: Events = inject(Events);
  private readonly unsynced: WritableSignal<boolean> = signal(false);
  public readonly hasUnsyncedChanges = this.unsynced.asReadonly();

  public constructor() {
    this.events
      .on(authStoreEvents.logoutSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.clearAll());
    if (this.browser) void this.refreshOutboxState();
  }

  /**
   * Method saveSnapshot
   *
   * @description
   * Persists a mission snapshot as the latest local recoverable state.
   */
  public async saveSnapshot(snapshot: MissionSnapshot): Promise<void> {
    await this.put('snapshots', snapshot.mission.id, snapshot);
  }

  /**
   * Method getSnapshot
   *
   * @description
   * Reads the latest local snapshot for a mission.
   */
  public async getSnapshot(missionId: string): Promise<MissionSnapshot | null> {
    return this.get<MissionSnapshot>('snapshots', missionId);
  }

  /**
   * Method queue
   *
   * @description
   * Queues an operation for replay and marks unsynced state as true.
   */
  public async queue(
    missionId: string,
    type: MissionOutboxType,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const operation: MissionOutboxOperation = {
      id: crypto.randomUUID(),
      missionId,
      type,
      payload: { ...payload, clientId: crypto.randomUUID() },
      createdAt: new Date().toISOString(),
    };
    await this.put('outbox', operation.id, operation);
    this.unsynced.set(true);
  }

  /**
   * Method listOutbox
   *
   * @description
   * Lists queued operations for one mission.
   */
  public async listOutbox(missionId: string): Promise<readonly MissionOutboxOperation[]> {
    if (!this.browser) return [];
    const database: IDBDatabase = await this.open();
    return new Promise((resolve, reject) => {
      const request: IDBRequest<MissionOutboxOperation[]> = database
        .transaction('outbox', 'readonly')
        .objectStore('outbox')
        .getAll();
      request.addEventListener('success', (): void =>
        resolve(request.result.filter((operation) => operation.missionId === missionId)),
      );
      request.addEventListener('error', (): void => reject(request.error));
    });
  }

  /**
   * Method removeOutbox
   *
   * @description
   * Removes one queued operation and recomputes unsynced state.
   */
  public async removeOutbox(id: string): Promise<void> {
    await this.remove('outbox', id);
    await this.refreshOutboxState();
  }

  /**
   * Method clearMission
   *
   * @description
   * Clears local snapshot and outbox entries for one mission.
   */
  public async clearMission(missionId: string): Promise<void> {
    await this.remove('snapshots', missionId);
    const operations: readonly MissionOutboxOperation[] = await this.listOutbox(missionId);
    await Promise.all(operations.map((operation) => this.remove('outbox', operation.id)));
    await this.refreshOutboxState();
  }

  /**
   * Method clearAll
   *
   * @description
   * Clears all mission offline stores. Used notably on logout.
   */
  public async clearAll(): Promise<void> {
    if (!this.browser) return;
    const database: IDBDatabase = await this.open();
    await Promise.all(
      ['snapshots', 'outbox'].map(
        (storeName) =>
          new Promise<void>((resolve, reject) => {
            const request: IDBRequest<undefined> = database
              .transaction(storeName, 'readwrite')
              .objectStore(storeName)
              .clear();
            request.addEventListener('success', (): void => resolve());
            request.addEventListener('error', (): void => reject(request.error));
          }),
      ),
    );
    this.unsynced.set(false);
  }

  /**
   * Method refreshOutboxState
   *
   * @description
   * Recomputes whether any queued operations remain in outbox.
   */
  private async refreshOutboxState(): Promise<void> {
    if (!this.browser) return;
    const database: IDBDatabase = await this.open();
    const count: number = await new Promise((resolve, reject) => {
      const request: IDBRequest<number> = database
        .transaction('outbox', 'readonly')
        .objectStore('outbox')
        .count();
      request.addEventListener('success', (): void => resolve(request.result));
      request.addEventListener('error', (): void => reject(request.error));
    });
    this.unsynced.set(count > 0);
  }

  private async put(storeName: string, key: string, value: unknown): Promise<void> {
    if (!this.browser) return;
    const database: IDBDatabase = await this.open();
    await new Promise<void>((resolve, reject) => {
      const request: IDBRequest<IDBValidKey> = database
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .put(value, key);
      request.addEventListener('success', (): void => resolve());
      request.addEventListener('error', (): void => reject(request.error));
    });
  }

  private async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.browser) return null;
    const database: IDBDatabase = await this.open();
    return new Promise((resolve, reject) => {
      const request: IDBRequest<T | undefined> = database
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .get(key);
      request.addEventListener('success', (): void => resolve(request.result ?? null));
      request.addEventListener('error', (): void => reject(request.error));
    });
  }

  private async remove(storeName: string, key: string): Promise<void> {
    if (!this.browser) return;
    const database: IDBDatabase = await this.open();
    await new Promise<void>((resolve, reject) => {
      const request: IDBRequest<undefined> = database
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .delete(key);
      request.addEventListener('success', (): void => resolve());
      request.addEventListener('error', (): void => reject(request.error));
    });
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open('fireguard-field-missions', 1);
      request.addEventListener('upgradeneeded', (): void => {
        const database: IDBDatabase = request.result;
        if (!database.objectStoreNames.contains('snapshots'))
          database.createObjectStore('snapshots');
        if (!database.objectStoreNames.contains('outbox')) database.createObjectStore('outbox');
      });
      request.addEventListener('success', (): void => resolve(request.result));
      request.addEventListener('error', (): void => reject(request.error));
    });
  }
}
