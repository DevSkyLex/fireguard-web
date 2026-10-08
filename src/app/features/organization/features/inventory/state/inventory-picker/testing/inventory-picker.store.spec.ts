import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { InventoryPickerStore } from '../inventory-picker.store';

describe('InventoryPickerStore', () => {
  const part: InventoryPartOutput = {
    '@id': '/part',
    '@type': 'InventoryPart',
    id: 'part-id',
    code: 'SEAL',
    label: 'Seal',
    unit: 'piece',
    kind: 'part',
    archived: false,
  };
  const warehouse: InventoryWarehouseOutput = {
    '@id': '/warehouse',
    '@type': 'InventoryWarehouse',
    id: 'warehouse-id',
    code: 'VAN',
    name: 'Van',
    archived: false,
  };
  let service: {
    listParts: ReturnType<typeof vi.fn>;
    listWarehouses: ReturnType<typeof vi.fn>;
    readPart: ReturnType<typeof vi.fn>;
    readWarehouse: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      listParts: vi.fn().mockReturnValue(of({ member: [part], totalItems: 151 })),
      listWarehouses: vi.fn().mockReturnValue(of({ member: [warehouse], totalItems: 1 })),
      readPart: vi.fn().mockReturnValue(of(part)),
      readWarehouse: vi.fn().mockReturnValue(of(warehouse)),
    };
    TestBed.configureTestingModule({
      providers: [InventoryPickerStore, { provide: InventoryService, useValue: service }],
    });
  });

  it('searches active server references in pages of 50 with exact totals', () => {
    const store = TestBed.inject(InventoryPickerStore);
    store.load({ organizationId: 'org', kind: 'part', page: 3, search: 'seal' });
    expect(service.listParts).toHaveBeenCalledWith('org', {
      page: 3,
      itemsPerPage: 50,
      search: 'seal',
      params: { archived: false },
    });
    expect(store.pageCount()).toBe(4);
    expect(store.referenceEntities()).toEqual([part]);
    expect(store.listCallState().status).toBe('success');
  });

  it('hydrates archived selection independently of active search pages', () => {
    service.readPart.mockReturnValue(of({ ...part, archived: true }));
    const store = TestBed.inject(InventoryPickerStore);
    store.load({ organizationId: 'org', kind: 'part', page: 2 });
    store.read({ organizationId: 'org', kind: 'part', id: 'old-part' });
    expect(service.readPart).toHaveBeenCalledWith('org', 'old-part');
    expect(store.readCallState().data?.archived).toBe(true);
    expect(store.query()?.page).toBe(2);
  });

  it('cancels obsolete lists and selected hydration on scope reset', () => {
    const list = new Subject<HydraCollection<InventoryPartOutput>>();
    const selected = new Subject<InventoryPartOutput>();
    service.listParts.mockReturnValue(list);
    service.readPart.mockReturnValue(selected);
    const store = TestBed.inject(InventoryPickerStore);
    store.load({ organizationId: 'old', kind: 'part' });
    store.read({ organizationId: 'old', kind: 'part', id: part.id });
    store.load(null);
    store.load({ organizationId: 'new', kind: 'warehouse' });
    list.next({ '@context': '', '@id': '', '@type': 'Collection', member: [part], totalItems: 1 });
    selected.next(part);
    expect(list.observed).toBe(false);
    expect(selected.observed).toBe(false);
    expect(store.referenceEntities()).toEqual([warehouse]);
    expect(store.readCallState().status).toBe('idle');
  });

  it('clears obsolete candidates while a new search is pending', () => {
    const store = TestBed.inject(InventoryPickerStore);
    store.load({ organizationId: 'org', kind: 'part' });
    service.listParts.mockReturnValue(new Subject());
    store.load({ organizationId: 'org', kind: 'part', search: 'new' });
    expect(store.referenceEntities()).toEqual([]);
    expect(store.listCallState().status).toBe('pending');
  });

  it('normalizes a selected-read failure without destroying the list', () => {
    service.readWarehouse.mockReturnValue(throwError(() => new Error('Reference unavailable')));
    const store = TestBed.inject(InventoryPickerStore);
    store.load({ organizationId: 'org', kind: 'warehouse' });
    store.read({ organizationId: 'org', kind: 'warehouse', id: 'missing' });
    expect(store.readCallState().status).toBe('error');
    expect(store.readCallState().error?.message).toBe('Reference unavailable');
    expect(store.referenceEntities()).toEqual([warehouse]);
  });
});
