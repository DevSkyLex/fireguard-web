import { type Page, type Route } from '@playwright/test';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';

export const orgPath = '/api/organizations/' + E2E_ORGANIZATION_ID;
export const partId = '11111111-1111-4111-8111-111111111111';
export const warehouseId = '22222222-2222-4222-8222-222222222222';
export const consumptionId = '33333333-3333-4333-8333-333333333333';
export const movementId = '44444444-4444-4444-8444-444444444444';

export interface Part {
  '@id': string;
  '@type': string;
  id: string;
  code: string;
  label: string;
  unit: string;
  kind: 'part' | 'consumable';
  archived: boolean;
}
export interface PhysicalInput {
  clientOperationId: string;
  quantity: string;
  reason: string;
  partId?: string;
  warehouseId?: string;
  consumptionId?: string;
}
export function fixtures() {
  const parts: Part[] = [
    {
      '@id': orgPath + '/inventory-parts/' + partId,
      '@type': 'InventoryPart',
      id: partId,
      code: 'SEAL',
      label: 'Valve seal',
      unit: 'piece',
      kind: 'part',
      archived: false,
    },
  ];
  const warehouses = [
    {
      '@id': orgPath + '/inventory-warehouses/' + warehouseId,
      '@type': 'InventoryWarehouse',
      id: warehouseId,
      code: 'VAN',
      name: 'Service van',
      archived: false,
    },
  ];
  const consumption = {
    '@id': orgPath + '/inventory-consumptions/' + consumptionId,
    '@type': 'InventoryConsumption',
    id: consumptionId,
    partId,
    warehouseId,
    quantity: '3.000000',
    interventionId: 'intervention-1',
    actorId: 'member-1',
    occurredAt: '2026-10-06T11:00:00Z',
    status: 'received_pending' as 'received_pending' | 'confirmed',
    reason: 'insufficient_stock' as string | undefined,
    late: false,
    replayed: false,
  };
  const movement = {
    '@id': orgPath + '/inventory-movements/' + movementId,
    '@type': 'InventoryMovement',
    id: movementId,
    partId,
    warehouseId,
    kind: 'correction',
    quantity: '1.000001',
    reason: 'Physical count',
    actorId: 'member-1',
    occurredAt: '2026-10-06T11:00:00Z',
    late: false,
    replayed: false,
  };
  return { parts, warehouses, consumption, movement };
}
export async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) });
}
export async function mockInventory(
  page: Page,
  data: ReturnType<typeof fixtures>,
  writes: (route: Route, resource: string, id?: string) => Promise<void>,
): Promise<void> {
  await page.route(new RegExp(orgPath + '/inventory-[^?]*(?:\\?.*)?$'), async (route) => {
    const url = new URL(route.request().url());
    const suffix = url.pathname.slice(orgPath.length + 1).split('/');
    const resource = suffix[0] ?? '',
      id = suffix[1];
    if (route.request().method() !== 'GET') {
      await writes(route, resource, id);
      return;
    }
    if (resource === 'inventory-parts') {
      if (id) {
        await json(
          route,
          200,
          data.parts.find((part) => part.id === id),
        );
        return;
      }
      const archived = url.searchParams.get('archived');
      const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase();
      const entries = data.parts.filter(
        (part) =>
          (archived === null || part.archived === (archived === 'true')) &&
          (part.code + ' ' + part.label).toLocaleLowerCase().includes(search),
      );
      await json(route, 200, hydraCollection(entries));
      return;
    }
    if (resource === 'inventory-warehouses') {
      await json(route, 200, id ? data.warehouses[0] : hydraCollection(data.warehouses));
      return;
    }
    if (resource === 'inventory-balances') {
      await json(
        route,
        200,
        hydraCollection([
          {
            '@id': '/balance',
            '@type': 'InventoryBalance',
            id: 'balance-1',
            partId,
            warehouseId,
            quantity: '1.000000',
            valuation: {
              unitCost: '9123.000000',
              totalValue: '9123.000000',
              currency: 'EUR',
              incomplete: false,
            },
          },
        ]),
      );
      return;
    }
    if (resource === 'inventory-consumptions') {
      await json(route, 200, id ? data.consumption : hydraCollection([data.consumption]));
      return;
    }
    if (resource === 'inventory-movements') {
      await json(route, 200, hydraCollection([data.movement]));
      return;
    }
    await route.fallback();
  });
}
