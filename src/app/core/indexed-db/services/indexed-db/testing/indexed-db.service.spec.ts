import { Service, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { IndexedDbSchema, IndexedEntry } from '@core/indexed-db/models';
import { IndexedDbService } from '../indexed-db.service';

const SCHEMA: IndexedDbSchema = {
  name: 'test-database',
  version: 1,
  storeNames: ['outbox', 'metadata'],
  ownerStoreName: 'metadata',
};

/**
 * A database whose stores live in a Map.
 *
 * Overriding the four primitives the owner binding uses is what makes that
 * logic testable at all — there is no fake IndexedDB in this project, and the
 * binding is the part worth proving, since getting it wrong leaks one user's
 * records to the next.
 */
@Service({ autoProvided: false })
class InMemoryDatabase extends IndexedDbService {
  public override readonly browser: boolean = true;

  public readonly store = new Map<string, unknown>();

  public clearAllCalls = 0;

  protected readonly schema: IndexedDbSchema = SCHEMA;

  public override async get<T>(storeName: string, key: string): Promise<T | null> {
    return (this.store.get(`${storeName}:${key}`) as T | undefined) ?? null;
  }

  public override async getAll<T>(storeName: string): Promise<readonly T[]> {
    const prefix = `${storeName}:`;
    const values: T[] = [];
    for (const [entryKey, value] of this.store) {
      if (entryKey.startsWith(prefix)) values.push(value as T);
    }

    return values;
  }

  public override async count(storeName: string): Promise<number> {
    return (await this.getAll(storeName)).length;
  }

  public override async put(storeName: string, key: string, value: unknown): Promise<void> {
    this.store.set(`${storeName}:${key}`, value);
  }

  public override async putMany(
    storeName: string,
    entries: readonly IndexedEntry<unknown>[],
  ): Promise<void> {
    for (const entry of entries) {
      this.store.set(`${storeName}:${entry.key}`, entry.value);
    }
  }

  public override async putTransaction(
    entries: Readonly<Record<string, readonly IndexedEntry<unknown>[]>>,
  ): Promise<void> {
    for (const [storeName, storeEntries] of Object.entries(entries)) {
      for (const entry of storeEntries) {
        this.store.set(`${storeName}:${entry.key}`, entry.value);
      }
    }
  }

  public override async remove(storeName: string, key: string): Promise<void> {
    this.store.delete(`${storeName}:${key}`);
  }

  public override async removeWhere<T>(
    storeName: string,
    predicate: (value: T, key: IDBValidKey) => boolean,
  ): Promise<void> {
    const prefix = `${storeName}:`;
    for (const [entryKey, value] of this.store) {
      if (!entryKey.startsWith(prefix)) continue;
      const key = entryKey.slice(prefix.length);
      if (predicate(value as T, key)) this.store.delete(entryKey);
    }
  }

  public override async clearAll(): Promise<void> {
    this.clearAllCalls += 1;
    this.store.clear();
  }
}

/** Same database, but on the server. */
@Service({ autoProvided: false })
class ServerDatabase extends IndexedDbService {
  protected readonly schema: IndexedDbSchema = SCHEMA;
}

/**
 * Service UpgradedDatabase
 * @class UpgradedDatabase
 * @description Exercises the native IndexedDB boundary with a feature-owned schema upgrade.
 * @version 1.0.0
 */
@Service({ autoProvided: false })
class UpgradedDatabase extends IndexedDbService {
  /**
   * Property schema
   * @readonly
   * @description Includes existing, new and retired stores to verify upgrades preserve active data.
   * @access protected
   * @since 1.0.0
   * @type {IndexedDbSchema}
   */
  protected readonly schema: IndexedDbSchema = {
    ...SCHEMA,
    version: 2,
    retiredStoreNames: ['legacy', 'already-retired'],
  };
}

/**
 * Function browserRequest
 * @description Supplies browser events without replacing the database service's implementation.
 * @access private
 * @since 1.0.0
 * @template T - The value returned by a native IndexedDB request.
 * @param {T} result - Result exposed when the test dispatches success.
 * @returns {IDBRequest<T>} Controlled native request boundary.
 */
function browserRequest<T>(result: T): IDBRequest<T> {
  return Object.assign(new EventTarget(), { result, error: null }) as IDBRequest<T>;
}

describe('IndexedDbService', () => {
  describe('on the server', () => {
    let service: ServerDatabase;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [ServerDatabase, { provide: PLATFORM_ID, useValue: 'server' }],
      });
      service = TestBed.inject(ServerDatabase);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('should report that it is not on a browser', () => {
      expect(service.browser).toBe(false);
    });

    it('should answer every read with a type-appropriate empty value', async () => {
      // `indexedDB` does not exist here, so a guard that let one call through
      // would throw during SSR rather than degrade.
      await expect(service.get('metadata', 'ownerUserId')).resolves.toBeNull();
      await expect(service.getAll('outbox')).resolves.toEqual([]);
      await expect(service.count('outbox')).resolves.toBe(0);
    });

    it('should make every write a no-op', async () => {
      await expect(service.put('outbox', 'k', {})).resolves.toBeUndefined();
      await expect(service.putMany('outbox', [{ key: 'k', value: {} }])).resolves.toBeUndefined();
      await expect(
        service.putTransaction({ outbox: [{ key: 'k', value: {} }] }),
      ).resolves.toBeUndefined();
      await expect(
        service.updateTransaction({ outbox: ['k'] }, () => ({})),
      ).resolves.toBeUndefined();
      await expect(service.remove('outbox', 'k')).resolves.toBeUndefined();
      await expect(service.removeWhere('outbox', () => true)).resolves.toBeUndefined();
      await expect(service.clearAll()).resolves.toBeUndefined();
    });

    it('should never bind an owner', async () => {
      await expect(service.ensureOwnerBound('user-1')).resolves.toBeUndefined();
    });
  });

  describe('CRUD primitives', () => {
    let service: InMemoryDatabase;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [InMemoryDatabase, { provide: PLATFORM_ID, useValue: 'browser' }],
      });
      service = TestBed.inject(InMemoryDatabase);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('should read back a value written with put', async () => {
      await service.put('outbox', 'item-1', { body: 'draft' });

      await expect(service.get('outbox', 'item-1')).resolves.toEqual({ body: 'draft' });
    });

    it('should return null for a missing key', async () => {
      await expect(service.get('outbox', 'missing')).resolves.toBeNull();
    });

    it('should write multiple entries with putMany', async () => {
      await service.putMany('outbox', [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);

      await expect(service.getAll('outbox')).resolves.toEqual(
        expect.arrayContaining([1, 2]) as unknown as readonly number[],
      );
    });

    it('should no-op putMany on empty input', async () => {
      await expect(service.putMany('outbox', [])).resolves.toBeUndefined();
      await expect(service.getAll('outbox')).resolves.toEqual([]);
    });

    it('should write entries across stores with putTransaction', async () => {
      await service.putTransaction({
        outbox: [{ key: 'a', value: 1 }],
        metadata: [{ key: 'flag', value: true }],
      });

      await expect(service.get('outbox', 'a')).resolves.toBe(1);
      await expect(service.get('metadata', 'flag')).resolves.toBe(true);
    });

    it('should count the records of a store', async () => {
      await service.putMany('outbox', [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);

      await expect(service.count('outbox')).resolves.toBe(2);
    });

    it('should return 0 for an empty store', async () => {
      await expect(service.count('outbox')).resolves.toBe(0);
    });

    it('should delete one record with remove', async () => {
      await service.put('outbox', 'a', 1);
      await service.put('outbox', 'b', 2);

      await service.remove('outbox', 'a');

      await expect(service.get('outbox', 'a')).resolves.toBeNull();
      await expect(service.get('outbox', 'b')).resolves.toBe(2);
    });

    it('should delete only matching records with removeWhere', async () => {
      await service.putMany('outbox', [
        { key: 'a', value: { synced: true } },
        { key: 'b', value: { synced: false } },
      ]);

      await service.removeWhere<{ synced: boolean }>('outbox', (value) => value.synced);

      await expect(service.getAll('outbox')).resolves.toEqual([{ synced: false }]);
    });
  });

  describe('owner binding', () => {
    let service: InMemoryDatabase;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [InMemoryDatabase, { provide: PLATFORM_ID, useValue: 'browser' }],
      });
      service = TestBed.inject(InMemoryDatabase);
    });

    afterEach(() => TestBed.resetTestingModule());

    /** Binds a first owner and zeroes the counter, so each test reads as a delta. */
    async function settle(ownerId: string): Promise<void> {
      await service.ensureOwnerBound(ownerId);
      service.clearAllCalls = 0;
    }

    it('should wipe on a first bind, because an unowned database is not ours', async () => {
      await service.ensureOwnerBound('user-1');

      // Records with no recorded owner predate the binding or belong to
      // someone whose marker was lost; either way they must not be inherited.
      expect(service.clearAllCalls).toBe(1);
      expect(service.store.get('metadata:ownerUserId')).toBe('user-1');
    });

    it('should not re-bind the same owner twice', async () => {
      await settle('user-1');
      service.store.set('outbox:queued', { body: 'draft' });

      await service.ensureOwnerBound('user-1');

      // A wipe here would silently discard the member's queued work.
      expect(service.clearAllCalls).toBe(0);
      expect(service.store.get('outbox:queued')).toEqual({ body: 'draft' });
    });

    it('should wipe everything when the authenticated user changes', async () => {
      await settle('user-1');
      service.store.set('outbox:queued', { body: 'draft' });

      await service.ensureOwnerBound('user-2');

      expect(service.clearAllCalls).toBe(1);
      expect(service.store.get('outbox:queued')).toBeUndefined();
      expect(service.store.get('metadata:ownerUserId')).toBe('user-2');
    });

    it('should ignore a null owner rather than wiping', async () => {
      await settle('user-1');
      service.store.set('outbox:queued', { body: 'draft' });

      await service.ensureOwnerBound(null);

      // Signing out is not the same as switching user; the purge is a separate
      // deliberate call.
      expect(service.clearAllCalls).toBe(0);
      expect(service.store.get('outbox:queued')).toEqual({ body: 'draft' });
    });

    it('should serialize concurrent binds instead of racing two wipes', async () => {
      await settle('user-1');

      await Promise.all([service.ensureOwnerBound('user-2'), service.ensureOwnerBound('user-2')]);

      expect(service.clearAllCalls).toBe(1);
      expect(service.store.get('metadata:ownerUserId')).toBe('user-2');
    });

    it('should clear the binding and the data on reset', async () => {
      await settle('user-1');

      await service.resetOwnerData();

      expect(service.clearAllCalls).toBe(1);
      // The binding is gone too, so the same user re-binding is a fresh start
      // rather than a no-op that leaves the stores empty and unowned.
      await service.ensureOwnerBound('user-1');
      expect(service.store.get('metadata:ownerUserId')).toBe('user-1');
    });
  });

  describe('native browser requests', () => {
    let service: UpgradedDatabase;
    let database: IDBDatabase;
    let transaction: IDBTransaction;
    let openRequest: IDBOpenDBRequest;
    let valueRequest: IDBRequest<unknown>;
    let store: Pick<
      IDBObjectStore,
      'get' | 'getAll' | 'count' | 'put' | 'delete' | 'clear' | 'openCursor'
    >;
    let open: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      valueRequest = browserRequest<unknown>(null);
      store = {
        get: vi.fn(() => valueRequest),
        getAll: vi.fn(() => valueRequest as IDBRequest<unknown[]>),
        count: vi.fn(() => valueRequest as IDBRequest<number>),
        put: vi.fn(() => valueRequest as IDBRequest<IDBValidKey>),
        delete: vi.fn(() => valueRequest as IDBRequest<undefined>),
        clear: vi.fn(() => valueRequest as IDBRequest<undefined>),
        openCursor: vi.fn(() => valueRequest as IDBRequest<IDBCursorWithValue | null>),
      };
      transaction = Object.assign(new EventTarget(), {
        objectStore: vi.fn(() => store),
        error: null,
        abort: vi.fn(),
      }) as unknown as IDBTransaction;
      database = Object.assign(new EventTarget(), {
        transaction: vi.fn(() => transaction),
        objectStoreNames: {
          contains: vi.fn((name: string) => ['outbox', 'legacy'].includes(name)),
        },
        createObjectStore: vi.fn(),
        deleteObjectStore: vi.fn(),
        close: vi.fn(),
      }) as unknown as IDBDatabase;
      openRequest = browserRequest(database) as IDBOpenDBRequest;
      open = vi.fn(() => openRequest);
      vi.stubGlobal('indexedDB', { open });
      TestBed.configureTestingModule({
        providers: [UpgradedDatabase, { provide: PLATFORM_ID, useValue: 'browser' }],
      });
      service = TestBed.inject(UpgradedDatabase);
    });

    afterEach(() => {
      TestBed.resetTestingModule();
      vi.unstubAllGlobals();
    });

    /**
     * Function opened
     * @description Releases the database open request before the service issues its transaction.
     * @access private
     * @since 1.0.0
     * @returns {Promise<void>} The asynchronous open continuation has run.
     */
    async function opened(): Promise<void> {
      openRequest.dispatchEvent(new Event('success'));
      await Promise.resolve();
    }

    it.each(['put', 'remove', 'putTransaction'] as const)(
      'rejects obsolete %s before opening a write transaction after an A-B-A session change',
      async (method) => {
        let owner = 'account-a';
        let revision = 1;
        const capturedOwner = owner;
        const capturedRevision = revision;
        const isCurrent = (): boolean => owner === capturedOwner && revision === capturedRevision;
        const write =
          method === 'put'
            ? service.put('outbox', 'old-operation', { saved: true }, isCurrent)
            : method === 'remove'
              ? service.remove('outbox', 'old-operation', isCurrent)
              : service.putTransaction(
                  { outbox: [{ key: 'old-operation', value: { saved: true } }] },
                  isCurrent,
                );
        const rejected = expect(write).rejects.toMatchObject({ name: 'AbortError' });
        owner = 'account-b';
        revision = 2;
        owner = 'account-a';
        revision = 3;
        await opened();
        await rejected;
        expect(database.transaction).not.toHaveBeenCalled();
        expect(store.put).not.toHaveBeenCalled();
        expect(store.delete).not.toHaveBeenCalled();
      },
    );

    it.each([
      {
        method: 'get',
        invoke: (db: UpgradedDatabase) => db.get('outbox', 'draft-1'),
        result: { id: 1 },
        args: ['draft-1'],
      },
      {
        method: 'getAll',
        invoke: (db: UpgradedDatabase) => db.getAll('outbox'),
        result: [{ id: 1 }],
        args: [],
      },
      {
        method: 'count',
        invoke: (db: UpgradedDatabase) => db.count('outbox'),
        result: 2,
        args: [],
      },
    ] as const)(
      'reads $method through a readonly transaction and resolves the browser result',
      async ({ method, invoke, result, args }) => {
        const read = invoke(service);
        await opened();
        expect(database.transaction).toHaveBeenCalledWith('outbox', 'readonly');
        expect(transaction.objectStore).toHaveBeenCalledWith('outbox');
        expect(store[method]).toHaveBeenCalledWith(...args);
        Object.assign(valueRequest, { result });
        valueRequest.dispatchEvent(new Event('success'));
        await expect(read).resolves.toEqual(result);
      },
    );

    it('returns null when the browser cannot find the requested record', async () => {
      const read = service.get('outbox', 'missing');
      await opened();
      Object.assign(valueRequest, { result: undefined });
      valueRequest.dispatchEvent(new Event('success'));
      await expect(read).resolves.toBeNull();
    });

    it.each([
      {
        method: 'put',
        invoke: (db: UpgradedDatabase) => db.put('outbox', 'draft-1', { saved: true }),
        args: [{ saved: true }, 'draft-1'],
      },
      {
        method: 'delete',
        invoke: (db: UpgradedDatabase) => db.remove('outbox', 'draft-1'),
        args: ['draft-1'],
      },
    ] as const)(
      'writes $method with the correct key and waits for the transaction commit',
      async ({ method, invoke, args }) => {
        const write = invoke(service);
        const settled = vi.fn();
        void write.then(settled);
        await opened();
        expect(database.transaction).toHaveBeenCalledWith('outbox', 'readwrite');
        expect(store[method]).toHaveBeenCalledWith(...args);
        expect(settled).not.toHaveBeenCalled();
        valueRequest.dispatchEvent(new Event('success'));
        await Promise.resolve();
        expect(settled).not.toHaveBeenCalled();
        transaction.dispatchEvent(new Event('complete'));
        await expect(write).resolves.toBeUndefined();
      },
    );

    it.each([
      { method: 'put', event: 'abort' },
      { method: 'put', event: 'error' },
      { method: 'remove', event: 'abort' },
      { method: 'remove', event: 'error' },
    ] as const)(
      'rejects $method when its transaction reports $event after the request succeeds',
      async ({ method, event }) => {
        const failure = new DOMException('Storage quota exceeded', 'QuotaExceededError');
        const write =
          method === 'put'
            ? service.put('outbox', 'draft-1', { saved: true })
            : service.remove('outbox', 'draft-1');
        const rejected = expect(write).rejects.toBe(failure);
        await opened();
        valueRequest.dispatchEvent(new Event('success'));
        Object.assign(transaction, { error: failure });
        transaction.dispatchEvent(new Event(event));
        await rejected;
      },
    );

    it.each(['get', 'getAll', 'count', 'put', 'remove'] as const)(
      'propagates %s request failures',
      async (method) => {
        const failure = new DOMException('Storage unavailable', 'InvalidStateError');
        const result =
          method === 'put'
            ? service.put('outbox', 'draft-1', {})
            : method === 'get' || method === 'remove'
              ? service[method]('outbox', 'draft-1')
              : service[method]('outbox');
        const rejected = expect(result).rejects.toBe(failure);
        await opened();
        Object.assign(valueRequest, { error: failure });
        valueRequest.dispatchEvent(new Event('error'));
        await rejected;
      },
    );

    it('rejects with an Error when a failed request has no DOMException', async () => {
      const result = service.get('outbox', 'draft-1');
      const rejected = expect(result).rejects.toThrow('IndexedDB request failed');
      await opened();
      valueRequest.dispatchEvent(new Event('error'));
      await rejected;
    });

    it('does not open storage for empty batches or transactions', async () => {
      await service.putMany('outbox', []);
      await service.putTransaction({});
      await service.putTransaction({ outbox: [], metadata: [] });
      expect(open).not.toHaveBeenCalled();
    });

    it('waits for the complete batch transaction, not individual successful writes', async () => {
      const result = service.putMany('outbox', [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);
      const settled = vi.fn();
      void result.then(settled);
      await opened();
      expect(store.put).toHaveBeenNthCalledWith(1, 1, 'a');
      expect(store.put).toHaveBeenNthCalledWith(2, 2, 'b');
      valueRequest.dispatchEvent(new Event('success'));
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      transaction.dispatchEvent(new Event('complete'));
      await expect(result).resolves.toBeUndefined();
    });

    it('writes a multi-store intention in one transaction, ignoring empty stores', async () => {
      const outbox = { ...store, put: vi.fn(() => valueRequest as IDBRequest<IDBValidKey>) };
      const metadata = { ...store, put: vi.fn(() => valueRequest as IDBRequest<IDBValidKey>) };
      vi.mocked(transaction.objectStore).mockImplementation((name: string) => {
        if (name === 'outbox') return outbox as unknown as IDBObjectStore;
        if (name === 'metadata') return metadata as unknown as IDBObjectStore;
        throw new Error(`Unexpected store: ${name}`);
      });
      const result = service.putTransaction({
        outbox: [{ key: 'draft-1', value: { name: 'local' } }],
        metadata: [{ key: 'revision', value: 3 }],
        unused: [],
      });
      await opened();
      expect(database.transaction).toHaveBeenCalledExactlyOnceWith(
        ['outbox', 'metadata'],
        'readwrite',
      );
      expect(transaction.objectStore).toHaveBeenCalledWith('outbox');
      expect(transaction.objectStore).toHaveBeenCalledWith('metadata');
      expect(outbox.put).toHaveBeenCalledExactlyOnceWith({ name: 'local' }, 'draft-1');
      expect(metadata.put).toHaveBeenCalledExactlyOnceWith(3, 'revision');
      transaction.dispatchEvent(new Event('complete'));
      await expect(result).resolves.toBeUndefined();
    });

    it('derives writes from every read in the same transaction and waits for commit', async () => {
      const ownerRead = browserRequest<unknown>('account-1');
      const previousRead = browserRequest<unknown>({ count: 1 });
      const workspaceRead = browserRequest<unknown>({ organization: 'org-1' });
      const metadata = {
        ...store,
        get: vi.fn((key: string) => (key === 'ownerUserId' ? ownerRead : previousRead)),
        put: vi.fn(),
      };
      const outbox = { ...store, get: vi.fn(() => workspaceRead) };
      vi.mocked(transaction.objectStore).mockImplementation(
        (name: string) => (name === 'metadata' ? metadata : outbox) as unknown as IDBObjectStore,
      );
      const update = vi.fn(() => ({ metadata: [{ key: 'snapshot', value: { count: 2 } }] }));
      const write = service.updateTransaction(
        { metadata: ['ownerUserId', 'snapshot'], outbox: ['workspace'] },
        update,
      );
      const settled = vi.fn();
      void write.then(settled);
      await opened();
      expect(database.transaction).toHaveBeenCalledExactlyOnceWith(
        ['metadata', 'outbox'],
        'readwrite',
      );
      ownerRead.dispatchEvent(new Event('success'));
      previousRead.dispatchEvent(new Event('success'));
      expect(update).not.toHaveBeenCalled();
      workspaceRead.dispatchEvent(new Event('success'));
      expect(update).toHaveBeenCalledExactlyOnceWith({
        metadata: { ownerUserId: 'account-1', snapshot: { count: 1 } },
        outbox: { workspace: { organization: 'org-1' } },
      });
      expect(metadata.put).toHaveBeenCalledExactlyOnceWith({ count: 2 }, 'snapshot');
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      transaction.dispatchEvent(new Event('complete'));
      await expect(write).resolves.toBeUndefined();
    });

    it('aborts derived writes when scope changes while transaction reads are pending', async () => {
      let current = true;
      const update = vi.fn(() => ({ metadata: [{ key: 'snapshot', value: {} }] }));
      const write = service.updateTransaction({ metadata: ['snapshot'] }, update, () => current);
      const rejected = expect(write).rejects.toMatchObject({ name: 'AbortError' });
      await opened();
      current = false;
      valueRequest.dispatchEvent(new Event('success'));
      await rejected;
      expect(update).not.toHaveBeenCalled();
      expect(store.put).not.toHaveBeenCalled();
      expect(transaction.abort).toHaveBeenCalledOnce();
    });

    it('aborts the transaction and preserves the updater failure', async () => {
      const failure = new Error('Invalid saved workspace');
      const write = service.updateTransaction({ metadata: ['snapshot'] }, () => {
        throw failure;
      });
      const rejected = expect(write).rejects.toBe(failure);
      await opened();
      valueRequest.dispatchEvent(new Event('success'));
      await rejected;
      expect(store.put).not.toHaveBeenCalled();
      expect(transaction.abort).toHaveBeenCalledOnce();
    });

    it.each(['abort', 'error'])(
      'does not acknowledge an atomic update when its transaction reports %s',
      async (event) => {
        const failure = new DOMException('Device storage full', 'QuotaExceededError');
        const write = service.updateTransaction({ metadata: ['snapshot'] }, () => ({
          metadata: [{ key: 'snapshot', value: {} }],
        }));
        const rejected = expect(write).rejects.toBe(failure);
        await opened();
        valueRequest.dispatchEvent(new Event('success'));
        Object.assign(transaction, { error: failure });
        transaction.dispatchEvent(new Event(event));
        await rejected;
      },
    );

    it('propagates an atomic update read failure before running its updater', async () => {
      const failure = new DOMException('Storage unavailable', 'UnknownError');
      const update = vi.fn(() => ({}));
      const write = service.updateTransaction({ metadata: ['snapshot'] }, update);
      const rejected = expect(write).rejects.toBe(failure);
      await opened();
      Object.assign(valueRequest, { error: failure });
      valueRequest.dispatchEvent(new Event('error'));
      await rejected;
      expect(update).not.toHaveBeenCalled();
      expect(store.put).not.toHaveBeenCalled();
    });

    it('removes only matching cursor entries and completes after the transaction', async () => {
      const predicate = vi.fn(
        (value: { synced: boolean }, key: IDBValidKey) => value.synced && key === 'sent',
      );
      const result = service.removeWhere('outbox', predicate);
      await opened();
      const cursor = {
        key: 'pending',
        value: { synced: false },
        delete: vi.fn(),
        continue: vi.fn(),
      };
      Object.assign(valueRequest, { result: cursor });
      valueRequest.dispatchEvent(new Event('success'));
      expect(cursor.delete).not.toHaveBeenCalled();
      expect(cursor.continue).toHaveBeenCalledOnce();
      cursor.key = 'sent';
      cursor.value = { synced: true };
      valueRequest.dispatchEvent(new Event('success'));
      expect(cursor.delete).toHaveBeenCalledOnce();
      expect(cursor.continue).toHaveBeenCalledTimes(2);
      Object.assign(valueRequest, { result: null });
      valueRequest.dispatchEvent(new Event('success'));
      expect(predicate).toHaveBeenCalledTimes(2);
      transaction.dispatchEvent(new Event('complete'));
      await expect(result).resolves.toBeUndefined();
    });

    it('clears every declared store together', async () => {
      const result = service.clearAll();
      await opened();
      expect(database.transaction).toHaveBeenCalledExactlyOnceWith(
        ['outbox', 'metadata'],
        'readwrite',
      );
      expect(transaction.objectStore).toHaveBeenNthCalledWith(1, 'outbox');
      expect(transaction.objectStore).toHaveBeenNthCalledWith(2, 'metadata');
      expect(store.clear).toHaveBeenCalledTimes(2);
      transaction.dispatchEvent(new Event('complete'));
      await expect(result).resolves.toBeUndefined();
    });

    it.each(['abort', 'error'])(
      'rejects each batch operation when its transaction reports %s',
      async (event) => {
        const failure = new DOMException('Storage quota exceeded', 'QuotaExceededError');
        Object.assign(transaction, { error: failure });
        const results = [
          service.putMany('outbox', [{ key: 'a', value: 1 }]),
          service.putTransaction({ metadata: [{ key: 'a', value: 1 }] }),
          service.removeWhere('outbox', () => true),
          service.clearAll(),
        ];
        const rejected = results.map((result) => expect(result).rejects.toBe(failure));
        await opened();
        transaction.dispatchEvent(new Event(event));
        await Promise.all(rejected);
      },
    );

    it('rejects with an Error when an aborted transaction has no DOMException', async () => {
      const result = service.putMany('outbox', [{ key: 'draft-1', value: {} }]);
      const rejected = expect(result).rejects.toThrow('IndexedDB transaction aborted');
      await opened();
      transaction.dispatchEvent(new Event('abort'));
      await rejected;
    });

    it('upgrades the schema without recreating active stores and closes on a later upgrade', async () => {
      const result = service.count('outbox');
      expect(open).toHaveBeenCalledWith(SCHEMA.name, 2);
      openRequest.dispatchEvent(new Event('upgradeneeded'));
      expect(database.deleteObjectStore).toHaveBeenCalledExactlyOnceWith('legacy');
      expect(database.createObjectStore).toHaveBeenCalledExactlyOnceWith('metadata');
      await opened();
      Object.assign(valueRequest, { result: 0 });
      valueRequest.dispatchEvent(new Event('success'));
      await expect(result).resolves.toBe(0);
      database.dispatchEvent(new Event('versionchange'));
      expect(database.close).toHaveBeenCalledOnce();
    });

    it('reports a blocked upgrade instead of leaving offline callers pending forever', async () => {
      const result = service.getAll('outbox');
      const rejected = expect(result).rejects.toThrow('blocked upgrading to version 2');
      openRequest.dispatchEvent(new Event('blocked'));
      await rejected;
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('propagates a failed database open without starting a transaction', async () => {
      const failure = new DOMException('Database version is newer', 'VersionError');
      const result = service.getAll('outbox');
      const rejected = expect(result).rejects.toBe(failure);
      Object.assign(openRequest, { error: failure });
      openRequest.dispatchEvent(new Event('error'));
      await rejected;
      expect(database.transaction).not.toHaveBeenCalled();
    });
  });
});
