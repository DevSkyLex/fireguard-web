import { TestBed } from '@angular/core/testing';
import type {
  DeclareInventoryConsumptionInput,
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { InventoryConsumptionForm } from '../inventory-consumption-form.component';

describe('InventoryConsumptionForm', () => {
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
  type Draft = Pick<DeclareInventoryConsumptionInput, 'partId' | 'warehouseId' | 'quantity'>;

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  async function setup() {
    TestBed.configureTestingModule({ imports: [InventoryConsumptionForm] });
    const fixture = TestBed.createComponent(InventoryConsumptionForm);
    fixture.componentRef.setInput('parts', [part]);
    fixture.componentRef.setInput('warehouses', [warehouse]);
    await fixture.whenStable();
    const form = fixture.componentInstance as unknown as {
      draft: { set: (draft: Draft) => void; (): Draft };
      submit: (event: Event) => void;
    };
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    return { fixture, form, emitted };
  }

  it('emits six-place exact decimals beyond floating-point safe integers', async () => {
    const { form, emitted, fixture } = await setup();
    form.draft.set({
      partId: part.id,
      warehouseId: warehouse.id,
      quantity: '999999999999999999.123456',
    });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledWith({
      partId: part.id,
      warehouseId: warehouse.id,
      quantity: '999999999999999999.123456',
    });
    expect(form.draft().quantity).toBe('999999999999999999.123456');
  });

  it.each(['0', '0.000000', '-1', '1e3', '1,5', '1000000000000000000', '1.1234567'])(
    'rejects invalid physical quantity %s',
    async (quantity) => {
      const { form, fixture, emitted } = await setup();
      form.draft.set({ partId: part.id, warehouseId: warehouse.id, quantity });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Enter a positive decimal');
    },
  );

  it('rejects archived references and keeps a failed draft until owner acceptance', async () => {
    const { form, fixture, emitted } = await setup();
    const draft = { partId: part.id, warehouseId: warehouse.id, quantity: '0.000001' };
    form.draft.set(draft);
    fixture.componentRef.setInput('parts', [{ ...part, archived: true }]);
    fixture.componentRef.setInput('error', 'Storage unavailable');
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(draft);
    fixture.componentRef.setInput('resetKey', 1);
    await fixture.whenStable();
    expect(form.draft()).toEqual({ partId: '', warehouseId: '', quantity: '' });
  });

  it('blocks pending and uncertain submissions without clearing entered values', async () => {
    const { form, fixture, emitted } = await setup();
    form.draft.set({ partId: part.id, warehouseId: warehouse.id, quantity: '1.5' });
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('locked', true);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft().quantity).toBe('1.5');
  });
});
