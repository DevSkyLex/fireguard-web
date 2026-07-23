import { Injectable, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { IndexedDbSchema } from '@core/indexed-db/models';
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
@Injectable()
class InMemoryDatabase extends IndexedDbService {
  public override readonly browser: boolean = true;

  public readonly store = new Map<string, unknown>();

  public clearAllCalls = 0;

  protected readonly schema: IndexedDbSchema = SCHEMA;

  public override async get<T>(storeName: string, key: string): Promise<T | null> {
    return (this.store.get(`${storeName}:${key}`) as T | undefined) ?? null;
  }

  public override async put(storeName: string, key: string, value: unknown): Promise<void> {
    this.store.set(`${storeName}:${key}`, value);
  }

  public override async clearAll(): Promise<void> {
    this.clearAllCalls += 1;
    this.store.clear();
  }
}

/** Same database, but on the server. */
@Injectable()
class ServerDatabase extends IndexedDbService {
  protected readonly schema: IndexedDbSchema = SCHEMA;
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
      await expect(service.remove('outbox', 'k')).resolves.toBeUndefined();
      await expect(service.removeWhere('outbox', () => true)).resolves.toBeUndefined();
      await expect(service.clearAll()).resolves.toBeUndefined();
    });

    it('should never bind an owner', async () => {
      await expect(service.ensureOwnerBound('user-1')).resolves.toBeUndefined();
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
});
