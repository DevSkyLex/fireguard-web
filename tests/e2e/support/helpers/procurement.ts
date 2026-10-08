import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import type {
  ChangePurchaseOrderInput,
  ChangeSupplierInput,
  IndividualizeReceiptInput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
  PurchaseOrderOutput,
  ReceivePurchaseOrderInput,
  ReconcileProcurementReturnInput,
  ReturnProcurementReceiptInput,
  SupplierOutput,
} from '@features/organization/features/procurement/models';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  hydraCollection,
} from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';

export const PROCUREMENT_SUPPLIER_ID = '910e8400-e29b-41d4-a716-446655810001';
export const PROCUREMENT_ORDER_ID = '910e8400-e29b-41d4-a716-446655810002';
export const PROCUREMENT_RECEIPT_ID = '910e8400-e29b-41d4-a716-446655810003';
export const PROCUREMENT_RETURN_ID = '910e8400-e29b-41d4-a716-446655810004';
export const PROCUREMENT_PART_ID = '910e8400-e29b-41d4-a716-446655810005';
export const PROCUREMENT_WAREHOUSE_ID = '910e8400-e29b-41d4-a716-446655810006';
export const PROCUREMENT_EQUIPMENT_ID = '910e8400-e29b-41d4-a716-446655810007';
export const PROCUREMENT_SUPPLIER_NAME = 'Fire-safety maintenance supplies';
export const PROCUREMENT_ARCHIVED_SUPPLIER_NAME = 'Archived fire-safety supplier';
export const PROCUREMENT_PART_LABEL = 'Extinguisher valve seal';
export const PROCUREMENT_WAREHOUSE_NAME = 'Fire maintenance van';
const orgPath = `/api/organizations/${E2E_ORGANIZATION_ID}`;
const procurementPath = orgPath + '/procurement';
const instant = new Date(Date.now() - 3_600_000).toISOString();

interface Attempt<T> {
  readonly body: T;
  readonly ifMatch: string | undefined;
}

export interface ProcurementMockState {
  supplier: SupplierOutput | null;
  order: PurchaseOrderOutput | null;
  receipt: ProcurementReceiptOutput | null;
  returned: ProcurementReturnOutput | null;
  readonly receiveAttempts: Attempt<ReceivePurchaseOrderInput>[];
  readonly returnAttempts: Attempt<ReturnProcurementReceiptInput>[];
  readonly individualizeAttempts: Attempt<IndividualizeReceiptInput>[];
  readonly reconcileAttempts: Attempt<ReconcileProcurementReturnInput>[];
  readonly supplierQueries: string[];
  committedReceipts: number;
  committedReturns: number;
  createdEquipment: number;
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) });
}

