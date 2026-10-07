import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import { MaintenanceCostService } from '@features/organization/features/maintenance-costs/data-access';
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
  const setup = (platform = 'browser'): void => {
    TestBed.configureTestingModule({
      providers: [
        MaintenanceCostStore,
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
  });
  it.each(['server', 'no-read', 'anonymous'])(
    'does not fetch any private collection in %s',
    (mode) => {
      if (mode === 'no-read') grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]);
      if (mode === 'anonymous') authenticated.set(false);
      setup(mode === 'server' ? 'server' : 'browser');
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
  it('cancels obsolete reads and clears private current/frozen facts on a scope change', () => {
    setup();
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
  it('never accepts a response with a foreign organization or intervention identity', () => {
    setup();
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
  it('passes planning revision zero independently and retains the dossier on stale failure', () => {
    setup();
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
    expect(api.writePlanning).toHaveBeenCalledExactlyOnceWith('org', cost.interventionId, input, 0);
    expect(store.writeCallState().error?.code).toBe(412);
    expect(store.costCallState().data).toEqual(cost);
    expect(store.command()).toMatchObject({ revision: 0, input });
    expect(store.uncertainWrite()).toBe(false);
  });
  it('does not cancel an accepted expense and discards its late result after a context replacement', () => {
    setup();
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
    expect(api.createExpense).toHaveBeenCalledTimes(1);
    store.setScope({ ...scope, organizationId: 'other' });
    expect(accepted.observed).toBe(true);
    expect(store.writePending()).toBe(true);
    expect(store.command()).toBeNull();
    accepted.next(cost);
    accepted.complete();
    expect(store.writePending()).toBe(false);
    expect(store.costCallState().data).toBeNull();
    expect(store.writeCallState().data).toBeNull();
  });
  it('retries an uncertain expense using the frozen exact key and original body', () => {
    setup();
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
    expect(store.uncertainWrite()).toBe(true);
    input.description = 'Changed local object';
    input.amount = '99';
    store.retryWrite();
    expect(api.createExpense.mock.calls[1]?.[2]).toEqual({
      clientId: 'stable-operation',
      amount: '12.123456',
      description: 'Original repair',
      incurredAt: '2025-01-01T00:00:00Z',
    });
    expect(store.command()).toBeNull();
  });
  it('retries an uncertain rate unchanged and refreshes only its bounded current history page', () => {
    setup();
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
    expect(store.uncertainWrite()).toBe(true);
    store.retryWrite();
    expect(api.createRate.mock.calls[1]?.[1]).toEqual(input);
    expect(api.listRates).toHaveBeenLastCalledWith('org', { page: 2, itemsPerPage: 30 });
  });
  it('requires finance management and matching command scope before any write', () => {
    setup();
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
  it.each(['session', 'permission', 'logout'])('clears private data when %s changes', (mode) => {
    setup();
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
  });
  it('does not request the member directory without its independent permission', () => {
    setup();
    store.readMembers(scope);
    expect(members.listAll).not.toHaveBeenCalled();
    grants.set([...grants(), ORGANIZATION_PERMISSION.MEMBERS_READ]);
    store.readMembers(scope);
    expect(members.listAll).toHaveBeenCalledExactlyOnceWith('org');
  });
});
