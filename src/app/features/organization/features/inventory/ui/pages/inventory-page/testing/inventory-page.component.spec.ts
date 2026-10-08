import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT } from '@core/theme';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  InventoryCommandRepository,
  InventoryService,
} from '@features/organization/features/inventory/data-access';
import type {
  InventoryConsumptionOutput,
  InventoryMovementOutput,
  InventoryPartOutput,
  InventoryPhysicalCommand,
} from '@features/organization/features/inventory/models';
import type { InventorySection } from '@features/organization/features/inventory/state/inventory';
import {
  ORGANIZATION_PERMISSION,
  type CurrentOrganizationMemberProfileOutput,
} from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports/organization-member-access';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { InventoryPage } from '../inventory-page.component';

describe('InventoryPage', () => {
  const profile: CurrentOrganizationMemberProfileOutput = {
    '@id': '/me',
    '@type': 'Member',
    id: 'member',
    userId: 'user',
    organizationId: 'org',
    isActive: true,
    joinedAt: '2026-10-06T10:00:00Z',
    roles: [],
    permissions: [],
  };
  const part: InventoryPartOutput = {
    '@id': '/part',
    '@type': 'InventoryPart',
    id: 'part',
    code: 'SEAL',
    label: 'Seal',
    kind: 'part',
    unit: 'piece',
    archived: false,
  };
  const consumption: InventoryConsumptionOutput = {
    '@id': '/consumption',
    '@type': 'InventoryConsumption',
    id: 'consumption',
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '2.000000',
    interventionId: 'intervention',
    actorId: 'actor',
    occurredAt: '2026-10-06T10:00:00Z',
    status: 'confirmed',
    late: false,
    replayed: false,
  };
  const movement: InventoryMovementOutput = {
    '@id': '/movement',
    '@type': 'InventoryMovement',
    id: 'movement',
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '1.000000',
    kind: 'correction',
    reason: 'Physical count',
    actorId: 'actor',
    occurredAt: '2026-10-06T10:00:00Z',
    late: false,
    replayed: false,
  };
  const draft = {
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '-1.000001',
    reason: 'Physical count',
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  async function setup(
    options: {
      section?: InventorySection;
      grants?: readonly string[];
      platform?: 'browser' | 'server';
    } = {},
  ) {
    const grants = signal<readonly string[]>(
      options.grants ?? [ORGANIZATION_PERMISSION.INVENTORY_READ],
    );
    const online = signal(true);
    const member = signal<CurrentOrganizationMemberProfileOutput | null>(profile);
    const revision = signal(1);
    const authenticated = signal(true);
    const entries = new Map<string, InventoryPhysicalCommand>();
    const service = {
      listParts: vi.fn().mockReturnValue(of({ member: [part], totalItems: 81 })),
      listWarehouses: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listBalances: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listConsumptions: vi.fn().mockReturnValue(of({ member: [consumption], totalItems: 1 })),
      listMovements: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      readPart: vi.fn().mockReturnValue(of(part)),
      readWarehouse: vi.fn().mockReturnValue(
        of({
          '@id': '/warehouse',
          '@type': 'InventoryWarehouse',
          id: 'warehouse',
          code: 'VAN',
          name: 'Van',
          archived: false,
        }),
      ),
      createPart: vi.fn().mockReturnValue(of(part)),
      updatePart: vi.fn().mockReturnValue(of(part)),
      createWarehouse: vi.fn().mockReturnValue(of({ id: 'warehouse' })),
      updateWarehouse: vi.fn().mockReturnValue(of({ id: 'warehouse' })),
      correctStock: vi.fn().mockReturnValue(of(movement)),
      returnConsumption: vi.fn().mockReturnValue(of({ ...movement, kind: 'return' })),
      reconcileConsumption: vi.fn().mockReturnValue(of(consumption)),
    };
    const journal = {
      sessionRevision: vi.fn(() => revision()),
      isCurrent: vi.fn(
        (userId: string, organizationId: string, sessionRevision = revision()) =>
          !!member()?.isActive &&
          authenticated() &&
          member()?.userId === userId &&
          member()?.organizationId === organizationId &&
          sessionRevision === revision(),
      ),
      readPending: vi.fn(async (userId: string, organizationId: string) =>
        [...entries.values()].filter(
          (command) => command.userId === userId && command.organizationId === organizationId,
        ),
      ),
      retain: vi.fn(async (command: InventoryPhysicalCommand) => {
        entries.set(command.input.clientOperationId, command);
      }),
      acknowledge: vi.fn(async (command: InventoryPhysicalCommand) => {
        entries.delete(command.input.clientOperationId);
      }),
    };
    const dispatcher = { dispatch: vi.fn() };
    TestBed.configureTestingModule({
      imports: [InventoryPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
        { provide: InventoryService, useValue: service },
        { provide: InventoryCommandRepository, useValue: journal },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { profile: member } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
        { provide: ConnectivityService, useValue: { isOnline: online } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(EMPTY) } },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });
    const fixture = TestBed.createComponent(InventoryPage);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('section', options.section ?? 'parts');
    await fixture.whenStable();
    return {
      fixture,
      page: fixture.componentInstance,
      grants,
      online,
      member,
      revision,
      entries,
      service,
      journal,
      dispatcher,
    };
  }

  it('loads the scoped active directory and keeps server search while changing pages', async () => {
    const { page, fixture, service } = await setup();
    expect(service.listParts).toHaveBeenCalledWith(
      'org',
      expect.objectContaining({ page: 1, itemsPerPage: 20, params: { archived: false } }),
    );
    page['filters'].update((value) => ({ ...value, search: '  seal  ' }));
    page['applyFilters']();
    page['changePage'](3);
    expect(service.listParts).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ page: 3, search: 'seal', params: { archived: false } }),
    );
    page['filterChoice']('archived', 'archived');
    await fixture.whenStable();
    expect(service.listParts).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ page: 1, search: 'seal', params: { archived: true } }),
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Seal');
  });

  it('clears old server pages and editor context when the route organization changes', async () => {
    const { page, fixture, member, service } = await setup({
      grants: [ORGANIZATION_PERMISSION.INVENTORY_READ, ORGANIZATION_PERMISSION.INVENTORY_MANAGE],
    });
    page['open']('part', part);
    page['dirty'].set(true);
    fixture.componentRef.setInput('organizationId', 'new-org');
    member.set({ ...profile, organizationId: 'new-org' });
    await fixture.whenStable();
    expect(page['editor']()).toBe(null);
    expect(page['filters']().search).toBe('');
    expect(service.listParts).toHaveBeenLastCalledWith(
      'new-org',
      expect.objectContaining({ params: { archived: false } }),
    );
  });

  it('suppresses both directory and picker reads during SSR', async () => {
    const { service, journal } = await setup({ section: 'balances', platform: 'server' });
    expect(service.listBalances).not.toHaveBeenCalled();
    expect(service.listParts).not.toHaveBeenCalled();
    expect(service.listWarehouses).not.toHaveBeenCalled();
    expect(journal.readPending).not.toHaveBeenCalled();
  });

  it('suppresses all authenticated stock reads without inventory read permission', async () => {
    const { service, journal } = await setup({ section: 'balances', grants: [] });
    expect(service.listBalances).not.toHaveBeenCalled();
    expect(service.listParts).not.toHaveBeenCalled();
    expect(service.listWarehouses).not.toHaveBeenCalled();
    expect(journal.readPending).not.toHaveBeenCalled();
  });

  it('keeps inventory administration separate from execution and financial authorization', async () => {
    const { page, grants, fixture, service } = await setup({
      section: 'consumptions',
      grants: [ORGANIZATION_PERMISSION.INVENTORY_READ, ORGANIZATION_PERMISSION.INVENTORY_MANAGE],
    });
    expect(page['canManage']()).toBe(true);
    expect(page['canCorrect']()).toBe(false);
    expect(page['canReconcile']()).toBe(false);
    expect(page['canReturn']()).toBe(false);
    page['open']('correction');
    expect(page['editor']()).toBe(null);
    const pending = { ...consumption, status: 'received_pending' as const };
    page['rowAction']({ kind: 'reconcile', record: pending });
    expect(service.reconcileConsumption).not.toHaveBeenCalled();
    grants.set([
      ORGANIZATION_PERMISSION.INVENTORY_READ,
      ORGANIZATION_PERMISSION.INVENTORY_MANAGE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
    ]);
    await fixture.whenStable();
    expect(page['canReconcile']()).toBe(true);
    expect(page['canCorrect']()).toBe(false);
    page['rowAction']({ kind: 'reconcile', record: pending });
    expect(service.reconcileConsumption).toHaveBeenCalledWith('org', consumption.id);
  });

  it('requires both consumption and execution grants for a confirmed physical return', async () => {
    const { page, grants, fixture, service } = await setup({
      section: 'consumptions',
      grants: [ORGANIZATION_PERMISSION.INVENTORY_READ, ORGANIZATION_PERMISSION.INVENTORY_CONSUME],
    });
    page['rowAction']({ kind: 'return', record: consumption });
    expect(page['editor']()).toBe(null);
    grants.set([
      ORGANIZATION_PERMISSION.INVENTORY_READ,
      ORGANIZATION_PERMISSION.INVENTORY_CONSUME,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
    ]);
    await fixture.whenStable();
    page['rowAction']({ kind: 'return', record: { ...consumption, status: 'received_pending' } });
    expect(page['editor']()).toBe(null);
    page['rowAction']({ kind: 'return', record: consumption });
    page['movementSubmitted']({ ...draft, quantity: '0.000001' });
    await fixture.whenStable();
    expect(service.returnConsumption).toHaveBeenCalledWith(
      'org',
      expect.objectContaining({
        consumptionId: consumption.id,
        quantity: '0.000001',
        reason: draft.reason,
      }),
    );
    expect(service.returnConsumption.mock.calls[0]?.[1]).not.toHaveProperty('partId');
  });

  it('updates descriptions without transporting a tampered permanent reference identity', async () => {
    const { page, service, fixture } = await setup({
      grants: [ORGANIZATION_PERMISSION.INVENTORY_READ, ORGANIZATION_PERMISSION.INVENTORY_MANAGE],
    });
    page['open']('part', part);
    page['referenceSubmitted']({
      code: 'CHANGED',
      label: 'Updated seal',
      unit: 'pack',
      kind: 'consumable',
    });
    await fixture.whenStable();
    expect(service.updatePart).toHaveBeenCalledWith('org', part.id, {
      label: 'Updated seal',
      unit: 'pack',
    });
  });

  it('keeps an uncertain physical command durable after editor dismissal and retries its exact body', async () => {
    const { page, service, journal, entries, fixture } = await setup({
      section: 'balances',
      grants: [
        ORGANIZATION_PERMISSION.INVENTORY_READ,
        ORGANIZATION_PERMISSION.INVENTORY_MANAGE,
        ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
      ],
    });
    service.correctStock.mockReturnValueOnce(throwError(() => new Error('Network response lost')));
    page['open']('correction');
    page['movementSubmitted'](draft);
    page['movementSubmitted'](draft);
    await fixture.whenStable();
    expect(service.correctStock).toHaveBeenCalledTimes(1);
    expect(journal.retain).toHaveBeenCalledTimes(1);
    const command = page['retained']();
    if (!command) throw new Error('Expected retained physical command');
    expect(entries.get(command.input.clientOperationId)).toEqual(command);
    expect(command.input.clientOperationId).toMatch(/^[0-9a-f-]{36}$/);
    page['requestClose']();
    await fixture.whenStable();
    expect(page['editor']()).toBe(null);
    expect(entries.get(command.input.clientOperationId)).toEqual(command);
    page['retryPhysical'](command);
    await fixture.whenStable();
    expect(service.correctStock).toHaveBeenCalledTimes(2);
    expect(service.correctStock.mock.calls[1]?.[1]).toBe(service.correctStock.mock.calls[0]?.[1]);
    expect(journal.acknowledge).toHaveBeenCalledWith(command, 1);
    expect(entries.size).toBe(0);
  });

  it('requires an explicit discard if the physical intention could not be stored locally', async () => {
    const { page, journal, service, fixture } = await setup({
      section: 'balances',
      grants: [
        ORGANIZATION_PERMISSION.INVENTORY_READ,
        ORGANIZATION_PERMISSION.INVENTORY_MANAGE,
        ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
      ],
    });
    journal.retain.mockRejectedValueOnce(new Error('Storage full'));
    page['open']('correction');
    page['movementSubmitted'](draft);
    await fixture.whenStable();
    expect(service.correctStock).not.toHaveBeenCalled();
    expect(page['retainedIsDurable']()).toBe(false);
    expect(page.hasUnsavedChanges()).toBe(true);
    page['requestClose']();
    expect(page['confirmation']()).toBe('open');
    page['resolveConfirmation'](false);
    expect(page['retained']()).not.toBe(null);
  });

  it('prevents dismissal during an accepted command and suppresses its UI effects after session replacement', async () => {
    const { page, fixture, service, revision, dispatcher, journal } = await setup({
      section: 'balances',
      grants: [
        ORGANIZATION_PERMISSION.INVENTORY_READ,
        ORGANIZATION_PERMISSION.INVENTORY_MANAGE,
        ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
      ],
    });
    const response = new Subject<InventoryMovementOutput>();
    service.correctStock.mockReturnValue(response);
    page['open']('correction');
    page['movementSubmitted'](draft);
    await fixture.whenStable();
    page['requestClose']();
    expect(page['editor']()).toBe('correction');
    expect(await page.confirmDeactivation()).toBe(false);
    revision.set(3);
    await fixture.whenStable();
    expect(page['editor']()).toBe(null);
    response.next(movement);
    await fixture.whenStable();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(journal.acknowledge).not.toHaveBeenCalled();
  });

  it('guards dirty reference drafts and rejects unauthorized or offline command replay', async () => {
    const { page, fixture, online, service } = await setup({
      grants: [ORGANIZATION_PERMISSION.INVENTORY_READ, ORGANIZATION_PERMISSION.INVENTORY_MANAGE],
    });
    page['open']('part');
    page['dirty'].set(true);
    page['requestClose']();
    expect(page['confirmation']()).toBe('open');
    page['resolveConfirmation'](false);
    expect(page['editor']()).toBe('part');
    expect(page.hasUnsavedChanges()).toBe(true);
    online.set(false);
    await fixture.whenStable();
    page['referenceSubmitted']({ code: 'SEAL', label: 'Seal', unit: 'piece', kind: 'part' });
    page['retryPhysical']({
      kind: 'correction',
      organizationId: 'org',
      userId: 'user',
      input: {
        clientOperationId: 'existing',
        partId: 'part',
        warehouseId: 'warehouse',
        quantity: '1.000000',
        reason: 'Count',
      },
    });
    expect(service.createPart).not.toHaveBeenCalled();
    expect(service.correctStock).not.toHaveBeenCalled();
  });
});
