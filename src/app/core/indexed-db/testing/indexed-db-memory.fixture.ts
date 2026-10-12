import { vi, type MockInstance } from 'vitest';
import type { IndexedDbService } from '@core/indexed-db';

/**
 * Constant transactions
 *
 * @description
 * One transaction queue per shared simulated database.
 */
const transactions = new WeakMap<Map<string, unknown>, Promise<void>>();

/**
 * Function mockIndexedDbTransactions
 *
 * @description
 * Gives Map-backed repository tests atomic read/derive/write semantics across separate repository
 * instances, retaining their existing commit and failure spies on put.
 *
 * @access public
 *
 * @param {IndexedDbService} repository - Repository whose primitive writes are already mocked.
 * @param {Map<string, unknown>} entries - Shared simulated database, including owner metadata.
 *
 * @returns {MockInstance<IndexedDbService['updateTransaction']>} Transaction spy for commit/failure
 *   assertions.
 */
export function mockIndexedDbTransactions(
  repository: IndexedDbService,
  entries: Map<string, unknown>,
): MockInstance<IndexedDbService['updateTransaction']> {
  return vi.spyOn(repository, 'updateTransaction').mockImplementation((reads, update, current) => {
    const mutation = (transactions.get(entries) ?? Promise.resolve()).then(async () => {
      if (current && !current()) throw new DOMException('Ownership changed', 'AbortError');
      const snapshot = new Map(entries);
      const values: Record<string, Record<string, unknown>> = {};
      for (const [store, keys] of Object.entries(reads)) {
        values[store] = Object.fromEntries(
          keys.map((key) => [key, structuredClone(entries.get(`${store}:${key}`) ?? null)]),
        );
      }
      try {
        const writes = update(values);
        await Object.entries(writes)
          .flatMap(([store, changes]) => changes.map((change) => ({ store, ...change })))
          .reduce(
            (pending, change) =>
              pending.then(() => repository.put(change.store, change.key, change.value, current)),
            Promise.resolve(),
          );
        if (current && !current()) throw new DOMException('Ownership changed', 'AbortError');
      } catch (error: unknown) {
        entries.clear();
        for (const [key, value] of snapshot) entries.set(key, value);
        throw error;
      }
    });
    transactions.set(
      entries,
      mutation.catch(() => undefined),
    );
    return mutation;
  });
}
