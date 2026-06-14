import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import type { IndexedEntry } from './models';

/**
 * Constant INTERVENTION_DATABASE_NAME
 * @const INTERVENTION_DATABASE_NAME
 *
 * @description
 * IndexedDB database name owning every intervention offline object store.
 *
 * @since 1.1.0
 *
 * @type {string}
 */
const INTERVENTION_DATABASE_NAME = 'fireguard-field-interventions';

/**
 * Constant INTERVENTION_DATABASE_VERSION
 * @const INTERVENTION_DATABASE_VERSION
 *
 * @description
 * Schema version of the intervention offline database.
 *
 * @since 1.1.0
 *
 * @type {number}
 */
const INTERVENTION_DATABASE_VERSION = 4;

/**
 * Constant INTERVENTION_STORE_NAMES
 * @const INTERVENTION_STORE_NAMES
 *
 * @description
 * Every object store cleared when local intervention data is purged.
 *
 * @since 1.1.0
 *
 * @type {readonly string[]}
 */
const INTERVENTION_STORE_NAMES = [
  'interventions',
  'workItems',
  'changes',
  'resources',
  'media',
  'outbox',
  'metadata',
] as const;

/**
 * Service InterventionDatabaseService
 * @class InterventionDatabaseService
 *
 * @description
 * Low-level IndexedDB infrastructure for intervention offline workflows. Owns the
 * database connection and schema, generic typed CRUD primitives and the
 * per-user owner binding that prevents local intervention data from leaking across
 * authenticated users. Domain persistence (workspace, outbox) is layered on
 * top of this service.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionDatabaseService {
  //#region Properties
  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the service runs in a browser platform with IndexedDB access.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  public readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

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
   * Property ownerBinding
   *
   * @description
   * Serialized owner-binding chain ensuring user checks never interleave.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Promise<void>}
   */
  private ownerBinding: Promise<void> = Promise.resolve();

  /**
   * Property ownerUserId
   *
   * @description
   * Identifier of the user the local stores are currently bound to.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string | null}
   */
  private ownerUserId: string | null = null;
  //#endregion

  //#region Owner binding
  /**
   * Clears the owner binding and all locally persisted intervention data.
   */
  public resetOwnerData(): Promise<void> {
    this.ownerUserId = null;
    this.ownerBinding = this.ownerBinding.catch(() => undefined).then(() => this.clearAll());
    return this.ownerBinding;
  }

  /**
   * Method ensureOwnerBound
   * @method ensureOwnerBound
   *
   * @description
   * Ensures locally persisted intervention data never crosses authenticated
   * users. Binding work is chained on a serialized promise so concurrent
   * calls await the same operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string | null} [userId] - User to bind; defaults to the current profile subject.
   *
   * @return {Promise<void>} A promise resolving once local stores are bound to the user.
   */
  public ensureOwnerBound(
    userId: string | null = this.identity.profile()?.sub ?? null,
  ): Promise<void> {
    if (!this.browser || !userId || this.ownerUserId === userId) return this.ownerBinding;

    this.ownerUserId = userId;
    this.ownerBinding = this.ownerBinding
      .catch(() => undefined)
      .then(() => this.bindToUser(userId))
      .catch((error: unknown) => {
        if (this.ownerUserId === userId) this.ownerUserId = null;
        throw error;
      });

    return this.ownerBinding;
  }

  /**
   * Method bindToUser
   * @method bindToUser
   *
   * @description
   * Clears local stores when they belonged to a different user, then records
   * the new owner in the metadata store.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} userId - Authenticated user identifier.
   *
   * @return {Promise<void>} A promise resolving once the owner is recorded.
   */
  private async bindToUser(userId: string): Promise<void> {
    const previousUserId = await this.get<string>('metadata', 'ownerUserId');
    if (previousUserId !== userId) {
      await this.clearAll();
    }
    await this.put('metadata', 'ownerUserId', userId);
  }
  //#endregion

  //#region Primitives
  /**
   * Method put
   * @method put
   *
   * @description
   * Writes one value into an IndexedDB object store. No-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   * @param {string} key - Record key.
   * @param {unknown} value - Record value.
   *
   * @return {Promise<void>} A promise resolving once the value is stored.
   */
  public async put(storeName: string, key: string, value: unknown): Promise<void> {
    if (!this.browser) return;
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .put(value, key);
      request.addEventListener('success', () => resolve());
      request.addEventListener('error', () => reject(request.error));
    });
  }

  /**
   * Method putMany
   * @method putMany
   *
   * @description
   * Writes multiple values into an IndexedDB object store within a single
   * transaction. No-op on the server or for empty input.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - store Name value.
   * @param {readonly IndexedEntry<unknown>[]} entries - entries value.
   *
   * @return {Promise<void>} Result of the put many operation.
   */
  public async putMany(
    storeName: string,
    entries: readonly IndexedEntry<unknown>[],
  ): Promise<void> {
    if (!this.browser || entries.length === 0) return;
    const database = await this.open();
    await new Promise<void>(
      (
        resolve: (value: void | PromiseLike<void>) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        for (const entry of entries) {
          store.put(entry.value, entry.key);
        }
        transaction.addEventListener('complete', () => resolve());
        transaction.addEventListener('abort', () => reject(transaction.error));
        transaction.addEventListener('error', () => reject(transaction.error));
      },
    );
  }

  /**
   * Writes values across several object stores in one IndexedDB transaction.
   */
  public async putTransaction(
    entries: Readonly<Record<string, readonly IndexedEntry<unknown>[]>>,
  ): Promise<void> {
    if (!this.browser) return;
    const storeNames = Object.keys(entries).filter(
      (storeName) => (entries[storeName]?.length ?? 0) > 0,
    );
    if (storeNames.length === 0) return;

    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        for (const entry of entries[storeName] ?? []) {
          store.put(entry.value, entry.key);
        }
      }
      transaction.addEventListener('complete', () => resolve());
      transaction.addEventListener('abort', () => reject(transaction.error));
      transaction.addEventListener('error', () => reject(transaction.error));
    });
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Reads one value from an IndexedDB object store. Returns `null` on the
   * server or when the record does not exist.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   * @param {string} key - Record key.
   *
   * @return {Promise<T | null>} A promise resolving with the stored value, or `null`.
   */
  public async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.browser) return null;
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      request.addEventListener('success', () => resolve(request.result ?? null));
      request.addEventListener('error', () => reject(request.error));
    });
  }

  /**
   * Method getAll
   * @method getAll
   *
   * @description
   * Reads every value of an IndexedDB object store. Returns an empty array on
   * the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - store Name value.
   *
   * @return {Promise<readonly T[]>} Result of the get all operation.
   */
  public async getAll<T>(storeName: string): Promise<readonly T[]> {
    if (!this.browser) return [];
    const database = await this.open();
    return new Promise(
      (
        resolve: (value: readonly T[] | PromiseLike<readonly T[]>) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      },
    );
  }

  /**
   * Method count
   * @method count
   *
   * @description
   * Counts the records of an IndexedDB object store. Returns `0` on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   *
   * @return {Promise<number>} A promise resolving with the record count.
   */
  public async count(storeName: string): Promise<number> {
    if (!this.browser) return 0;
    const database = await this.open();
    return new Promise<number>((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).count();
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes one record from an IndexedDB object store. No-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   * @param {string} key - Record key.
   *
   * @return {Promise<void>} A promise resolving once the record is deleted.
   */
  public async remove(storeName: string, key: string): Promise<void> {
    if (!this.browser) return;
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .delete(key);
      request.addEventListener('success', () => resolve());
      request.addEventListener('error', () => reject(request.error));
    });
  }

  /**
   * Method removeWhere
   * @method removeWhere
   *
   * @description
   * Deletes every record of an IndexedDB object store matching a predicate,
   * iterating with a cursor in a single transaction. No-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - store Name value.
   * @param {(value: T, key: IDBValidKey) => boolean} predicate - predicate value.
   *
   * @return {Promise<void>} Result of the remove where operation.
   */
  public async removeWhere<T>(
    storeName: string,
    predicate: (value: T, key: IDBValidKey) => boolean,
  ): Promise<void> {
    if (!this.browser) return;
    const database = await this.open();
    await new Promise<void>(
      (
        resolve: (value: void | PromiseLike<void>) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        const transaction = database.transaction(storeName, 'readwrite');
        const request = transaction.objectStore(storeName).openCursor();
        request.addEventListener('success', () => {
          const cursor = request.result;
          if (!cursor) return;
          if (predicate(cursor.value as T, cursor.key)) cursor.delete();
          cursor.continue();
        });
        transaction.addEventListener('complete', () => resolve());
        transaction.addEventListener('abort', () => reject(transaction.error));
        transaction.addEventListener('error', () => reject(transaction.error));
      },
    );
  }

  /**
   * Method clearAll
   * @method clearAll
   *
   * @description
   * Clears every intervention offline object store. Used notably on logout.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} A promise resolving once every store is cleared.
   */
  public async clearAll(): Promise<void> {
    if (!this.browser) return;
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(INTERVENTION_STORE_NAMES, 'readwrite');
      for (const storeName of INTERVENTION_STORE_NAMES) {
        transaction.objectStore(storeName).clear();
      }
      transaction.addEventListener('complete', () => resolve());
      transaction.addEventListener('abort', () => reject(transaction.error));
      transaction.addEventListener('error', () => reject(transaction.error));
    });
  }
  //#endregion

  //#region Connection
  /**
   * Method open
   * @method open
   *
   * @description
   * Opens (and upgrades when needed) the intervention IndexedDB database with its
   * normalized intervention stores, outbox and metadata.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {Promise<IDBDatabase>} A promise resolving with the open database handle.
   */
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INTERVENTION_DATABASE_NAME, INTERVENTION_DATABASE_VERSION);
      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (database.objectStoreNames.contains('snapshots'))
          database.deleteObjectStore('snapshots');
        if (!database.objectStoreNames.contains('interventions')) database.createObjectStore('interventions');
        if (!database.objectStoreNames.contains('workItems'))
          database.createObjectStore('workItems');
        if (!database.objectStoreNames.contains('changes')) database.createObjectStore('changes');
        if (!database.objectStoreNames.contains('resources'))
          database.createObjectStore('resources');
        if (!database.objectStoreNames.contains('media')) database.createObjectStore('media');
        if (!database.objectStoreNames.contains('outbox')) database.createObjectStore('outbox');
        if (!database.objectStoreNames.contains('metadata')) database.createObjectStore('metadata');
      });
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });
  }
  //#endregion
}
