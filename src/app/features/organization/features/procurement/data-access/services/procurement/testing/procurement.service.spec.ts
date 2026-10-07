import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  SupplierOutput,
  PurchaseOrderOutput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
  ReceivePurchaseOrderInput,
  ReturnProcurementReceiptInput,
} from '@features/organization/features/procurement/models';
import { ProcurementService } from '../procurement.service';

const supplier: SupplierOutput = {
  '@id': '/suppliers/supplier',
  '@type': 'Procurement',
  id: 'supplier',
  organizationId: 'org',
  name: 'Fire supplies',
  contacts: [],
  revision: 3,
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
  replayed: false,
};
const order: PurchaseOrderOutput = {
  '@id': '/orders/order',
  '@type': 'Procurement',
  id: 'order',
  organizationId: 'org',
  supplierId: 'supplier',
  name: 'Consumables and reserve equipment',
  currency: 'EUR',
  status: 'ordered',
  lines: [],
  financialVisible: false,
  revision: 7,
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
  replayed: false,
};
const receipt: ProcurementReceiptOutput = {
  '@id': '/receipts/receipt',
  '@type': 'Procurement',
  id: 'receipt',
  organizationId: 'org',
  orderId: 'order',
  lineId: 'line',
  kind: 'part',
  quantity: '0.250000',
  warehouseId: 'warehouse',
  currency: 'EUR',
  receivedAt: '2026-10-05T10:00:00Z',
  createdAt: '2026-10-05T10:00:00Z',
  inventoryMovementId: 'movement',
  equipmentIds: [],
  returnedQuantity: '0.000000',
  pendingReturnQuantity: '0.000000',
  status: 'stock_received',
  revision: 2,
  financialVisible: false,
  replayed: false,
};

const returned: ProcurementReturnOutput = {
  '@id': '/returns/returned',
  '@type': 'ProcurementReturn',
  id: 'returned',
  organizationId: 'org',
  receiptId: 'receipt',
  clientOperationId: 'd3b2f4b4-fb84-458b-8e65-e340d84ae97f',
  quantity: '0.050000',
  reason: 'Damaged packaging',
  status: 'awaiting_reconciliation',
  inventoryMovementId: null,
  blockedReason: 'insufficient_stock',
  createdAt: '2026-10-05T10:00:00Z',
  reconciledAt: null,
  revision: 4,
  replayed: false,
};

