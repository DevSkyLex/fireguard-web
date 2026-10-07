import { PLATFORM_ID, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldTree } from '@angular/forms/signals';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type {
  PurchaseOrderLineOutput,
  PurchaseOrderOutput,
} from '@features/organization/features/procurement/models';
import type {
  PurchaseOrderDraft,
  PurchaseOrderLineDraft,
} from '../models/purchase-order-draft.interface';
import { PurchaseOrderForm } from '../purchase-order-form.component';

describe('PurchaseOrderForm', () => {
  const organizationId = 'org';
  const sourceLine: PurchaseOrderLineOutput = {
    id: 'line',
    kind: 'part',
    partId: 'part',
    quantity: '2.000000',
    unitCost: '12.500000',
    receivedQuantity: '0.000000',
    returnedQuantity: '0.000000',
    remainingQuantity: '2.000000',
    identityTemplate: {},
  };
  const order: PurchaseOrderOutput = {
    '@id': '/orders/order',
    '@type': 'PurchaseOrder',
    id: 'order',
    organizationId: 'org',
    supplierId: 'supplier',
    name: 'Fire supplies',
    currency: 'EUR',
    status: 'draft',
    lines: [sourceLine],
    financialVisible: true,
    revision: 2,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    replayed: false,
  };
  const draftLine: PurchaseOrderLineDraft = {
    id: 'line',
    kind: 'part',
    partId: 'part',
    typeCode: '',
    quantity: '0.25',
    unitCost: '',
    name: '',
    brand: '',
    model: '',
    identityTemplate: {},
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  async function setup(existing: PurchaseOrderOutput | null = null, canEditCosts = false) {
    TestBed.configureTestingModule({
      imports: [PurchaseOrderForm],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: InventoryService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(PurchaseOrderForm);
    fixture.componentRef.setInput('organizationId', organizationId);
    fixture.componentRef.setInput('order', existing);
    fixture.componentRef.setInput('canEditCosts', canEditCosts);
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    await fixture.whenStable();
    const form = fixture.componentInstance as unknown as {
      draft: WritableSignal<PurchaseOrderDraft>;
      orderForm: FieldTree<PurchaseOrderDraft>;
      submit: (event: Event) => void;
    };
    return { fixture, form, emitted };
  }

  it('emits six-place quantity strings and retains the stable draft line identity', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set({ name: '  Parts  ', supplierId: 'supplier', lines: [draftLine] });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      name: 'Parts',
      supplierId: 'supplier',
      lines: [{ id: 'line', kind: 'part', partId: 'part', quantity: '0.250000' }],
    });
  });

  it.each(['0', '-1', '1e3', '1,25', '0.0000001', '100000.000001'])(
    'rejects invalid order quantity %s without losing the input',
    async (quantity) => {
      const { fixture, form, emitted } = await setup();
      form.draft.set({
        name: 'Parts',
        supplierId: 'supplier',
        lines: [{ ...draftLine, quantity }],
      });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
      expect(form.draft().lines[0].quantity).toBe(quantity);
    },
  );

  it('requires only the reference for the chosen kind and whole units for equipment', async () => {
    const { fixture, form, emitted } = await setup();
    const equipment = {
      ...draftLine,
      kind: 'equipment_to_individualize' as const,
      partId: '',
      typeCode: '',
      quantity: '2',
    };
    form.draft.set({ name: 'Reserve', supplierId: 'supplier', lines: [equipment] });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    form.draft.set({
      name: 'Reserve',
      supplierId: 'supplier',
      lines: [{ ...equipment, typeCode: 'EXTINGUISHER', quantity: '2.5' }],
    });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    form.draft.update((draft) => ({
      ...draft,
      lines: [{ ...draft.lines[0], quantity: '2' }],
    }));
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledWith({
      name: 'Reserve',
      supplierId: 'supplier',
      lines: [
        {
          id: 'line',
          kind: 'equipment_to_individualize',
          typeCode: 'EXTINGUISHER',
          quantity: '2.000000',
          identityTemplate: { name: null, brand: null, model: null },
        },
      ],
    });
  });

  it('omits hidden financial fields even if the retained projection contains a cost', async () => {
    const { fixture, form, emitted } = await setup(order, false);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted.mock.calls[0][0].lines[0]).toEqual({
      id: 'line',
      kind: 'part',
      partId: 'part',
      quantity: '2.000000',
    });
    expect(fixture.nativeElement.querySelector('#procurement-line-cost-0')).toBeNull();
  });

  it('omits an unchanged cost while preserving an explicit authorized clear', async () => {
    const { fixture, form, emitted } = await setup(order, true);
    form.submit(new Event('submit'));
    expect(emitted.mock.calls[0][0].lines[0]).not.toHaveProperty('unitCost');
    const cost: HTMLInputElement = fixture.nativeElement.querySelector('#procurement-line-cost-0');
    cost.value = '';
    cost.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted.mock.calls[1][0].lines[0]).toMatchObject({ unitCost: null });
  });

  it('emits an authorized edited cost exactly without floating-point rounding', async () => {
    const { fixture, form, emitted } = await setup(order, true);
    const cost: HTMLInputElement = fixture.nativeElement.querySelector('#procurement-line-cost-0');
    cost.value = '999999999999.123456';
    cost.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted.mock.calls[0][0].lines[0]).toMatchObject({
      unitCost: '999999999999.123456',
    });
  });

  it('retains unknown declarative identity fields and failed edits across a revision refresh', async () => {
    const source: PurchaseOrderOutput = {
      ...order,
      lines: [
        {
          ...sourceLine,
          kind: 'equipment_to_individualize',
          partId: null,
          typeCode: 'EXTINGUISHER',
          identityTemplate: {
            name: 'Extinguisher',
            serialNumber: 'S-101',
            properties: { capacity: '6' },
          },
        },
      ],
    };
    const { fixture, form, emitted } = await setup(source);
    form.draft.update((draft) => ({
      ...draft,
      name: 'Edited draft',
      lines: [{ ...draft.lines[0], brand: '  Manufacturer  ' }],
    }));
    fixture.componentRef.setInput('error', 'Review the latest purchase revision.');
    fixture.componentRef.setInput('order', { ...source, revision: 3, name: 'Server name' });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted.mock.calls[0][0]).toMatchObject({
      name: 'Edited draft',
      lines: [
        {
          identityTemplate: {
            name: 'Extinguisher',
            brand: 'Manufacturer',
            model: null,
            serialNumber: 'S-101',
            properties: { capacity: '6' },
          },
        },
      ],
    });
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Review the latest purchase revision.',
    );
  });
});
