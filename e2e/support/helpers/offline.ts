import type { Page } from '@playwright/test';

/**
 * Helpers for driving the intervention offline subsystem from a Playwright
 * test: toggling the app's perceived connectivity, and reading/seeding the
 * IndexedDB outbox that the offline-first workspace persists to.
 *
 * Connectivity is driven through `navigator.onLine` + the `online`/`offline`
 * window events (which is exactly what the app's `ConnectivityService` — via
 * `@signality/core`'s `online()` signal — re-reads on every event), NOT through
 * `context.setOffline()`. This keeps Playwright's `page.route` mocks fully
 * intact: the app believes it is offline while the network layer is untouched,
 * so replay against mocked endpoints still works the moment it reconnects.
 */

/** IndexedDB database owning the intervention offline stores. */
const INTERVENTION_DATABASE_NAME = 'fireguard-field-interventions';

/** The seven object stores the app creates (all out-of-line keys, no keyPath). */
const INTERVENTION_STORE_NAMES = [
  'interventions',
  'workItems',
  'changes',
  'resources',
  'media',
  'outbox',
  'metadata',
] as const;

/** One persisted outbox operation as read back from IndexedDB. */
export interface OutboxRecord {
  readonly id: string;
  readonly interventionId: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
  readonly status?: 'pending' | 'conflict' | 'failed';
  readonly error?: string | null;
}

/**
 * Makes the app perceive a loss of connectivity: overrides `navigator.onLine`
 * and dispatches the `offline` event so `ConnectivityService.online()` flips to
 * `false` and field writes take the IndexedDB-queue branch.
 */
export async function setAppOffline(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
  });
}

/**
 * Restores perceived connectivity: overrides `navigator.onLine` back to `true`
 * and dispatches the `online` event, which re-arms the background sync
 * coordinator (online + visible) and replays the outbox against the mocks.
 */
export async function setAppOnline(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    window.dispatchEvent(new Event('online'));
  });
}

/**
 * Reads every queued outbox operation from IndexedDB, optionally filtered to one
 * intervention. Mirrors the app's own `getAll('outbox')` so specs can assert on
 * what was queued and on each operation's replay status.
 */
export async function readOutboxOperations(
  page: Page,
  interventionId?: string,
): Promise<ReadonlyArray<OutboxRecord>> {
  return page.evaluate(
    async ({ dbName, filterInterventionId }): Promise<ReadonlyArray<OutboxRecord>> => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      if (!db.objectStoreNames.contains('outbox')) {
        db.close();
        return [];
      }
      const all = await new Promise<OutboxRecord[]>((resolve, reject) => {
        const request = db.transaction('outbox', 'readonly').objectStore('outbox').getAll();
        request.addEventListener('success', () => resolve(request.result as OutboxRecord[]));
        request.addEventListener('error', () => reject(request.error));
      });
      db.close();
      return filterInterventionId
        ? all.filter((operation) => operation.interventionId === filterInterventionId)
        : all;
    },
    { dbName: INTERVENTION_DATABASE_NAME, filterInterventionId: interventionId ?? null },
  );
}

/** Reads every record of one object store (no keyPath, so values are returned bare). */
export async function readStore(page: Page, storeName: string): Promise<ReadonlyArray<unknown>> {
  return page.evaluate(
    async ({ dbName, targetStore }): Promise<ReadonlyArray<unknown>> => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      if (!db.objectStoreNames.contains(targetStore)) {
        db.close();
        return [];
      }
      const all = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction(targetStore, 'readonly').objectStore(targetStore).getAll();
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      db.close();
      return all;
    },
    { dbName: INTERVENTION_DATABASE_NAME, targetStore: storeName },
  );
}

/**
 * Seeds outbox operations directly into IndexedDB with their explicit out-of-line
 * keys. Owner binding is inert in e2e (the `/me` fixture carries no `sub`), and
 * this never rewrites `metadata.ownerUserId`, so the app never wipes the seed.
 * Call it AFTER the detail page has loaded (owner binding settled) so a later
 * `ensureOwnerBound()` cannot clear the stores.
 */
export async function seedOutboxOperations(
  page: Page,
  operations: ReadonlyArray<OutboxRecord>,
): Promise<void> {
  await page.evaluate(
    async ({ dbName, storeNames, records }): Promise<void> => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        // Belt-and-suspenders: create the schema if the app has not opened it yet.
        request.addEventListener('upgradeneeded', () => {
          const database = request.result;
          for (const name of storeNames) {
            if (!database.objectStoreNames.contains(name)) database.createObjectStore(name);
          }
        });
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('outbox', 'readwrite');
        const store = transaction.objectStore('outbox');
        for (const operation of records) store.put(operation, operation.id);
        transaction.addEventListener('complete', () => resolve());
        transaction.addEventListener('error', () => reject(transaction.error));
      });
      db.close();
    },
    {
      dbName: INTERVENTION_DATABASE_NAME,
      storeNames: INTERVENTION_STORE_NAMES,
      records: operations,
    },
  );
}

/** IndexedDB database owning the messaging outbox — deliberately separate. */
const MESSAGING_DATABASE_NAME = 'fireguard-messaging';

/** One persisted messaging outbox operation. */
export interface MessagingOutboxRecord {
  readonly id: string;
  readonly conversationId: string;
  readonly type: string;
  readonly payload: { readonly clientId: string; readonly input: { readonly body: string } };
  readonly createdAt: string;
  readonly status?: 'pending' | 'failed';
  readonly error?: string | null;
}

/**
 * Reads the messaging outbox.
 *
 * Its own database, not the intervention one: that database purges every store
 * when the authenticated user changes, which would take queued messages with
 * it.
 */
export async function readMessagingOutbox(
  page: Page,
): Promise<ReadonlyArray<MessagingOutboxRecord>> {
  return page.evaluate(async (dbName: string): Promise<ReadonlyArray<MessagingOutboxRecord>> => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });
    if (!db.objectStoreNames.contains('outbox')) {
      db.close();
      return [];
    }
    const all = await new Promise<MessagingOutboxRecord[]>((resolve, reject) => {
      const request = db.transaction('outbox', 'readonly').objectStore('outbox').getAll();
      request.addEventListener('success', () => resolve(request.result as MessagingOutboxRecord[]));
      request.addEventListener('error', () => reject(request.error));
    });
    db.close();
    return all;
  }, MESSAGING_DATABASE_NAME);
}