describe('ProcurementService', () => {
  let service: ProcurementService;
  let http: HttpTestingController;
  const url = 'https://api.test/api/organizations/org/procurement';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProcurementService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(ProcurementService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('delegates directory filters, order status and receipt source pagination to the API', () => {
    service
      .listSuppliers('org', {
        search: 'fire',
        page: 2,
        itemsPerPage: 30,
        params: { archived: false },
      })
      .subscribe();
    const suppliers = http.expectOne((req) => req.url === url + '/suppliers');
    expect(suppliers.request.params.get('search')).toBe('fire');
    expect(suppliers.request.params.get('archived')).toBe('false');
    expect(suppliers.request.params.get('page')).toBe('2');
    suppliers.flush({ member: [], totalItems: 0 });
    service
      .listOrders('org', { params: { status: 'partial_received', supplierId: 'supplier' } })
      .subscribe();
    const orders = http.expectOne((req) => req.url === url + '/orders');
    expect(orders.request.params.get('status')).toBe('partial_received');
    orders.flush({ member: [], totalItems: 0 });
    service.listReceipts('org', 'order', { page: 3 }).subscribe();
    const receipts = http.expectOne((req) => req.url === url + '/orders/order/receipts');
    expect(receipts.request.params.get('page')).toBe('3');
    receipts.flush({ member: [], totalItems: 0 });
  });
  it('serializes the explicit all archive state without treating it as an omitted filter', () => {
    service.listSuppliers('org', { page: 2, params: { archived: 'all' } }).subscribe();
    const request = http.expectOne((req) => req.url === url + '/suppliers');
    expect(request.request.params.get('archived')).toBe('all');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ member: [], totalItems: 0 });
  });

  it('uses retained detail identifiers including archived suppliers', () => {
    service.readSupplier('org', 'supplier').subscribe();
    http.expectOne(url + '/suppliers/supplier').flush(supplier);
    service.readOrder('org', 'order').subscribe();
    http.expectOne(url + '/orders/order').flush(order);
    service.readReceipt('org', 'receipt').subscribe();
    http.expectOne(url + '/receipts/receipt').flush(receipt);
  });
  it('creates internal drafts with exact decimal strings and no commercial currency or billing fields', () => {
    service
      .createSupplier('org', { name: 'Fire supplies', contacts: [{ name: 'Mary', role: 'Parts' }] })
      .subscribe();
    const supplierRequest = http.expectOne(url + '/suppliers');
    expect(supplierRequest.request.body.contacts).toEqual([{ name: 'Mary', role: 'Parts' }]);
    supplierRequest.flush(supplier);
    const input = {
      name: 'Parts order',
      supplierId: 'supplier',
      lines: [{ kind: 'part' as const, partId: 'part', quantity: '0.250000' }],
    };
    service.createOrder('org', input).subscribe();
    const request = http.expectOne(url + '/orders');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    expect(request.request.body.lines[0].unitCost).toBeUndefined();
    expect(request.request.body.currency).toBeUndefined();
    request.flush(order);
  });
  it('guards supplier and purchase lifecycle changes with their displayed quoted revision', () => {
    service
      .updateSupplier('org', supplier, { name: 'Changed', email: null, contacts: [] })
      .subscribe();
    const updateSupplier = http.expectOne(url + '/suppliers/supplier');
    expect(updateSupplier.request.headers.get('If-Match')).toBe('"revision-3"');
    expect(updateSupplier.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    updateSupplier.flush(supplier);
    service.archiveSupplier('org', supplier).subscribe();
    const archive = http.expectOne(url + '/suppliers/supplier/archive');
    expect(archive.request.method).toBe('POST');
    expect(archive.request.headers.get('If-Match')).toBe('"revision-3"');
    archive.flush(supplier);
    service
      .updateOrder('org', order, { name: 'Changed draft', supplierId: 'supplier', lines: [] })
      .subscribe();
    const change = http.expectOne(url + '/orders/order');
    expect(change.request.headers.get('If-Match')).toBe('"revision-7"');
    change.flush(order);
    service.placeOrder('org', order).subscribe();
    const place = http.expectOne(url + '/orders/order/order');
    expect(place.request.headers.get('If-Match')).toBe('"revision-7"');
    place.flush(order);
    service.cancelRemaining('org', order).subscribe();
    const cancel = http.expectOne(url + '/orders/order/cancel-remaining');
    expect(cancel.request.headers.get('If-Match')).toBe('"revision-7"');
    cancel.flush(order);
  });
  it('transmits physical declarations unchanged, retaining six decimals and operation UUIDs', () => {
    const input: ReceivePurchaseOrderInput = {
      lineId: 'line',
      warehouseId: 'warehouse',
      quantity: '0.250000',
      receivedAt: '2026-10-05T12:00:00+02:00',
      clientOperationId: '70ecb419-6dfb-4399-9d06-3d9e9540c053',
    };
    service.receiveOrder('org', order, input).subscribe();
    const receive = http.expectOne(url + '/orders/order/receipts');
    expect(receive.request.headers.get('If-Match')).toBe('"revision-7"');
    expect(receive.request.body).toEqual(input);
    expect(receive.request.withCredentials).toBe(true);
    receive.flush(receipt);
    const individualize = { clientOperationId: 'b6eb7cd7-22f4-4c60-8f2c-09f5a2aa5bc6' };
    service.individualizeReceipt('org', receipt, individualize).subscribe();
    const units = http.expectOne(url + '/receipts/receipt/individualize');
    expect(units.request.headers.get('If-Match')).toBe('"revision-2"');
    expect(units.request.body).toEqual(individualize);
    units.flush(receipt);
    const returnInput: ReturnProcurementReceiptInput = {
      quantity: '0.050000',
      reason: 'Damaged packaging',
      clientOperationId: 'd3b2f4b4-fb84-458b-8e65-e340d84ae97f',
    };
    service.returnReceipt('org', receipt, returnInput).subscribe();
    const physicalReturn = http.expectOne(url + '/receipts/receipt/returns');
    expect(physicalReturn.request.headers.get('If-Match')).toBe('"revision-2"');
    expect(physicalReturn.request.body).toEqual(returnInput);
    physicalReturn.flush(receipt);
  });
  it('propagates revision conflicts without replacing the original declaration', () => {
    let failure: unknown;
    service.cancelRemaining('org', order).subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });
    http
      .expectOne(url + '/orders/order/cancel-remaining')
      .flush(
        { title: 'Revision conflict', detail: 'Review the latest purchase.' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    expect(failure).toMatchObject({ status: 412, detail: 'Review the latest purchase.' });
  });
  it('reads the retained return history using source receipt and server pagination', () => {
    const next = vi.fn();
    service.listReturns('org', 'receipt', { page: 2, itemsPerPage: 30 }).subscribe(next);
    const list = http.expectOne((req) => req.url === url + '/receipts/receipt/returns');
    expect(list.request.method).toBe('GET');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('itemsPerPage')).toBe('30');
    list.flush({ member: [returned], totalItems: 31 });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ member: [returned], totalItems: 31 }),
    );
    service.readReturn('org', 'returned').subscribe();
    const detail = http.expectOne(url + '/returns/returned');
    expect(detail.request.method).toBe('GET');
    detail.flush(returned);
  });

  it('reconciles the original physical return with its displayed revision and a distinct attempt UUID', () => {
    const input = { clientOperationId: '722df8a7-b9a6-4e19-a10a-6c52f2e7a01d' };
    const confirmed = {
      ...returned,
      status: 'confirmed' as const,
      revision: 5,
      inventoryMovementId: 'returned-movement',
      reconciledAt: '2026-10-06T10:00:00Z',
    };
    const next = vi.fn();
    service.reconcileReturn('org', returned, input).subscribe(next);
    const request = http.expectOne(url + '/returns/returned/reconcile');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('If-Match')).toBe('"revision-4"');
    expect(request.request.body).toEqual(input);
    expect(request.request.withCredentials).toBe(true);
    request.flush(confirmed);
    expect(next).toHaveBeenCalledExactlyOnceWith(confirmed);
    expect(confirmed.clientOperationId).toBe(returned.clientOperationId);
    expect(confirmed.quantity).toBe(returned.quantity);
    expect(confirmed.reason).toBe(returned.reason);
  });
});
