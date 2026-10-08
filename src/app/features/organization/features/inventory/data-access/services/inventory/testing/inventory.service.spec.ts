import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionOutput,
} from '@features/organization/features/inventory/models';
import { InventoryService } from '../inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let http: HttpTestingController;
  const base = 'https://api.test/api/organizations/org';
  const declaration: DeclareInventoryConsumptionInput = {
    clientOperationId: '77306066-a66e-44e4-909b-100ba3ec79d4',
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '999999999999999999.123456',
    interventionId: 'intervention',
    workItemId: 'work',
    equipmentId: 'equipment',
    occurredAt: '2026-10-06T10:00:00.123Z',
  };
  const receipt: InventoryConsumptionOutput = {
    '@id': base + '/inventory-consumptions/server-id',
    '@type': 'InventoryConsumption',
    id: 'server-id',
    partId: declaration.partId,
    warehouseId: declaration.warehouseId,
    quantity: declaration.quantity,
    interventionId: declaration.interventionId,
    actorId: 'actor',
    occurredAt: declaration.occurredAt,
    status: 'received_pending',
    reason: 'insufficient_stock',
    late: false,
    replayed: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InventoryService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches and paginates active part and warehouse directories on the server', () => {
    service
      .listParts('org', { page: 3, itemsPerPage: 50, search: 'seal', params: { archived: false } })
      .subscribe();
    const parts = http.expectOne((request) => request.url === base + '/inventory-parts');
    expect(parts.request.method).toBe('GET');
    expect(parts.request.params.get('page')).toBe('3');
    expect(parts.request.params.get('itemsPerPage')).toBe('50');
    expect(parts.request.params.get('search')).toBe('seal');
    expect(parts.request.params.get('archived')).toBe('false');
    expect(parts.request.withCredentials).toBe(true);
    parts.flush({ member: [], totalItems: 0 });
    service
      .listWarehouses('org', {
        page: 2,
        itemsPerPage: 50,
        search: 'van',
        params: { archived: true },
      })
      .subscribe();
    const warehouses = http.expectOne((request) => request.url === base + '/inventory-warehouses');
    expect(warehouses.request.params.get('search')).toBe('van');
    expect(warehouses.request.params.get('archived')).toBe('true');
    expect(warehouses.request.params.get('page')).toBe('2');
    warehouses.flush({ member: [], totalItems: 0 });
  });

  it('hydrates retained references using item GET without adding an active-only filter', () => {
    service.readPart('org', 'part/old').subscribe();
    const part = http.expectOne(base + '/inventory-parts/part%2Fold');
    expect(part.request.method).toBe('GET');
    expect(part.request.params.has('archived')).toBe(false);
    part.flush({ '@id': '/old', '@type': 'InventoryPart', archived: true });
    service.readWarehouse('org', 'warehouse/old').subscribe();
    const warehouse = http.expectOne(base + '/inventory-warehouses/warehouse%2Fold');
    expect(warehouse.request.method).toBe('GET');
    warehouse.flush({ '@id': '/old', '@type': 'InventoryWarehouse', archived: true });
    service.readConsumption('org', 'declaration/old').subscribe();
    const fact = http.expectOne(base + '/inventory-consumptions/declaration%2Fold');
    expect(fact.request.method).toBe('GET');
    fact.flush(receipt);
  });

  it('reads stock and history with exact business filters and without financial expansion', () => {
    service
      .listBalances('org', { params: { partId: 'part', warehouseId: 'warehouse' } })
      .subscribe();
    const balance = http.expectOne((request) => request.url === base + '/inventory-balances');
    expect(balance.request.params.get('partId')).toBe('part');
    expect(balance.request.params.get('warehouseId')).toBe('warehouse');
    expect(balance.request.params.has('valuation')).toBe(false);
    balance.flush({ member: [], totalItems: 0 });
    service
      .listMovements('org', { page: 2, params: { partId: 'part', interventionId: 'intervention' } })
      .subscribe();
    const movement = http.expectOne((request) => request.url === base + '/inventory-movements');
    expect(movement.request.params.get('interventionId')).toBe('intervention');
    expect(movement.request.params.get('page')).toBe('2');
    movement.flush({ member: [], totalItems: 0 });
    service
      .listConsumptions('org', {
        params: { interventionId: 'intervention', status: 'received_pending' },
      })
      .subscribe();
    const consumptions = http.expectOne(
      (request) => request.url === base + '/inventory-consumptions',
    );
    expect(consumptions.request.params.get('status')).toBe('received_pending');
    expect(consumptions.request.params.get('interventionId')).toBe('intervention');
    consumptions.flush({ member: [], totalItems: 0 });
  });

  it('preserves the complete exact declaration and immutable UUID across response-loss retry', () => {
    let failure: unknown;
    service.declareConsumption('org', declaration).subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });
    const lost = http.expectOne(base + '/inventory-consumptions');
    expect(lost.request.method).toBe('POST');
    expect(lost.request.body).toEqual(declaration);
    expect(lost.request.body.quantity).toBe('999999999999999999.123456');
    lost.error(new ProgressEvent('error'));
    expect(failure).toMatchObject({ status: 0 });
    let received: InventoryConsumptionOutput | undefined;
    service.declareConsumption('org', declaration).subscribe((value) => {
      received = value;
    });
    const retry = http.expectOne(base + '/inventory-consumptions');
    expect(retry.request.body).toEqual(lost.request.body);
    expect(retry.request.body.clientOperationId).toBe(declaration.clientOperationId);
    retry.flush({ ...receipt, replayed: true });
    expect(received?.id).toBe('server-id');
    expect(received?.status).toBe('received_pending');
    expect(received?.replayed).toBe(true);
  });

  it('reconciles a declaration with an empty POST body without rewriting its physical facts', () => {
    service.reconcileConsumption('org', 'receipt/id').subscribe();
    const request = http.expectOne(base + '/inventory-consumptions/receipt%2Fid/reconcile');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(receipt);
  });

  it('sends motivated returns and signed corrections as exact-string compensating commands', () => {
    const returned = {
      clientOperationId: 'return-id',
      consumptionId: 'server-id',
      quantity: '0.000001',
      reason: 'Unused seal',
    };
    service.returnConsumption('org', returned).subscribe();
    const returnRequest = http.expectOne(base + '/inventory-returns');
    expect(returnRequest.request.method).toBe('POST');
    expect(returnRequest.request.body).toEqual(returned);
    returnRequest.flush({ '@id': '/movement', '@type': 'InventoryMovement' });
    const corrected = {
      clientOperationId: 'correction-id',
      partId: 'part',
      warehouseId: 'warehouse',
      quantity: '-999999999999999999.000001',
      reason: 'Count correction',
      unitCost: '99999999999999.123456',
    };
    service.correctStock('org', corrected).subscribe();
    const correction = http.expectOne(base + '/inventory-corrections');
    expect(correction.request.body).toEqual(corrected);
    expect(correction.request.body.unitCost).toBe('99999999999999.123456');
    correction.flush({ '@id': '/movement', '@type': 'InventoryMovement' });
  });

  it('creates and updates references using merge patches without an invented revision precondition', () => {
    const part = { code: 'SEAL', label: 'Seal', unit: 'piece', kind: 'part' as const };
    service.createPart('org', part).subscribe();
    const createPart = http.expectOne(base + '/inventory-parts');
    expect(createPart.request.body).toEqual(part);
    createPart.flush({ '@id': '/part', '@type': 'InventoryPart' });
    service.createWarehouse('org', { code: 'VAN', name: 'Van' }).subscribe();
    const createWarehouse = http.expectOne(base + '/inventory-warehouses');
    expect(createWarehouse.request.method).toBe('POST');
    createWarehouse.flush({ '@id': '/warehouse', '@type': 'InventoryWarehouse' });
    service.updatePart('org', 'part/id', { label: 'Archived seal', archived: true }).subscribe();
    const updatePart = http.expectOne(base + '/inventory-parts/part%2Fid');
    expect(updatePart.request.method).toBe('PATCH');
    expect(updatePart.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(updatePart.request.headers.has('If-Match')).toBe(false);
    expect(updatePart.request.body).toEqual({ label: 'Archived seal', archived: true });
    updatePart.flush({ '@id': '/part', '@type': 'InventoryPart' });
    service
      .updateWarehouse('org', 'warehouse/id', { name: 'Restored van', archived: false })
      .subscribe();
    const updateWarehouse = http.expectOne(base + '/inventory-warehouses/warehouse%2Fid');
    expect(updateWarehouse.request.method).toBe('PATCH');
    expect(updateWarehouse.request.headers.has('If-Match')).toBe(false);
    expect(updateWarehouse.request.body).toEqual({ name: 'Restored van', archived: false });
    updateWarehouse.flush({ '@id': '/warehouse', '@type': 'InventoryWarehouse' });
  });

  it('propagates organization permission and immutable identity conflicts without changing the command', () => {
    let failure: unknown;
    service.declareConsumption('org', declaration).subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });
    const conflict = http.expectOne(base + '/inventory-consumptions');
    conflict.flush(
      {
        status: 409,
        type: 'identity-conflict',
        detail: 'Operation UUID belongs to another intention.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(failure).toMatchObject({
      status: 409,
      detail: 'Operation UUID belongs to another intention.',
    });
    expect(declaration.quantity).toBe('999999999999999999.123456');
    expect(declaration.clientOperationId).toBe('77306066-a66e-44e4-909b-100ba3ec79d4');
    service.listBalances('other-org').subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });
    const forbidden = http.expectOne(
      'https://api.test/api/organizations/other-org/inventory-balances',
    );
    forbidden.flush(
      { status: 403, type: 'forbidden', detail: 'Inventory read denied.' },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(failure).toMatchObject({ status: 403, detail: 'Inventory read denied.' });
  });
});
