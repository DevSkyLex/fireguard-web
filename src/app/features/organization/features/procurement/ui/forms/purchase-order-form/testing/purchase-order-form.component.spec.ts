import { PLATFORM_ID, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldTree } from '@angular/forms/signals';
import type { EquipmentTypeOption } from '@features/organization/features/equipments';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type {
  PurchaseOrderLineOutput,
  PurchaseOrderOutput,
  SupplierOutput,
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
      addLine: () => void;
      removeLine: (index: number) => void;
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
    expect(source.lines[0].identityTemplate).toEqual({
      name: 'Extinguisher',
      serialNumber: 'S-101',
      properties: { capacity: '6' },
    });
  });

  it('disables the native fields during a write and re-enables the unchanged draft after rejection', async () => {
    const { fixture, form, emitted } = await setup();
    const draft: PurchaseOrderDraft = {
      name: 'Parts',
      supplierId: 'supplier',
      lines: [draftLine],
    };
    form.draft.set(draft);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(form.orderForm().disabled()).toBe(true);
    expect(form.orderForm.name().disabled()).toBe(true);
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(draft);
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('error', 'Review the latest purchase revision.');
    await fixture.whenStable();
    expect(form.orderForm().disabled()).toBe(false);
    expect(form.orderForm.name().disabled()).toBe(false);
    expect(form.draft()).toEqual(draft);
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      name: 'Parts',
      supplierId: 'supplier',
      lines: [{ id: 'line', kind: 'part', partId: 'part', quantity: '0.250000' }],
    });
  });

  it('creates stable local line UUIDs, reports dirtiness and submits only the retained line', async () => {
    const { fixture, form, emitted } = await setup();
    const originalId = form.draft().lines[0].id;
    const dirty = vi.fn();
    fixture.componentInstance.dirtyChanged.subscribe(dirty);
    form.addLine();
    const nextId = form.draft().lines[1].id;
    expect(nextId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(nextId).not.toBe(originalId);
    form.removeLine(0);
    form.draft.update((draft) => ({
      ...draft,
      name: 'Parts',
      supplierId: 'supplier',
      lines: [{ ...draftLine, id: nextId }],
    }));
    await fixture.whenStable();
    expect(dirty).toHaveBeenLastCalledWith(true);
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      name: 'Parts',
      supplierId: 'supplier',
      lines: [{ id: nextId, kind: 'part', partId: 'part', quantity: '0.250000' }],
    });
    emitted.mockClear();
    form.removeLine(0);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(
      form.orderForm
        .lines()
        .errors()
        .map(({ kind, message }) => ({ kind, message })),
    ).toEqual([{ kind: 'lines', message: 'Add between 1 and 100 lines.' }]);
  });

  it('bounds added purchase lines and locks local line editing while a write is pending', async () => {
    const { fixture, form } = await setup();
    const lines = Array.from({ length: 100 }, (_, index) => ({
      ...draftLine,
      id: `line-${index}`,
    }));
    form.draft.set({ name: 'Parts', supplierId: 'supplier', lines });
    form.addLine();
    expect(form.draft().lines).toEqual(lines);
    form.draft.set({ name: 'Parts', supplierId: 'supplier', lines: [draftLine] });
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    form.addLine();
    form.removeLine(0);
    expect(form.draft().lines).toEqual([draftLine]);
  });

  it('retains archived supplier labels independently from currently assignable supplier pages', async () => {
    const { fixture } = await setup(order);
    const archived: SupplierOutput = {
      '@id': '/suppliers/supplier',
      '@type': 'Supplier',
      id: 'supplier',
      organizationId: 'org',
      name: 'Fire supplies',
      code: 'SUP-1',
      contacts: [],
      revision: 3,
      archivedAt: '2026-10-06T10:00:00Z',
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
      replayed: false,
    };
    const active = {
      ...archived,
      id: 'active',
      code: null,
      name: 'Active supplier',
      archivedAt: null,
    };
    fixture.componentRef.setInput('selectedSupplier', archived);
    fixture.componentRef.setInput('suppliers', [active, archived]);
    await fixture.whenStable();
    expect(fixture.componentInstance['activeSuppliers']()).toEqual([active]);
    expect(fixture.componentInstance['supplierLabelOf']('supplier')).toBe('SUP-1 — Fire supplies');
    expect(fixture.componentInstance['supplierLabelOf']('active')).toBe('Active supplier');
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '#procurement-order-supplier',
    );
    expect(input.value).toBe('SUP-1 — Fire supplies');
    fixture.componentRef.setInput('selectedSupplier', null);
    fixture.componentRef.setInput('suppliers', []);
    await fixture.whenStable();
    expect(input.value).toBe('SUP-1 — Fire supplies');
    expect(fixture.componentInstance['supplierLabelOf']('unavailable')).toBe('unavailable');
  });

  it('requests equipment catalogue options only for equipment lines and retains a historical selected type', async () => {
    const { fixture, form } = await setup(order);
    const requested = vi.fn();
    fixture.componentInstance.equipmentTypesRequested.subscribe(requested);
    const base = {
      '@id': '/equipment-types/type',
      '@type': 'EquipmentType',
      family: 'fire' as const,
      revision: 2,
      icon: 'lucideFireExtinguisher',
    };
    const options = [
      { ...base, value: 'ACTIVE', label: 'Active extinguisher', archived: false },
      { ...base, value: 'OLD', label: 'Archived extinguisher', archived: true },
      { ...base, value: 'OTHER_OLD', label: 'Other archived type', archived: true },
    ] satisfies readonly EquipmentTypeOption[];
    fixture.componentRef.setInput('typeOptions', options);
    await fixture.whenStable();
    expect(requested).not.toHaveBeenCalled();
    form.draft.update((draft) => ({
      ...draft,
      lines: [{ ...draft.lines[0], kind: 'equipment_to_individualize', typeCode: 'OLD' }],
    }));
    await fixture.whenStable();
    expect(requested).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['selectableTypes']('OLD')).toEqual(options.slice(0, 2));
    expect(fixture.componentInstance['typeLabelOf']('OLD')).toBe('Archived extinguisher');
    expect(fixture.componentInstance['typeLabelOf']('UNKNOWN')).toBe('UNKNOWN');
    expect(fixture.componentInstance['selectableTypes']('UNKNOWN')).toEqual([options[0]]);
  });
});
