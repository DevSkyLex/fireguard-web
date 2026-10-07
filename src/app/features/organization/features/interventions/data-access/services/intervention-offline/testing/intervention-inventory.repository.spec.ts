import { Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IndexedDbService, type IndexedDbSchema } from '@core/indexed-db';
import type { InterventionInventorySnapshot } from '@features/organization/features/interventions/models';
import type {
  InventoryConsumptionOutput,
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionInventoryRepository } from '../intervention-inventory.repository';

const metadataKey = 'inventorySnapshot:account-1:org-1:intervention-1';
const part: InventoryPartOutput = {
  '@id': '/api/organizations/org-1/inventory-parts/part-1',
  '@type': 'InventoryPart',
  id: 'part-1',
  code: 'SEAL',
  label: 'Safety seal',
  unit: 'piece',
  kind: 'part',
  archived: false,
};
const warehouse: InventoryWarehouseOutput = {
  '@id': '/api/organizations/org-1/inventory-warehouses/warehouse-1',
  '@type': 'InventoryWarehouse',
  id: 'warehouse-1',
  code: 'VAN',
  name: 'Technician van',
  archived: false,
};
const receipt: InventoryConsumptionOutput = {
  '@id': '/api/organizations/org-1/inventory-consumptions/receipt-1',
  '@type': 'InventoryConsumption',
  id: 'receipt-1',
  partId: 'part-1',
  warehouseId: 'warehouse-1',
  quantity: '2.000000',
  interventionId: 'intervention-1',
  actorId: 'account-1',
  occurredAt: '2026-10-06T10:00:00Z',
  status: 'received_pending',
  reason: 'insufficient_stock',
  movementId: null,
  late: false,
  replayed: false,
};
const completeSnapshot: InterventionInventorySnapshot = {
  version: 1,
  accountId: 'account-1',
  organizationId: 'org-1',
  interventionId: 'intervention-1',
  capturedAt: '2026-10-06T09:00:00Z',
  catalogComplete: true,
  declarationsComplete: true,
  parts: [part],
  warehouses: [warehouse],
  declarations: [],
};

/**
 * Function deferred
 *
 * @description
 * Holds a persistence boundary until the test changes its captured authorization or owner.
 *
 * @template Value - Value returned by the controlled read or write.
 *
 * @returns {{ promise: Promise<Value>; resolve: (value: Value) => void }} Controlled completion.
 */
function deferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

class BrowserDatabase extends IndexedDbService {
  protected readonly schema: IndexedDbSchema = {
    name: 'inventory-repository-test',
    version: 1,
    storeNames: ['metadata', 'interventions'],
    ownerStoreName: 'metadata',
  };
}

/** Native request events over shared stores; overlapping transactions wait for the earlier commit. */
function sharedIndexedDb(stores: ReadonlyMap<string, Map<string, unknown>>) {
  let tail: Promise<void> = Promise.resolve();
  let nextRead: ReturnType<typeof boundary> | null = null;
  let nextCommit: ReturnType<typeof boundary> | null = null;
  const transactions = vi.fn((names: string | readonly string[]) => {
    const selected = typeof names === 'string' ? [names] : names;
    const finished = deferred<void>();
    const earlier = tail;
    tail = finished.promise;
    const readBoundary = nextRead;
    const commitBoundary = nextCommit;
    nextRead = null;
    nextCommit = null;
    let aborted = false;
    const operations: (() => void)[] = [];
    const view = new Map<string, Map<string, unknown>>();
    const transaction = Object.assign(new EventTarget(), {
      error: null,
      abort: () => {
        aborted = true;
        transaction.dispatchEvent(new Event('abort'));
        finished.resolve();
      },
      objectStore: (name: string) => {
        if (!selected.includes(name))
          throw new DOMException('Store is not locked.', 'NotFoundError');
        return {
          get: (key: string) => {
            const request = Object.assign(new EventTarget(), {
              result: undefined as unknown,
              error: null,
            });
            operations.push(() => {
              request.result = view.get(name)?.get(key);
              request.dispatchEvent(new Event('success'));
            });
            return request;
          },
          put: (value: unknown, key: string) => {
            operations.push(() => {
              view.get(name)?.set(key, value);
            });
          },
        };
      },
    });
    void earlier.then(async () => {
      readBoundary?.reached.resolve();
      await readBoundary?.release.promise;
      if (aborted) return;
      for (const name of selected) view.set(name, new Map(stores.get(name)));
      for (let index = 0; index < operations.length; index += 1) {
        if (aborted) return;
        operations[index]?.();
      }
      commitBoundary?.reached.resolve();
      await commitBoundary?.release.promise;
      if (aborted) return;
      for (const [name, records] of view) {
        const target = stores.get(name);
        target?.clear();
        for (const [key, value] of records) target?.set(key, value);
      }
      transaction.dispatchEvent(new Event('complete'));
      finished.resolve();
    });
    return transaction;
  });
  const open = vi.fn(() => {
    const database = Object.assign(new EventTarget(), {
      transaction: transactions,
      close: vi.fn(),
    });
    const request = Object.assign(new EventTarget(), { result: database, error: null });
    queueMicrotask(() => request.dispatchEvent(new Event('success')));
    return request;
  });
  function boundary() {
    return { reached: deferred<void>(), release: deferred<void>() };
  }
  return {
    open,
    transactions,
    blockRead: () => {
      nextRead = boundary();
      return nextRead;
    },
    blockCommit: () => {
      nextCommit = boundary();
      return nextCommit;
    },
  };
}

