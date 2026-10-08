import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import { InventoryWarehousePicker } from '../inventory-warehouse-picker.component';

describe('InventoryWarehousePicker', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  const active = {
    '@id': '/warehouse',
    '@type': 'InventoryWarehouse',
    id: 'warehouse-id',
    code: 'VAN',
    name: 'Van',
    archived: false,
  };
  const archived = { ...active, id: 'historic-id', archived: true };

  it('performs no authenticated secondary reads during SSR', async () => {
    const service = {
      listParts: vi.fn(),
      listWarehouses: vi.fn(),
      readPart: vi.fn(),
      readWarehouse: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [InventoryWarehousePicker],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: InventoryService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(InventoryWarehousePicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', archived.id);
    await fixture.whenStable();
    expect(service.listWarehouses).not.toHaveBeenCalled();
    expect(service.readWarehouse).not.toHaveBeenCalled();
  });

  it('retains selected archived UUID while searching active pages and refuses unreturned assignments', async () => {
    const service = {
      listWarehouses: vi.fn().mockReturnValue(of({ member: [active, archived], totalItems: 1 })),
      readWarehouse: vi.fn().mockReturnValue(of(archived)),
    };
    TestBed.configureTestingModule({
      imports: [InventoryWarehousePicker],
      providers: [{ provide: InventoryService, useValue: service }],
    });
    const fixture = TestBed.createComponent(InventoryWarehousePicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', archived.id);
    await fixture.whenStable();
    const picker = fixture.componentInstance as unknown as {
      selectedLabel: () => string;
      pick: (value: unknown) => void;
      search: (search: string) => void;
      page: (page: number) => void;
    };
    expect(picker.selectedLabel()).toBe('Van (archived)');
    picker.pick('unknown-id');
    expect(fixture.componentInstance.value()).toBe(archived.id);
    picker.pick(active.id);
    expect(fixture.componentInstance.value()).toBe(active.id);
    picker.search('searched');
    picker.page(2);
    expect(service.listWarehouses).toHaveBeenLastCalledWith('org', {
      page: 2,
      itemsPerPage: 50,
      search: 'searched',
      params: { archived: false },
    });
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    picker.pick('');
    expect(fixture.componentInstance.value()).toBe(active.id);
  });
});
