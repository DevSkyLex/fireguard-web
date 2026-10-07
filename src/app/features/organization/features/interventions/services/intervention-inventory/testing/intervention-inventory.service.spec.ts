import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError, type Observable } from 'rxjs';
import type { HydraCollection, HydraItem, RequestOptions } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  InterventionInventoryRepository,
  InterventionOfflineService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionInventoryScope,
  InterventionInventorySnapshot,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type {
  InventoryConsumptionOutput,
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { InterventionInventoryService } from '../intervention-inventory.service';

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
const declaration: InventoryConsumptionOutput = {
  '@id': '/api/organizations/org-1/inventory-consumptions/declaration-1',
  '@type': 'InventoryConsumption',
  id: 'declaration-1',
  partId: 'part-1',
  warehouseId: 'warehouse-1',
  quantity: '2.000000',
  interventionId: 'intervention-1',
  actorId: 'account-1',
  occurredAt: '2026-10-06T10:00:00Z',
  status: 'received_pending',
  reason: 'insufficient_stock',
  late: false,
  replayed: false,
};
const intervention = {
  id: 'intervention-1',
  organization: '/api/organizations/org-1',
} as InterventionOutput;
const scope: InterventionInventoryScope = {
  accountId: 'account-1',
  organizationId: 'org-1',
  interventionId: 'intervention-1',
  sessionRevision: 1,
};
const snapshot: InterventionInventorySnapshot = {
  version: 1,
  accountId: 'account-1',
  organizationId: 'org-1',
  interventionId: 'intervention-1',
  capturedAt: '2026-10-06T10:00:00Z',
  catalogComplete: true,
  declarationsComplete: true,
  parts: [part],
  warehouses: [warehouse],
  declarations: [declaration],
};

/**
 * Function collection
 *
 * @description
 * Builds paginated owner-published transport fixtures without bypassing their required Hydra shape.
 *
 * @template Row - Resource owned by the collection.
 *
 * @param {readonly Row[]} member - Rows on this page.
 * @param {number} totalItems - Verified total across all pages.
 *
 * @returns {HydraCollection<Row>} Typed server page.
 */
function collection<Row extends HydraItem>(
  member: readonly Row[],
  totalItems: number = member.length,
): HydraCollection<Row> {
  return { '@id': '/api/collection', '@type': 'Collection', member, totalItems };
}

describe('InterventionInventoryService', () => {
  let savedSnapshot: InterventionInventorySnapshot | null;
  const owner = signal<string | null>('account-1');
  const organization = signal<string | null>('org-1');
  const authenticated = signal(true);
  const sessionRevision = signal(1);
  const permissionsLoading = signal(false);
  const permissionsError = signal<unknown>(null);
  const permissions = signal<ReadonlySet<string>>(
    new Set([
      ORGANIZATION_PERMISSION.INVENTORY_READ,
      ORGANIZATION_PERMISSION.INVENTORY_CONSUME,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
    ]),
  );
  const inventory = {
    listParts:
      vi.fn<
        (
          organizationId: string,
          options: RequestOptions,
        ) => Observable<HydraCollection<InventoryPartOutput>>
      >(),
    listWarehouses:
      vi.fn<
        (
          organizationId: string,
          options: RequestOptions,
        ) => Observable<HydraCollection<InventoryWarehouseOutput>>
      >(),
    listConsumptions:
      vi.fn<
        (
          organizationId: string,
          options: RequestOptions,
        ) => Observable<HydraCollection<InventoryConsumptionOutput>>
      >(),
  };
  const repository = {
    load: vi.fn<
      (
        organizationId: string,
        interventionId: string,
        current: () => boolean,
      ) => Promise<InterventionInventorySnapshot | null>
    >(),
    save: vi.fn<(value: InterventionInventorySnapshot, current: () => boolean) => Promise<void>>(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    savedSnapshot = snapshot;
    owner.set('account-1');
    organization.set('org-1');
    authenticated.set(true);
    sessionRevision.set(1);
    permissionsLoading.set(false);
    permissionsError.set(null);
    permissions.set(
      new Set([
        ORGANIZATION_PERMISSION.INVENTORY_READ,
        ORGANIZATION_PERMISSION.INVENTORY_CONSUME,
        ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ]),
    );
    inventory.listParts.mockReturnValue(of(collection([part])));
    inventory.listWarehouses.mockReturnValue(of(collection([warehouse])));
    inventory.listConsumptions.mockReturnValue(of(collection([declaration])));
    repository.load.mockImplementation(async (_organization, _intervention, current) =>
      current() ? savedSnapshot : null,
    );
    repository.save.mockImplementation(async (value, current) => {
      if (!current()) throw new DOMException('Snapshot scope changed.', 'AbortError');
      savedSnapshot = value;
    });
    TestBed.configureTestingModule({
      providers: [
        InterventionInventoryService,
        { provide: InventoryService, useValue: inventory },
        { provide: InterventionInventoryRepository, useValue: repository },
        { provide: InterventionOfflineService, useValue: { publicationOwner: () => owner() } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision },
        },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId: organization } },
        {
          provide: OrganizationPermissionService,
          useValue: {
            isLoadingPermissions: permissionsLoading,
            permissionError: permissionsError,
            hasPermission: (permission: string) => permissions().has(permission),
          },
        },
      ],
    });
  });

  it('prepares every catalog and declaration page before saving one complete workspace snapshot', async () => {
    const secondPart = { ...part, id: 'part-2', code: 'GAUGE', label: 'Pressure gauge' };
    const thirdPart = { ...part, id: 'part-3', code: 'HOSE', label: 'Hose' };
    const secondWarehouse = { ...warehouse, id: 'warehouse-2', code: 'DEPOT', name: 'Depot' };
    inventory.listParts.mockImplementation((_organization, options) =>
      of(collection([options.page === 1 ? part : options.page === 2 ? secondPart : thirdPart], 3)),
    );
    inventory.listWarehouses.mockImplementation((_organization, options) =>
      of(collection([options.page === 1 ? warehouse : secondWarehouse], 2)),
    );

    const result = await TestBed.inject(InterventionInventoryService).refresh(scope);

    expect(result).toMatchObject({
      version: 1,
      accountId: 'account-1',
      organizationId: 'org-1',
      interventionId: 'intervention-1',
      catalogComplete: true,
      declarationsComplete: true,
      parts: [part, secondPart, thirdPart],
      warehouses: [warehouse, secondWarehouse],
      declarations: [declaration],
    });
    expect(inventory.listParts.mock.calls).toEqual(
      [1, 2, 3].map((page) => [
        'org-1',
        {
          page,
          itemsPerPage: 100,
          params: { archived: false },
        },
      ]),
    );
    expect(inventory.listWarehouses).toHaveBeenCalledTimes(2);
    expect(inventory.listConsumptions).toHaveBeenCalledExactlyOnceWith('org-1', {
      page: 1,
      itemsPerPage: 100,
      params: { interventionId: 'intervention-1' },
    });
    expect(repository.save).toHaveBeenCalledExactlyOnceWith(result, expect.any(Function));
    expect(repository.save.mock.calls[0]?.[1]()).toBe(true);
  });

  it('keeps a server-received declaration unresolved while catalog preparation completes', async () => {
    const result = await TestBed.inject(InterventionInventoryService).refresh(scope);
    expect(result.declarations).toEqual([declaration]);
    expect(result.declarations[0]?.status).toBe('received_pending');
    expect(result.declarations[0]?.reason).toBe('insufficient_stock');
  });

  it('exposes a concurrently accepted receipt from the durable merged snapshot after the network drain', async () => {
    const concurrentlyAccepted: InventoryConsumptionOutput = {
      ...declaration,
      '@id': '/api/organizations/org-1/inventory-consumptions/declaration-2',
      id: 'declaration-2',
      quantity: '0.250000',
      occurredAt: '2026-10-06T10:01:00Z',
    };
    repository.save.mockImplementation(async (value, current) => {
      expect(current()).toBe(true);
      expect(value.declarations).toEqual([declaration]);
      savedSnapshot = {
        ...value,
        declarations: [...value.declarations, concurrentlyAccepted],
      };
    });

    const result = await TestBed.inject(InterventionInventoryService).refresh(scope);

    expect(repository.load).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      'intervention-1',
      expect.any(Function),
    );
    expect(result).toBe(savedSnapshot);
    expect(result.declarations).toEqual([declaration, concurrentlyAccepted]);
    expect(result.catalogComplete).toBe(true);
    expect(result.declarations[1]?.status).toBe('received_pending');
  });

  it('does not expose the merged snapshot when the session changes during its final durable read', async () => {
    let release: ((retained: InterventionInventorySnapshot | null) => void) | undefined;
    repository.load.mockImplementation(
      () =>
        new Promise<InterventionInventorySnapshot | null>((resolve) => {
          release = resolve;
        }),
    );
    const result = TestBed.inject(InterventionInventoryService).refresh(scope);
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(repository.load).toHaveBeenCalledOnce());
    sessionRevision.set(2);
    expect(repository.load.mock.calls[0]?.[2]()).toBe(false);
    release?.(savedSnapshot);
    await rejected;
  });

  it('deduplicates overlapping pages only when the verified total is reached', async () => {
    const secondPart = { ...part, id: 'part-2' };
    inventory.listParts.mockImplementation((_organization, options) =>
      of(collection(options.page === 1 ? [part] : [part, secondPart], 2)),
    );
    const result = await TestBed.inject(InterventionInventoryService).refresh(scope);
    expect(result.parts).toEqual([part, secondPart]);
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('rejects a repeated page without replacing the previously saved complete snapshot', async () => {
    inventory.listParts.mockReturnValue(of(collection([part], 2)));
    await expect(TestBed.inject(InterventionInventoryService).refresh(scope)).rejects.toThrow(
      'could not be downloaded completely',
    );
    expect(inventory.listParts).toHaveBeenCalledTimes(2);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects changed totals between pages instead of claiming a complete catalog', async () => {
    inventory.listParts.mockImplementation((_organization, options) =>
      of(
        collection(
          options.page === 1 ? [part] : [{ ...part, id: 'part-2' }],
          options.page === 1 ? 2 : 3,
        ),
      ),
    );
    await expect(TestBed.inject(InterventionInventoryService).refresh(scope)).rejects.toThrow(
      'could not be downloaded completely',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([-1, 1.5, 10001, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid or unbounded catalog total of %s',
    async (totalItems) => {
      inventory.listParts.mockReturnValue(of(collection([part], totalItems)));
      await expect(TestBed.inject(InterventionInventoryService).refresh(scope)).rejects.toThrow(
        'could not be downloaded completely',
      );
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it('preserves a failed page error and saves no partial catalog', async () => {
    const failure = new Error('Warehouse page unavailable');
    inventory.listWarehouses.mockReturnValue(throwError(() => failure));
    await expect(TestBed.inject(InterventionInventoryService).refresh(scope)).rejects.toBe(failure);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a declaration belonging to another intervention before persisting its history', async () => {
    inventory.listConsumptions.mockReturnValue(
      of(collection([{ ...declaration, interventionId: 'intervention-2' }])),
    );
    await expect(TestBed.inject(InterventionInventoryService).refresh(scope)).rejects.toThrow(
      'could not be verified for this intervention',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each(['account', 'organization', 'session', 'authentication', 'permission'] as const)(
    'does not save a late preparation after the %s changes',
    async (change) => {
      const pending = new Subject<HydraCollection<InventoryPartOutput>>();
      inventory.listParts.mockReturnValue(pending);
      const result = TestBed.inject(InterventionInventoryService).refresh(scope);
      const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
      if (change === 'account') owner.set('account-2');
      if (change === 'organization') organization.set('org-2');
      if (change === 'session') sessionRevision.set(2);
      if (change === 'authentication') authenticated.set(false);
      if (change === 'permission') permissions.set(new Set());
      pending.next(collection([part]));
      pending.complete();
      await rejected;
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it('fences persistence itself when access is revoked while the durable write is pending', async () => {
    let release: (() => void) | undefined;
    repository.save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const result = TestBed.inject(InterventionInventoryService).refresh(scope);
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(repository.save).toHaveBeenCalledOnce());
    sessionRevision.set(2);
    expect(repository.save.mock.calls[0]?.[1]()).toBe(false);
    release?.();
    await rejected;
  });

  it('requires both resource consumption and intervention execution for declarations', () => {
    const service = TestBed.inject(InterventionInventoryService);
    expect(service.isCurrent(scope, true)).toBe(true);
    permissions.set(
      new Set([ORGANIZATION_PERMISSION.INVENTORY_READ, ORGANIZATION_PERMISSION.INVENTORY_CONSUME]),
    );
    expect(service.isCurrent(scope)).toBe(true);
    expect(service.isCurrent(scope, true)).toBe(false);
    permissions.set(
      new Set([
        ORGANIZATION_PERMISSION.INVENTORY_READ,
        ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ]),
    );
    expect(service.isCurrent(scope, true)).toBe(false);
  });

  it.each(['loading', 'error', 'denied'] as const)(
    'does not expose cached references with %s permissions',
    async (access) => {
      const service = TestBed.inject(InterventionInventoryService);
      if (access === 'loading') permissionsLoading.set(true);
      if (access === 'error') permissionsError.set(new Error('Permission read unavailable'));
      if (access === 'denied') permissions.set(new Set());
      expect(service.scope('org-1', 'intervention-1')).toBeNull();
      expect(await service.loadSaved(scope)).toBeNull();
      expect(repository.load.mock.calls[0]?.[2]()).toBe(false);
      expect(await firstValueFrom(service.capture(intervention, 'account-1'))).toBeNull();
      expect(inventory.listParts).not.toHaveBeenCalled();
    },
  );

  it('restores the saved snapshot through a live account and organization authorization guard', async () => {
    const service = TestBed.inject(InterventionInventoryService);
    expect(service.scope('org-1', 'intervention-1')).toEqual(scope);
    expect(await service.loadSaved(scope)).toEqual(snapshot);
    expect(repository.load).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      'intervention-1',
      expect.any(Function),
    );
    owner.set('account-2');
    expect(repository.load.mock.calls[0]?.[2]()).toBe(false);
  });

  it('does not capture for another preparation owner or an unverified organization IRI', async () => {
    const service = TestBed.inject(InterventionInventoryService);
    expect(await firstValueFrom(service.capture(intervention, 'account-2'))).toBeNull();
    expect(
      await firstValueFrom(
        service.capture(
          { ...intervention, organization: '/api/organizations/org-1?other-scope=true' },
          'account-1',
        ),
      ),
    ).toBeNull();
    expect(inventory.listParts).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('captures an authorized prepared intervention with all completion flags', async () => {
    const result = await firstValueFrom(
      TestBed.inject(InterventionInventoryService).capture(intervention, 'account-1'),
    );
    expect(result).toMatchObject({ ...snapshot, capturedAt: expect.any(String) });
    expect(repository.save).toHaveBeenCalledOnce();
  });
});
