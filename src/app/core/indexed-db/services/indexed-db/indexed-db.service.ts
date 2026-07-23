import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { IndexedDbSchema, IndexedEntry } from '@core/indexed-db/models';

/** Key the owner binding is recorded under, inside the schema's owner store. */
const OWNER_KEY = 'ownerUserId';

/**
 * Service IndexedDbService
 * @class IndexedDbService
 *
 * @description
 * Base class for a feature's local IndexedDB database: the connection, the
 * store-agnostic CRUD primitives, and the per-user owner binding that stops
 * locally persisted data from leaking across authenticated users.
 *
 * Extend it and declare a {@link schema}, the same way feature API services
 * extend `HydraApiService`. It is deliberately not injectable on its own —
 * there is no such thing as "the" database, only a feature's.
 *
 * Two properties are inherited and worth knowing about. It never caches the
 * connection: every primitive re-opens the database, which keeps the class free
 * of invalidation logic at the cost of a handle per call. And it creates no
 * indexes, so every filtered read is a full `getAll()` plus an in-memory
 * filter — fine for the small, per-user working sets it is meant to hold, and
 * something to reconsider before storing anything large.
 *
 * `core` cannot depend on a feature, so the owner id is a parameter rather than
 * something read from an identity port: the owning feature passes it in.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export abstract class IndexedDbService {
  //#region Properties
  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the service runs in a browser platform with IndexedDB access.
   *
   * Public on purpose: the layers above guard on it too, so that an effect or
   * a repository never schedules work that would no-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  public readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property schema
   * @readonly
   *
   * @description
   * The database this service owns.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {IndexedDbSchema}
   */
  protected abstract readonly schema: IndexedDbSchema;

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
   * Method resetOwnerData
   * @method resetOwnerData
   *
   * @description
   * Clears the owner binding and every locally persisted record. Called on
   * logout.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} A promise resolving once the database is empty.
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
   * Ensures locally persisted data never crosses authenticated users: if the
   * stores belonged to someone else they are wiped before the new owner is
   * recorded.
   *
   * Binding work is chained on a serialized promise so concurrent callers
   * await the same operation rather than racing two wipes.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string | null} ownerId - User to bind the local stores to.
   *
   * @return {Promise<void>} A promise resolving once the stores are bound.
   */
  public ensureOwnerBound(ownerId: string | null): Promise<void> {
    if (!this.browser || !ownerId || this.ownerUserId === ownerId) return this.ownerBinding;

    this.ownerUserId = ownerId;
    this.ownerBinding = this.ownerBinding
      .catch(() => undefined)
      .then(() => this.bindToOwner(ownerId))
      .catch((error: unknown) => {
        if (this.ownerUserId === ownerId) this.ownerUserId = null;
        throw error;
      });

    return this.ownerBinding;
  }

  /**
   * Method bindToOwner
   * @method bindToOwner
   *
   * @description
   * Clears local stores when they belonged to a different user, then records
   * the new owner.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} ownerId - Authenticated user identifier.
   *
   * @return {Promise<void>} A promise resolving once the owner is recorded.
   */
  private async bindToOwner(ownerId: string): Promise<void> {
    const previousOwnerId = await this.get<string>(this.schema.ownerStoreName, OWNER_KEY);

    if (previousOwnerId !== ownerId) {
      await this.clearAll();
    }

    await this.put(this.schema.ownerStoreName, OWNER_KEY, ownerId);
  }
  //#endregion

  //#region Primitives
  /**
   * Method put
   * @method put
   *
   * @description
   * Writes one value into an object store. No-op on the server.
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
   * Writes multiple values into one object store within a single transaction.
   * No-op on the server or for empty input.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   * @param {readonly IndexedEntry<unknown>[]} entries - Key/value pairs to write.
   *
   * @return {Promise<void>} A promise resolving once every value is stored.
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
   * Method putTransaction
   * @method putTransaction
   *
   * @description
   * Writes values across several object stores in one transaction — the way to
   * express "one durable intention" that spans stores.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {Readonly<Record<string, readonly IndexedEntry<unknown>[]>>} entries - Store name to entries.
   *
   * @return {Promise<void>} A promise resolving once the transaction commits.
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
   * Reads one value. Returns `null` on the server or when the record does not
   * exist.
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
   * Reads every value of an object store. Returns an empty array on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   *
   * @return {Promise<readonly T[]>} A promise resolving with every stored value.
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
   * Counts the records of an object store. Returns `0` on the server.
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
   * Deletes one record. No-op on the server.
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
   * Deletes every record matching a predicate, iterating with a cursor in a
   * single transaction. No-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} storeName - Target object store.
   * @param {(value: T, key: IDBValidKey) => boolean} predicate - Whether to delete a record.
   *
   * @return {Promise<void>} A promise resolving once the transaction commits.
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
   * Clears every store the schema declares. Used notably on logout and when
   * the owner changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} A promise resolving once every store is cleared.
   */
  public async clearAll(): Promise<void> {
    if (!this.browser) return;
    const database = await this.open();
    const storeNames: readonly string[] = this.schema.storeNames;
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) {
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
   * Opens the database, creating any missing store and dropping any retired
   * one on the way.
   *
   * The upgrade path never reads `oldVersion`: it is idempotent by
   * construction, which is what lets a schema change be a one-line edit rather
   * than a migration ladder.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {Promise<IDBDatabase>} A promise resolving with the open database handle.
   */
  private open(): Promise<IDBDatabase> {
    const schema: IndexedDbSchema = this.schema;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(schema.name, schema.version);
      request.addEventListener('upgradeneeded', () => {
        const database = request.result;

        for (const storeName of schema.retiredStoreNames ?? []) {
          if (database.objectStoreNames.contains(storeName)) {
            database.deleteObjectStore(storeName);
          }
        }

        for (const storeName of schema.storeNames) {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
          }
        }
      });
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });
  }
  //#endregion
}
