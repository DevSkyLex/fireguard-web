import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import { InventoryPartPicker } from '../inventory-part-picker.component';

describe('InventoryPartPicker', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  const active = {
    '@id': '/part',
    '@type': 'InventoryPart',
    id: 'part-id',
    code: 'SEAL',
    label: 'Seal',
    unit: 'piece',
    kind: 'part',
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
      imports: [InventoryPartPicker],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: InventoryService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(InventoryPartPicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', archived.id);
    await fixture.whenStable();
    expect(service.listParts).not.toHaveBeenCalled();
    expect(service.readPart).not.toHaveBeenCalled();
  });

  it('retains selected archived UUID while searching active pages and refuses unreturned assignments', async () => {
    const service = {
      listParts: vi.fn().mockReturnValue(of({ member: [active, archived], totalItems: 1 })),
      readPart: vi.fn().mockReturnValue(of(archived)),
    };
    TestBed.configureTestingModule({
      imports: [InventoryPartPicker],
      providers: [{ provide: InventoryService, useValue: service }],
    });
    const fixture = TestBed.createComponent(InventoryPartPicker);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('value', archived.id);
    await fixture.whenStable();
    const picker = fixture.componentInstance as unknown as {
      selectedLabel: () => string;
      pick: (value: unknown) => void;
      search: (search: string) => void;
      page: (page: number) => void;
    };
    expect(picker.selectedLabel()).toBe('Seal (archived)');
    picker.pick('unknown-id');
    expect(fixture.componentInstance.value()).toBe(archived.id);
    picker.pick(active.id);
    expect(fixture.componentInstance.value()).toBe(active.id);
    picker.search('searched');
    picker.page(2);
    expect(service.listParts).toHaveBeenLastCalledWith('org', {
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
