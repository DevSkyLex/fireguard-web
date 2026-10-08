import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  MaintenanceCostService,
  MaintenanceCostCommandRepository,
} from '@features/organization/features/maintenance-costs/data-access';
import type { MaintenanceCostOutput } from '@features/organization/features/maintenance-costs/models';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { MaintenanceCostStore, type MaintenanceCostStoreType } from '../maintenance-cost.store';
import type { MaintenanceCostScope } from '../models/maintenance-cost-state.interface';

describe('MaintenanceCostStore', () => {
  let store: MaintenanceCostStoreType;
  let api: {
    readCost: ReturnType<typeof vi.fn>;
    writePlanning: ReturnType<typeof vi.fn>;
    createExpense: ReturnType<typeof vi.fn>;
    readCurrency: ReturnType<typeof vi.fn>;
    writeCurrency: ReturnType<typeof vi.fn>;
    listRates: ReturnType<typeof vi.fn>;
    createRate: ReturnType<typeof vi.fn>;
  };
  let members: { listAll: ReturnType<typeof vi.fn> };
  let journal: {
    captureOwner: ReturnType<typeof vi.fn>;
    readPending: ReturnType<typeof vi.fn>;
    retain: ReturnType<typeof vi.fn>;
    acknowledge: ReturnType<typeof vi.fn>;
  };
  const authenticated = signal(true),
    revision = signal(1),
    grants = signal<readonly string[]>([]);
  const cost = maintenanceCostFixture();
  const scope: MaintenanceCostScope = {
    organizationId: cost.organizationId,
    interventionId: cost.interventionId,
    sessionRevision: 1,
  };
  const permission = { hasPermission: (value: string) => grants().includes(value) };
  const setup = async (platform = 'browser'): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [
        MaintenanceCostStore,
        { provide: MaintenanceCostCommandRepository, useValue: journal },
        { provide: MaintenanceCostService, useValue: api },
        { provide: OrganizationMemberService, useValue: members },
        { provide: OrganizationPermissionService, useValue: permission },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision: revision },
        },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    store = TestBed.inject(MaintenanceCostStore);
    store.setScope(scope);
    await vi.waitFor(() => expect(store.journalCallState().status).not.toBe('pending'));
  };
  beforeEach(() => {
    authenticated.set(true);
    revision.set(1);
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
    ]);
    api = {
      readCost: vi.fn().mockReturnValue(of(cost)),
      writePlanning: vi.fn().mockReturnValue(of(cost)),
      createExpense: vi.fn().mockReturnValue(of(cost)),
      readCurrency: vi
        .fn()
        .mockReturnValue(of({ organizationId: 'org', currency: 'EUR', locked: false })),
      writeCurrency: vi
        .fn()
        .mockReturnValue(of({ organizationId: 'org', currency: 'EUR', locked: false })),
      listRates: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      createRate: vi.fn().mockReturnValue(
        of({
          id: 'rate',
          memberId: 'member',
          currency: 'EUR',
          hourlyAmount: '50.000000',
          effectiveFrom: '2025-01-01',
          replayed: false,
        }),
      ),
    };
    members = { listAll: vi.fn().mockReturnValue(of([])) };
    journal = {
      captureOwner: vi.fn().mockReturnValue('user-a'),
      readPending: vi.fn().mockResolvedValue(null),
      retain: vi.fn().mockResolvedValue(undefined),
      acknowledge: vi.fn().mockResolvedValue(undefined),
    };
  });
  it.each(['server', 'no-read', 'anonymous'])(
    'does not fetch any private collection in %s',
    async (mode) => {
      if (mode === 'no-read') grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]);
      if (mode === 'anonymous') authenticated.set(false);
      await setup(mode === 'server' ? 'server' : 'browser');
      store.readCost(scope);
      store.readCurrency(scope);
      store.readRates({ scope, page: 1 });
      store.readMembers(scope);
      expect(api.readCost).not.toHaveBeenCalled();
      expect(api.readCurrency).not.toHaveBeenCalled();
      expect(api.listRates).not.toHaveBeenCalled();
      expect(members.listAll).not.toHaveBeenCalled();
      expect(store.costCallState().data).toBeNull();
    },
  );
  it('cancels obsolete reads and clears private current/frozen facts on a scope change', async () => {
    await setup();
    const old = new Subject<MaintenanceCostOutput>();
    api.readCost.mockReturnValueOnce(old);
    store.readCost(scope);
    expect(old.observed).toBe(true);
    const other = { ...scope, organizationId: 'other' };
    store.setScope(other);
    expect(old.observed).toBe(false);
    expect(store.costCallState().data).toBeNull();
    old.next(cost);
    expect(store.costCallState().data).toBeNull();
    api.readCost.mockReturnValue(of({ ...cost, organizationId: 'other' }));
    store.readCost(other);
    expect(store.costCallState().data?.organizationId).toBe('other');
  });
  it('never accepts a response with a foreign organization or intervention identity', async () => {
    await setup();
    api.readCost.mockReturnValue(of({ ...cost, organizationId: 'foreign' }));
    store.readCost(scope);
    expect(store.costCallState().data).toBeNull();
    api.readCost.mockReturnValue(of({ ...cost, interventionId: 'other' }));
    store.readCost(scope);
    expect(store.costCallState().data).toBeNull();
    api.readCurrency.mockReturnValue(
      of({ organizationId: 'foreign', currency: 'EUR', locked: true }),
    );
    store.readCurrency(scope);
    expect(store.currencyCallState().data).toBeNull();
  });
  it('passes planning revision zero independently and retains the dossier on stale failure', async () => {
    await setup();
    store.readCost(scope);
    api.writePlanning.mockReturnValue(
      throwError(() => ({ type: 'about:blank', status: 412, title: 'Stale', detail: 'Compare' })),
    );
    const input = {
      plannedBudget: '9007199254740993.123456',
      estimatedMinutes: null,
      resources: [],
    };
    store.write({
      kind: 'planning',
      organizationId: 'org',
      interventionId: cost.interventionId,
      input,
      revision: 0,
    });
    await vi.waitFor(() => expect(store.writeCallState().status).toBe('error'));
    expect(api.writePlanning).toHaveBeenCalledExactlyOnceWith('org', cost.interventionId, input, 0);
    expect(store.writeCallState().error?.code).toBe(412);
    expect(store.costCallState().data).toEqual(cost);
    expect(store.command()).toMatchObject({ revision: 0, input });
    expect(store.uncertainWrite()).toBe(false);
  });
  it('does not cancel an accepted expense and discards its late result after a context replacement', async () => {
    await setup();
    const accepted = new Subject<MaintenanceCostOutput>();
    api.createExpense.mockReturnValue(accepted);
    const command = {
      kind: 'expense' as const,
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'stable',
        amount: '12.123456',
        description: 'Repair',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    };
    store.write(command);
    store.write(command);
    await vi.waitFor(() => expect(api.createExpense).toHaveBeenCalledTimes(1));
    expect(api.createExpense).toHaveBeenCalledTimes(1);
    store.setScope({ ...scope, organizationId: 'other' });
    expect(accepted.observed).toBe(true);
    expect(store.writePending()).toBe(true);
    expect(store.command()).toBeNull();
    accepted.next(cost);
    accepted.complete();
    await vi.waitFor(() => expect(store.writePending()).toBe(false));
    expect(store.writePending()).toBe(false);
    expect(store.costCallState().data).toBeNull();
    expect(store.writeCallState().data).toBeNull();
  });
  it('retries an uncertain expense using the frozen exact key and original body', async () => {
    await setup();
    api.createExpense
      .mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 0,
          title: 'Network',
          detail: 'Lost reply',
        })),
      )
      .mockReturnValue(of(cost));
    const input = {
      clientId: 'stable-operation',
      amount: '12.123456',
      description: 'Original repair',
      incurredAt: '2025-01-01T00:00:00Z',
    };
    store.write({
      kind: 'expense',
      organizationId: 'org',
      interventionId: cost.interventionId,
      input,
    });
    await vi.waitFor(() => expect(store.uncertainWrite()).toBe(true));
    input.description = 'Changed local object';
    input.amount = '99';
    store.retryWrite();
    await vi.waitFor(() => expect(store.command()).toBeNull());
    expect(api.createExpense.mock.calls[1]?.[2]).toEqual({
      clientId: 'stable-operation',
      amount: '12.123456',
      description: 'Original repair',
      incurredAt: '2025-01-01T00:00:00Z',
    });
    expect(store.command()).toBeNull();
  });
  it('retries an uncertain rate unchanged and refreshes only its bounded current history page', async () => {
    await setup();
    store.readRates({ scope, page: 2 });
    api.createRate
      .mockReturnValueOnce(
        throwError(() => ({
          type: 'about:blank',
          status: 503,
          title: 'Unavailable',
          detail: 'Lost reply',
        })),
      )
      .mockReturnValue(
        of({
          id: 'rate',
          currency: 'EUR',
          hourlyAmount: '50.000000',
          effectiveFrom: '2025-01-01',
          memberId: 'member',
          replayed: true,
        }),
      );
    const input = {
      clientId: 'stable-rate',
      memberId: 'member',
      hourlyAmount: '50.000000',
      effectiveFrom: '2025-01-01',
    };
    store.write({ kind: 'rate', organizationId: 'org', input });
    await vi.waitFor(() => expect(store.uncertainWrite()).toBe(true));
    store.retryWrite();
    await vi.waitFor(() => expect(store.command()).toBeNull());
    expect(api.createRate.mock.calls[1]?.[1]).toEqual(input);
    expect(api.listRates).toHaveBeenLastCalledWith('org', { page: 2, itemsPerPage: 30 });
  });
  it('requires finance management and matching command scope before any write', async () => {
    await setup();
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
    store.write({ kind: 'currency', organizationId: 'org', currency: 'USD' });
    expect(api.writeCurrency).not.toHaveBeenCalled();
    grants.set([
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ,
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
    ]);
    store.write({ kind: 'currency', organizationId: 'foreign', currency: 'USD' });
    expect(api.writeCurrency).not.toHaveBeenCalled();
    store.write({
      kind: 'expense',
      organizationId: 'org',
      interventionId: 'foreign',
      input: {
        clientId: 'stable',
        amount: '1',
        description: 'No',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    });
    expect(api.createExpense).not.toHaveBeenCalled();
  });
  it.each(['session', 'permission', 'logout'])(
    'clears private data when %s changes',
    async (mode) => {
      await setup();
      store.readCost(scope);
      store.readCurrency(scope);
      expect(store.costCallState().data).toEqual(cost);
      if (mode === 'session') revision.set(2);
      if (mode === 'permission') grants.set([]);
      if (mode === 'logout') authenticated.set(false);
      TestBed.tick();
      expect(store.scope()).toBeNull();
      expect(store.costCallState().data).toBeNull();
      expect(store.currencyCallState().data).toBeNull();
      expect(store.rateEntities()).toEqual([]);
    },
  );
  it('does not request the member directory without its independent permission', async () => {
    await setup();
    store.readMembers(scope);
    expect(members.listAll).not.toHaveBeenCalled();
    grants.set([...grants(), ORGANIZATION_PERMISSION.MEMBERS_READ]);
    store.readMembers(scope);
    expect(members.listAll).toHaveBeenCalledExactlyOnceWith('org');
  });

  it('blocks declarations until durable recovery succeeds and permits an explicit recovery retry', async () => {
    journal.readPending.mockRejectedValueOnce(new Error('Storage unavailable'));
    await setup();
    expect(store.journalReady()).toBe(false);
    store.write({ kind: 'currency', organizationId: 'org', currency: 'EUR' });
    expect(api.writeCurrency).not.toHaveBeenCalled();
    store.hydrate(scope);
    await vi.waitFor(() => expect(store.journalReady()).toBe(true));
    store.write({ kind: 'currency', organizationId: 'org', currency: 'EUR' });
    await vi.waitFor(() => expect(api.writeCurrency).toHaveBeenCalledTimes(1));
  });

  it('transmits no expense until its exact durable intention has committed', async () => {
    await setup();
    let release!: () => void;
    journal.retain.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const command = {
      kind: 'expense' as const,
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'persist-first',
        amount: '12.123456',
        description: 'Original',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    };
    store.write(command);
    expect(store.writePending()).toBe(true);
    expect(journal.retain).toHaveBeenCalledExactlyOnceWith(command);
    expect(api.createExpense).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() => expect(api.createExpense).toHaveBeenCalledTimes(1));
    expect(api.createExpense.mock.calls[0]?.[2]).toEqual(command.input);
  });

  it('clears private scope and fences an accepted response when the actor changes', async () => {
    const actor = signal('user-a');
    journal.captureOwner.mockImplementation(() => actor());
    await setup();
    store.readCost(scope);
    const accepted = new Subject<MaintenanceCostOutput>();
    api.createExpense.mockReturnValueOnce(accepted);
    store.write({
      kind: 'expense',
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'actor-bound',
        amount: '1',
        description: 'Original',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    });
    await vi.waitFor(() => expect(api.createExpense).toHaveBeenCalledTimes(1));
    actor.set('user-b');
    TestBed.tick();
    expect(store.scope()).toBeNull();
    expect(store.costCallState().data).toBeNull();
    accepted.next(cost);
    accepted.complete();
    await vi.waitFor(() => expect(store.writePending()).toBe(false));
    expect(journal.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'expense' }),
      1,
      'user-a',
    );
    expect(store.costCallState().data).toBeNull();
    expect(store.writeCallState().data).toBeNull();
  });

  it('retains exact retry when a confirmed response cannot be acknowledged durably', async () => {
    await setup();
    journal.acknowledge.mockRejectedValueOnce(new Error('Journal deletion failed'));
    const command = {
      kind: 'expense' as const,
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'acknowledgement-bound',
        amount: '1',
        description: 'Original',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    };
    store.write(command);
    await vi.waitFor(() => expect(store.uncertainWrite()).toBe(true));
    expect(store.command()).toEqual(command);
    store.retryWrite();
    await vi.waitFor(() => expect(store.command()).toBeNull());
    expect(api.createExpense.mock.calls[1]?.[2]).toEqual(command.input);
  });

  it('refuses an old exact retry synchronously after actor replacement without waiting for effects', async () => {
    const actor = signal('user-a');
    journal.captureOwner.mockImplementation(() => actor());
    await setup();
    api.createExpense.mockReturnValueOnce(
      throwError(() => ({
        type: 'about:blank',
        status: 0,
        title: 'Lost reply',
        detail: 'Unknown',
      })),
    );
    store.write({
      kind: 'expense',
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'old-actor',
        amount: '1',
        description: 'Private original',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    });
    await vi.waitFor(() => expect(store.uncertainWrite()).toBe(true));
    actor.set('user-b');
    expect(store.journalReady()).toBe(false);
    store.retryWrite();
    expect(journal.retain).toHaveBeenCalledTimes(1);
    expect(api.createExpense).toHaveBeenCalledTimes(1);
  });

  it('never acknowledges a first untransmitted expense when local retention fails', async () => {
    await setup();
    journal.retain.mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'));
    store.write({
      kind: 'expense',
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'untransmitted',
        amount: '1',
        description: 'Local draft',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    });
    await vi.waitFor(() => expect(store.writeCallState().status).toBe('error'));
    expect(api.createExpense).not.toHaveBeenCalled();
    expect(journal.acknowledge).not.toHaveBeenCalled();
    expect(store.uncertainWrite()).toBe(false);
    expect(store.command()).toMatchObject({
      input: { clientId: 'untransmitted', description: 'Local draft' },
    });
  });

  it('keeps a previous unknown expense locked when exact retry cannot access its durable journal', async () => {
    await setup();
    api.createExpense.mockReturnValueOnce(
      throwError(() => ({
        type: 'about:blank',
        status: 0,
        title: 'Lost reply',
        detail: 'Unknown',
      })),
    );
    const command = {
      kind: 'expense' as const,
      organizationId: 'org',
      interventionId: cost.interventionId,
      input: {
        clientId: 'previous-unknown',
        amount: '1',
        description: 'Original fact',
        incurredAt: '2025-01-01T00:00:00Z',
      },
    };
    store.write(command);
    await vi.waitFor(() => expect(store.uncertainWrite()).toBe(true));
    journal.retain.mockRejectedValueOnce(new Error('Storage inaccessible'));
    store.retryWrite();
    await vi.waitFor(() => expect(store.writeCallState().status).toBe('error'));
    expect(store.uncertainWrite()).toBe(true);
    expect(store.command()).toEqual(command);
    expect(journal.acknowledge).not.toHaveBeenCalled();
    expect(api.createExpense).toHaveBeenCalledTimes(1);
    store.retryWrite();
    await vi.waitFor(() => expect(store.command()).toBeNull());
    expect(api.createExpense.mock.calls[1]?.[2]).toEqual(command.input);
  });
});