describe('InterventionInventoryRepository', () => {
  const metadata = new Map<string, unknown>();
  const workspaces = new Map<string, unknown>();
  let owner: string | null = 'account-1';
  let authorized = true;
  const isCurrent = (): boolean => authorized && owner === 'account-1';
  const database = {
    currentOwnerId: vi.fn<() => string | null>(),
    ensureOwnerBound: vi.fn<() => Promise<void>>(),
    get: vi.fn<(collection: string, key: string) => Promise<unknown>>(),
    updateTransaction: vi.fn<InterventionDatabaseService['updateTransaction']>(),
  };
  let repository: InterventionInventoryRepository;
  let storage: ReturnType<typeof sharedIndexedDb>;

  beforeEach(() => {
    owner = 'account-1';
    authorized = true;
    metadata.clear();
    metadata.set('ownerUserId', 'account-1');
    workspaces.clear();
    workspaces.set('intervention-1', { organization: '/api/organizations/org-1' });
    vi.resetAllMocks();
    database.currentOwnerId.mockImplementation(() => owner);
    database.ensureOwnerBound.mockResolvedValue(undefined);
    database.get.mockImplementation(async (collection, key) => {
      const entries = collection === 'metadata' ? metadata : workspaces;
      return entries.get(key) ?? null;
    });
    storage = sharedIndexedDb(
      new Map([
        ['metadata', metadata],
        ['interventions', workspaces],
      ]),
    );
    vi.stubGlobal('indexedDB', { open: storage.open });
    TestBed.configureTestingModule({
      providers: [
        InterventionInventoryRepository,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: InterventionDatabaseService, useValue: database },
      ],
    });
    const native = TestBed.runInInjectionContext(() => new BrowserDatabase());
    database.updateTransaction.mockImplementation((...args) => native.updateTransaction(...args));
    repository = TestBed.inject(InterventionInventoryRepository);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  function secondRepository(): InterventionInventoryRepository {
    const native = TestBed.runInInjectionContext(() => new BrowserDatabase());
    const injector = Injector.create({
      providers: [
        {
          provide: InterventionDatabaseService,
          useValue: {
            ...database,
            updateTransaction: (
              ...args: Parameters<InterventionDatabaseService['updateTransaction']>
            ) => native.updateTransaction(...args),
          },
        },
      ],
    });
    return runInInjectionContext(injector, () => new InterventionInventoryRepository());
  }

  it('loads the authorized account, organization and intervention key without changing capture age', async () => {
    metadata.set(metadataKey, completeSnapshot);

    await expect(repository.load('org-1', 'intervention-1', isCurrent)).resolves.toBe(
      completeSnapshot,
    );

    expect(database.get).toHaveBeenCalledWith('metadata', metadataKey);
    expect(database.updateTransaction).not.toHaveBeenCalled();
    expect(completeSnapshot.capturedAt).toBe('2026-10-06T09:00:00Z');
  });

  it.each(['missing owner', 'revoked permission'])(
    'does not bind or read a snapshot with %s',
    async (reason) => {
      if (reason === 'missing owner') owner = null;
      else authorized = false;

      await expect(repository.load('org-1', 'intervention-1', isCurrent)).resolves.toBeNull();

      expect(database.ensureOwnerBound).not.toHaveBeenCalled();
      expect(database.get).not.toHaveBeenCalled();
    },
  );

  it('does not fall back to another account, organization or intervention key', async () => {
    metadata.set('inventorySnapshot:account-2:org-1:intervention-1', completeSnapshot);
    metadata.set('inventorySnapshot:account-1:org-2:intervention-1', completeSnapshot);
    metadata.set('inventorySnapshot:account-1:org-1:intervention-2', completeSnapshot);

    await expect(repository.load('org-1', 'intervention-1', isCurrent)).resolves.toBeNull();

    expect(database.get).toHaveBeenCalledTimes(1);
    expect(database.get).toHaveBeenCalledWith('metadata', metadataKey);
  });

  it.each([
    ['account', { accountId: 'account-2' }],
    ['organization', { organizationId: 'org-2' }],
    ['intervention', { interventionId: 'intervention-2' }],
    ['schema version', { version: 2 }],
    ['parts', { parts: null }],
    ['warehouses', { warehouses: {} }],
    ['declarations', { declarations: undefined }],
  ])('rejects stored metadata with a malformed or mismatching %s', async (_field, mismatch) => {
    metadata.set(metadataKey, { ...completeSnapshot, ...mismatch });

    await expect(repository.load('org-1', 'intervention-1', isCurrent)).resolves.toBeNull();
  });

  it.each(['owner', 'permission'])(
    'discards a load when %s changes during binding',
    async (change) => {
      const binding = deferred<void>();
      database.ensureOwnerBound.mockReturnValueOnce(binding.promise);
      const loaded = repository.load('org-1', 'intervention-1', isCurrent);

      if (change === 'owner') owner = 'account-2';
      else authorized = false;
      binding.resolve();

      await expect(loaded).resolves.toBeNull();
      expect(database.get).not.toHaveBeenCalled();
    },
  );

  it.each(['owner', 'permission'])(
    'discards a load when %s changes during the read',
    async (change) => {
      const read = deferred<unknown>();
      database.get.mockReturnValueOnce(read.promise);
      const loaded = repository.load('org-1', 'intervention-1', isCurrent);
      await vi.waitFor(() => expect(database.get).toHaveBeenCalled());

      if (change === 'owner') owner = 'account-2';
      else authorized = false;
      read.resolve(completeSnapshot);

      await expect(loaded).resolves.toBeNull();
    },
  );

  it('saves under the captured workspace account in one guarded native transaction', async () => {
    await repository.save(completeSnapshot, isCurrent);

    expect(metadata.get(metadataKey)).toEqual(completeSnapshot);
    expect(database.updateTransaction).toHaveBeenCalledWith(
      { metadata: ['ownerUserId', metadataKey], interventions: ['intervention-1'] },
      expect.any(Function),
      expect.any(Function),
    );
    expect(storage.transactions).toHaveBeenCalledExactlyOnceWith(
      ['metadata', 'interventions'],
      'readwrite',
    );
    expect(database.get).not.toHaveBeenCalled();
  });

  it.each(['missing workspace', 'other organization'])(
    'does not save references for a %s',
    async (reason) => {
      if (reason === 'missing workspace') workspaces.clear();
      else workspaces.set('intervention-1', { organization: '/api/organizations/org-2' });

      await expect(repository.save(completeSnapshot, isCurrent)).rejects.toThrow(
        'Save this intervention on the device before preparing its stock references.',
      );
      expect(metadata.has(metadataKey)).toBe(false);
    },
  );

  it.each(['owner', 'permission'])(
    'rejects a save when its %s is already obsolete',
    async (change) => {
      if (change === 'owner') owner = 'account-2';
      else authorized = false;

      await expect(repository.save(completeSnapshot, isCurrent)).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(database.ensureOwnerBound).not.toHaveBeenCalled();
      expect(database.updateTransaction).not.toHaveBeenCalled();
    },
  );

  it.each(['owner', 'permission'])(
    'does not acknowledge a save after %s changes during binding',
    async (change) => {
      const binding = deferred<void>();
      database.ensureOwnerBound.mockReturnValueOnce(binding.promise);
      const saved = repository.save(completeSnapshot, isCurrent);
      const rejected = expect(saved).rejects.toMatchObject({ name: 'AbortError' });
      if (change === 'owner') owner = 'account-2';
      else authorized = false;
      binding.resolve();

      await rejected;
      expect(database.updateTransaction).not.toHaveBeenCalled();
    },
  );

  it.each(['owner', 'permission'])(
    'does not write after %s changes while transaction reads are pending',
    async (change) => {
      const read = storage.blockRead();
      const saved = repository.save(completeSnapshot, isCurrent);
      const rejected = expect(saved).rejects.toMatchObject({ name: 'AbortError' });
      await read.reached.promise;
      if (change === 'owner') owner = 'account-2';
      else authorized = false;
      read.release.resolve();

      await rejected;
      expect(metadata.has(metadataKey)).toBe(false);
    },
  );

  it('checks the stored owner marker after another connection changes accounts', async () => {
    const read = storage.blockRead();
    const saved = repository.save(completeSnapshot, () => true);
    const rejected = expect(saved).rejects.toMatchObject({ name: 'AbortError' });
    await read.reached.promise;
    metadata.set('ownerUserId', 'account-2');
    read.release.resolve();

    await rejected;
    expect(metadata.has(metadataKey)).toBe(false);
    expect(metadata.get('ownerUserId')).toBe('account-2');
  });

  it.each(['owner', 'permission'])(
    'does not acknowledge a completed write after %s changes',
    async (change) => {
      const commit = storage.blockCommit();
      const saved = repository.save(completeSnapshot, isCurrent);
      const rejected = expect(saved).rejects.toMatchObject({ name: 'AbortError' });
      await commit.reached.promise;
      if (change === 'owner') owner = 'account-2';
      else authorized = false;
      commit.release.resolve();

      await rejected;
    },
  );

  it('propagates storage exhaustion without replacing the retained snapshot', async () => {
    metadata.set(metadataKey, completeSnapshot);
    const quotaError = new DOMException('Device storage is full.', 'QuotaExceededError');
    database.updateTransaction.mockRejectedValueOnce(quotaError);

    await expect(
      repository.save({ ...completeSnapshot, declarations: [receipt] }, isCurrent),
    ).rejects.toBe(quotaError);
    expect(metadata.get(metadataKey)).toBe(completeSnapshot);
  });

  it('retains a server receipt before resolving its acknowledgment without claiming complete history', async () => {
    const commit = storage.blockCommit();
    const acknowledged = vi.fn();
    const saved = repository
      .saveReceipt('org-1', 'account-1', receipt, isCurrent)
      .then(acknowledged);
    await commit.reached.promise;
    expect(acknowledged).not.toHaveBeenCalled();
    expect(metadata.has(metadataKey)).toBe(false);
    commit.release.resolve();
    await saved;

    expect(acknowledged).toHaveBeenCalledOnce();
    expect(metadata.get(metadataKey)).toEqual({
      version: 1,
      accountId: 'account-1',
      organizationId: 'org-1',
      interventionId: 'intervention-1',
      capturedAt: expect.any(String),
      catalogComplete: false,
      declarationsComplete: false,
      parts: [],
      warehouses: [],
      declarations: [receipt],
    });
  });

  it.each([true, false])(
    'preserves retained references and history coverage (%s) when appending a receipt',
    async (complete) => {
      const originalReceipt = { ...receipt, id: 'receipt-0' };
      metadata.set(metadataKey, {
        ...completeSnapshot,
        catalogComplete: complete,
        declarationsComplete: complete,
        declarations: [originalReceipt],
      });

      await repository.saveReceipt('org-1', 'account-1', receipt, isCurrent);

      expect(metadata.get(metadataKey)).toMatchObject({
        catalogComplete: complete,
        declarationsComplete: complete,
        parts: [part],
        warehouses: [warehouse],
        declarations: [originalReceipt, receipt],
      });
    },
  );

  it('keeps one declaration when the same server receipt is received again', async () => {
    await repository.saveReceipt('org-1', 'account-1', receipt, isCurrent);
    const replayed = { ...receipt, replayed: true };
    await repository.saveReceipt('org-1', 'account-1', replayed, isCurrent);

    expect((await repository.load('org-1', 'intervention-1', isCurrent))?.declarations).toEqual([
      replayed,
    ]);
  });

  it('retains a receipt from an independent instance while a full capture is committing', async () => {
    const other = secondRepository();
    const commit = storage.blockCommit();
    const captured = repository.save(completeSnapshot, isCurrent);
    await commit.reached.promise;
    const received = other.saveReceipt('org-1', 'account-1', receipt, isCurrent);
    await vi.waitFor(() => expect(storage.transactions).toHaveBeenCalledTimes(2));
    commit.release.resolve();
    await Promise.all([captured, received]);

    expect(await repository.load('org-1', 'intervention-1', isCurrent)).toMatchObject({
      catalogComplete: true,
      declarationsComplete: true,
      parts: [part],
      warehouses: [warehouse],
      declarations: [receipt],
    });
  });

  it('keeps an acknowledged pending receipt after outbox removal when an older capture from another instance finishes', async () => {
    const other = secondRepository();
    const outbox = new Map([['operation-1', receipt]]);
    const commit = storage.blockCommit();
    const received = repository
      .saveReceipt('org-1', 'account-1', receipt, isCurrent)
      .then(() => outbox.delete('operation-1'));
    await commit.reached.promise;
    const captured = other.save(completeSnapshot, isCurrent);
    await vi.waitFor(() => expect(storage.transactions).toHaveBeenCalledTimes(2));
    expect(outbox.has('operation-1')).toBe(true);
    commit.release.resolve();
    await Promise.all([received, captured]);

    expect(outbox.size).toBe(0);
    expect(metadata.get(metadataKey)).toMatchObject({
      catalogComplete: true,
      declarationsComplete: true,
      parts: [part],
      warehouses: [warehouse],
      declarations: [receipt],
    });
    expect(storage.open).toHaveBeenCalledTimes(2);
  });

  it('retains distinct receipts committed by separate instances to the same shared store', async () => {
    const other = secondRepository();
    const secondReceipt = {
      ...receipt,
      '@id': '/api/organizations/org-1/inventory-consumptions/receipt-2',
      id: 'receipt-2',
      quantity: '1.000000',
    };
    const commit = storage.blockCommit();
    const received = repository.saveReceipt('org-1', 'account-1', receipt, isCurrent);
    await commit.reached.promise;
    const secondReceived = other.saveReceipt('org-1', 'account-1', secondReceipt, isCurrent);
    await vi.waitFor(() => expect(storage.transactions).toHaveBeenCalledTimes(2));
    commit.release.resolve();
    await Promise.all([received, secondReceived]);

    expect(metadata.get(metadataKey)).toMatchObject({
      catalogComplete: false,
      declarationsComplete: false,
      declarations: [receipt, secondReceipt],
    });
  });

  it('updates a retained declaration with confirmed server state without losing other facts', async () => {
    const otherReceipt = { ...receipt, id: 'receipt-2' };
    metadata.set(metadataKey, { ...completeSnapshot, declarations: [receipt, otherReceipt] });
    const confirmedReceipt: InventoryConsumptionOutput = {
      ...receipt,
      status: 'confirmed',
      reason: null,
      movementId: 'movement-1',
    };

    await repository.save({ ...completeSnapshot, declarations: [confirmedReceipt] }, isCurrent);

    expect((await repository.load('org-1', 'intervention-1', isCurrent))?.declarations).toEqual([
      confirmedReceipt,
      otherReceipt,
    ]);
  });

  it.each(['full capture', 'replayed receipt'])(
    'does not regress confirmed stock when a stale %s races from an independent instance',
    async (source) => {
      const other = secondRepository();
      const confirmedReceipt: InventoryConsumptionOutput = {
        ...receipt,
        status: 'confirmed',
        reason: null,
        movementId: 'movement-1',
      };
      metadata.set(metadataKey, { ...completeSnapshot, declarations: [receipt] });
      const commit = storage.blockCommit();
      const confirmed = repository.save(
        { ...completeSnapshot, declarations: [confirmedReceipt] },
        isCurrent,
      );
      await commit.reached.promise;
      const pending =
        source === 'full capture'
          ? other.save({ ...completeSnapshot, declarations: [receipt] }, isCurrent)
          : other.saveReceipt('org-1', 'account-1', { ...receipt, replayed: true }, isCurrent);
      await vi.waitFor(() => expect(storage.transactions).toHaveBeenCalledTimes(2));
      commit.release.resolve();
      await Promise.all([confirmed, pending]);

      expect(metadata.get(metadataKey)).toMatchObject({ declarations: [confirmedReceipt] });
    },
  );

  it.each([
    ['account', { accountId: 'account-2' }],
    ['organization', { organizationId: 'org-2' }],
    ['intervention', { interventionId: 'intervention-2' }],
    ['schema', { version: 2 }],
    ['catalog', { parts: null }],
    ['history', { declarations: null }],
  ])('does not merge dirty or mismatching %s metadata into a receipt', async (_field, mismatch) => {
    metadata.set(metadataKey, {
      ...completeSnapshot,
      declarations: [{ ...receipt, id: 'unrelated' }],
      ...mismatch,
    });

    await repository.saveReceipt('org-1', 'account-1', receipt, isCurrent);

    expect(metadata.get(metadataKey)).toMatchObject({
      accountId: 'account-1',
      organizationId: 'org-1',
      interventionId: 'intervention-1',
      catalogComplete: false,
      declarationsComplete: false,
      declarations: [receipt],
    });
  });

  it('allows a later receipt after a preceding atomic storage failure', async () => {
    const quotaError = new DOMException('Device storage is full.', 'QuotaExceededError');
    database.updateTransaction.mockRejectedValueOnce(quotaError);
    await expect(repository.save(completeSnapshot, isCurrent)).rejects.toBe(quotaError);

    await repository.saveReceipt('org-1', 'account-1', receipt, isCurrent);

    expect(metadata.get(metadataKey)).toMatchObject({ declarations: [receipt] });
  });

  it('does not acknowledge a receipt whose device write exceeds quota', async () => {
    const quotaError = new DOMException('Device storage is full.', 'QuotaExceededError');
    database.updateTransaction.mockRejectedValueOnce(quotaError);

    await expect(repository.saveReceipt('org-1', 'account-1', receipt, isCurrent)).rejects.toBe(
      quotaError,
    );
    expect(metadata.has(metadataKey)).toBe(false);
  });

  it('checks account binding even when the caller guard stays authorized during a load', async () => {
    const read = deferred<unknown>();
    database.get.mockReturnValueOnce(read.promise);
    const loaded = repository.load('org-1', 'intervention-1', () => true);
    await vi.waitFor(() => expect(database.get).toHaveBeenCalled());
    owner = 'account-2';
    read.resolve(completeSnapshot);

    await expect(loaded).resolves.toBeNull();
  });

  it.each(['owner', 'permission'])(
    'does not acknowledge a receipt after %s changes during history restoration',
    async (change) => {
      const read = storage.blockRead();
      const saved = repository.saveReceipt('org-1', 'account-1', receipt, isCurrent);
      const rejected = expect(saved).rejects.toMatchObject({ name: 'AbortError' });
      await read.reached.promise;
      if (change === 'owner') owner = 'account-2';
      else authorized = false;
      read.release.resolve();

      await rejected;
      expect(metadata.has(metadataKey)).toBe(false);
    },
  );

  it('rejects receipt acknowledgment after the account changes even with an authorized caller guard', async () => {
    const commit = storage.blockCommit();
    const saved = repository.saveReceipt('org-1', 'account-1', receipt, () => true);
    const rejected = expect(saved).rejects.toMatchObject({ name: 'AbortError' });
    await commit.reached.promise;
    owner = 'account-2';
    commit.release.resolve();

    await rejected;
  });
});