/** Composes only this feature's routes over the authenticated unknown-request safety net. */
export async function installProcurement(
  page: Page,
  options: {
    readonly hardware?: boolean;
    readonly loseReceiptReply?: boolean;
    readonly supplierDirectory?: boolean;
  } = {},
): Promise<ProcurementMockState> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: options.hardware
      ? ALL_ORGANIZATION_PERMISSIONS.filter(
          (permission) => !permission.startsWith('organization.maintenance_cost.'),
        )
      : ALL_ORGANIZATION_PERMISSIONS,
  });
  await api.mockEquipmentTypeCatalog(E2E_ORGANIZATION_ID);
  const state: ProcurementMockState = {
    supplier: null,
    order: null,
    receipt: null,
    returned: null,
    receiveAttempts: [],
    returnAttempts: [],
    individualizeAttempts: [],
    reconcileAttempts: [],
    supplierQueries: [],
    committedReceipts: 0,
    committedReturns: 0,
    createdEquipment: 0,
  };
  const receipts = new Map<string, Attempt<ReceivePurchaseOrderInput>>();
  const returns = new Map<string, Attempt<ReturnProcurementReceiptInput>>();
  const individualizations = new Map<string, ProcurementReceiptOutput>();
  const parts = [
    {
      '@id': orgPath + '/inventory-parts/' + PROCUREMENT_PART_ID,
      '@type': 'InventoryPart',
      id: PROCUREMENT_PART_ID,
      code: 'SEAL',
      label: 'Extinguisher valve seal',
      unit: 'piece',
      kind: 'part',
      archived: false,
    },
  ];
  const warehouses = [
    {
      '@id': orgPath + '/inventory-warehouses/' + PROCUREMENT_WAREHOUSE_ID,
      '@type': 'InventoryWarehouse',
      id: PROCUREMENT_WAREHOUSE_ID,
      code: 'VAN',
      name: PROCUREMENT_WAREHOUSE_NAME,
      archived: false,
    },
  ];
  await page.route(
    new RegExp(orgPath + '/inventory-(parts|warehouses)(?:/[^?]+)?(?:\\?.*)?$'),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const suffix = url.pathname.split('/').at(-1);
      const collection = suffix?.startsWith('inventory-');
      await json(
        route,
        url.pathname.includes('inventory-parts')
          ? collection
            ? hydraCollection(parts)
            : parts[0]
          : collection
            ? hydraCollection(warehouses)
            : warehouses[0],
      );
    },
  );
  await page.route(new RegExp(procurementPath + '(?:/[^?]*)?(?:\\?.*)?$'), async (route) => {
    const request = route.request();
    const method = request.method();
    const suffix = new URL(request.url()).pathname.slice(procurementPath.length + 1).split('/');
    const resource = suffix[0];
    const id = suffix[1];
    const action = suffix[2];
    if (resource === 'suppliers') {
      if (method === 'GET') {
        const url = new URL(request.url());
        const archived = url.searchParams.get('archived') ?? 'false';
        state.supplierQueries.push(archived);
        const seeded: SupplierOutput[] = options.supplierDirectory
          ? [
              {
                '@id': procurementPath + '/suppliers/' + PROCUREMENT_SUPPLIER_ID,
                '@type': 'Supplier',
                id: PROCUREMENT_SUPPLIER_ID,
                organizationId: E2E_ORGANIZATION_ID,
                name: PROCUREMENT_SUPPLIER_NAME,
                contacts: [],
                revision: 1,
                createdAt: instant,
                updatedAt: instant,
                replayed: false,
              },
              {
                '@id': procurementPath + '/suppliers/archived',
                '@type': 'Supplier',
                id: '910e8400-e29b-41d4-a716-446655810009',
                organizationId: E2E_ORGANIZATION_ID,
                name: PROCUREMENT_ARCHIVED_SUPPLIER_NAME,
                contacts: [],
                archivedAt: instant,
                revision: 2,
                createdAt: instant,
                updatedAt: instant,
                replayed: false,
              },
            ]
          : state.supplier
            ? [state.supplier]
            : [];
        const search = (url.searchParams.get('search') ?? '').toLowerCase();
        const matches = seeded.filter(
          (supplier) =>
            (archived === 'all' || Boolean(supplier.archivedAt) === (archived === 'true')) &&
            (supplier.name.toLowerCase().includes(search) ||
              supplier.code?.toLowerCase().includes(search)),
        );
        const limit = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get('itemsPerPage') ?? 30)),
        );
        const offset = (Math.max(1, Number(url.searchParams.get('page') ?? 1)) - 1) * limit;
        await json(
          route,
          id
            ? seeded.find((supplier) => supplier.id === id)
            : {
                ...hydraCollection(matches.slice(offset, offset + limit)),
                totalItems: matches.length,
              },
        );
        return;
      }
      if (method === 'POST' && !id) {
        const body = request.postDataJSON() as ChangeSupplierInput;
        state.supplier = {
          '@id': procurementPath + '/suppliers/' + PROCUREMENT_SUPPLIER_ID,
          '@type': 'ProcurementSupplier',
          id: PROCUREMENT_SUPPLIER_ID,
          organizationId: E2E_ORGANIZATION_ID,
          ...body,
          contacts: body.contacts ?? [],
          revision: 1,
          createdAt: instant,
          updatedAt: instant,
          replayed: false,
        };
        await json(route, state.supplier, 201);
        return;
      }
    }
    if (resource === 'orders') {
      if (method === 'GET') {
        await json(
          route,
          action === 'receipts'
            ? hydraCollection(state.receipt ? [state.receipt] : [])
            : id
              ? state.order
              : hydraCollection(state.order ? [state.order] : []),
        );
        return;
      }
      if (method === 'POST' && !id) {
        const body = request.postDataJSON() as ChangePurchaseOrderInput;
        state.order = {
          '@id': procurementPath + '/orders/' + PROCUREMENT_ORDER_ID,
          '@type': 'ProcurementOrder',
          id: PROCUREMENT_ORDER_ID,
          organizationId: E2E_ORGANIZATION_ID,
          ...body,
          currency: 'EUR',
          status: 'draft',
          revision: 1,
          createdAt: instant,
          updatedAt: instant,
          replayed: false,
          financialVisible: !options.hardware,
          lines: body.lines.map((line) =>
            Object.assign({}, line, {
              id: line.id ?? '910e8400-e29b-41d4-a716-446655810008',
              identityTemplate: line.identityTemplate ?? [],
              quantity: options.hardware ? '1.000000' : '1.000002',
              receivedQuantity: '0.000000',
              returnedQuantity: '0.000000',
              remainingQuantity: options.hardware ? '1.000000' : '1.000002',
              ...(line.kind === 'part'
                ? { partCode: 'SEAL', partLabel: 'Extinguisher valve seal', partUnit: 'piece' }
                : {}),
            }),
          ),
        };
        await json(route, state.order, 201);
        return;
      }
      if (action === 'order' && state.order) {
        expect(request.headers()['if-match']).toBe(`"revision-${state.order.revision}"`);
        state.order = { ...state.order, status: 'ordered', revision: state.order.revision + 1 };
        await json(route, state.order);
        return;
      }
      if (action === 'receipts' && method === 'POST' && state.order) {
        const attempt = {
          body: request.postDataJSON() as ReceivePurchaseOrderInput,
          ifMatch: request.headers()['if-match'],
        };
        state.receiveAttempts.push(attempt);
        const previous = receipts.get(attempt.body.clientOperationId);
        if (previous) {
          expect(attempt).toEqual(previous);
          await json(route, { ...state.receipt, replayed: true });
          return;
        }
        expect(attempt.ifMatch).toBe(`"revision-${state.order.revision}"`);
        receipts.set(attempt.body.clientOperationId, attempt);
        state.committedReceipts++;
        state.receipt = {
          '@id': procurementPath + '/receipts/' + PROCUREMENT_RECEIPT_ID,
          '@type': 'ProcurementReceipt',
          id: PROCUREMENT_RECEIPT_ID,
          organizationId: E2E_ORGANIZATION_ID,
          orderId: PROCUREMENT_ORDER_ID,
          ...attempt.body,
          kind: options.hardware ? 'equipment_to_individualize' : 'part',
          quantity: options.hardware ? '1.000000' : '0.500001',
          currency: 'EUR',
          createdAt: instant,
          equipmentIds: [],
          returnedQuantity: '0.000000',
          pendingReturnQuantity: '0.000000',
          revision: 1,
          financialVisible: !options.hardware,
          status: options.hardware ? 'awaiting_individualization' : 'stock_received',
          ...(options.hardware
            ? {}
            : { unitCost: '3.000001', inventoryMovementId: 'receipt-movement' }),
          replayed: false,
        };
        state.order = {
          ...state.order,
          revision: state.order.revision + 1,
          status: options.hardware ? 'received' : 'partial_received',
          lines: state.order.lines.map((line) => ({
            ...line,
            receivedQuantity: options.hardware ? '1.000000' : '0.500001',
            remainingQuantity: options.hardware ? '0.000000' : '0.500001',
          })),
        };
        if (options.loseReceiptReply) {
          await route.abort('failed');
          return;
        }
        await json(route, state.receipt);
        return;
      }
    }
    if (resource === 'receipts' && state.receipt) {
      if (method === 'GET') {
        await json(
          route,
          action === 'returns'
            ? hydraCollection(state.returned ? [state.returned] : [])
            : state.receipt,
        );
        return;
      }
      if (action === 'returns') {
        const attempt = {
          body: request.postDataJSON() as ReturnProcurementReceiptInput,
          ifMatch: request.headers()['if-match'],
        };
        state.returnAttempts.push(attempt);
        const previous = returns.get(attempt.body.clientOperationId);
        if (previous) {
          expect(attempt).toEqual(previous);
          await json(route, state.returned);
          return;
        }
        expect(attempt.ifMatch).toBe(`"revision-${state.receipt.revision}"`);
        returns.set(attempt.body.clientOperationId, attempt);
        state.committedReturns++;
        state.returned = {
          '@id': procurementPath + '/returns/' + PROCUREMENT_RETURN_ID,
          '@type': 'ProcurementReturn',
          id: PROCUREMENT_RETURN_ID,
          organizationId: E2E_ORGANIZATION_ID,
          receiptId: state.receipt.id,
          ...attempt.body,
          quantity: '0.250001',
          status: 'awaiting_reconciliation',
          blockedReason: 'insufficient_stock',
          revision: 1,
          createdAt: instant,
          replayed: false,
        };
        state.receipt = {
          ...state.receipt,
          returnedQuantity: '0.250001',
          pendingReturnQuantity: '0.250001',
          revision: 2,
        };
        if (state.order)
          state.order = {
            ...state.order,
            revision: state.order.revision + 1,
            lines: state.order.lines.map((line) => ({ ...line, returnedQuantity: '0.250001' })),
          };
        await json(route, state.returned);
        return;
      }
      if (action === 'individualize') {
        const attempt = {
          body: request.postDataJSON() as IndividualizeReceiptInput,
          ifMatch: request.headers()['if-match'],
        };
        state.individualizeAttempts.push(attempt);
        const previous = individualizations.get(attempt.body.clientOperationId);
        if (previous) {
          await json(route, { ...previous, replayed: true });
          return;
        }
        expect(attempt.ifMatch).toBe(`"revision-${state.receipt.revision}"`);
        state.receipt =
          state.individualizeAttempts.length === 1
            ? { ...state.receipt, revision: 2, blockedReason: 'quota_exceeded' }
            : {
                ...state.receipt,
                revision: 3,
                blockedReason: null,
                status: 'individualized',
                equipmentIds: [PROCUREMENT_EQUIPMENT_ID],
              };
        individualizations.set(attempt.body.clientOperationId, state.receipt);
        if (state.receipt.status === 'individualized') {
          state.createdEquipment++;
          await route.abort('failed');
          return;
        }
        await json(route, state.receipt);
        return;
      }
    }
    if (resource === 'returns' && state.returned) {
      if (method === 'GET') {
        await json(route, state.returned);
        return;
      }
      if (action === 'reconcile') {
        const attempt = {
          body: request.postDataJSON() as ReconcileProcurementReturnInput,
          ifMatch: request.headers()['if-match'],
        };
        state.reconcileAttempts.push(attempt);
        expect(attempt.ifMatch).toBe(`"revision-${state.returned.revision}"`);
        state.returned = {
          ...state.returned,
          revision: 2,
          status: 'confirmed',
          blockedReason: null,
          inventoryMovementId: 'return-movement',
          reconciledAt: instant,
        };
        if (state.receipt)
          state.receipt = { ...state.receipt, pendingReturnQuantity: '0.000000', revision: 3 };
        await json(route, state.returned);
        return;
      }
    }
    await route.fallback();
  });
  return state;
}

/** Retains the real native overlay/page composition and verifies both viewport and internal reflow. */
export async function captureProcurement(page: Page, info: TestInfo, name: string): Promise<void> {
  const run = process.env['FG_VISUAL_RUN'] ?? 'review';
  if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Invalid visual run name');
  const directory = join(
    'tests/e2e/artifacts/procurement',
    run,
    info.project.name.replaceAll(' ', '-'),
  );
  await mkdir(directory, { recursive: true });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(page.locator('#procurement-workspace'));
  const editor = page.getByTestId('procurement-editor');
  if (await editor.isVisible()) await expectNoInternalOverflow(editor);
  const screenshot = join(directory, name + '.png');
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await info.attach(name, { path: screenshot, contentType: 'image/png' });
}
