import { PLATFORM_ID, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateTime, Settings } from 'luxon';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type { PurchaseOrderLineOutput } from '@features/organization/features/procurement/models';
import type { ProcurementReceiptDraft } from '../models/procurement-receipt-draft.interface';
import { ProcurementReceiptForm } from '../procurement-receipt-form.component';

describe('ProcurementReceiptForm', () => {
  const organizationId = 'org';
  const line: PurchaseOrderLineOutput = {
    id: 'line',
    kind: 'part',
    partId: 'part',
    identityTemplate: {},
    quantity: '0.500000',
    receivedQuantity: '0.200000',
    returnedQuantity: '0.000000',
    remainingQuantity: '0.300000',
  };
  const zone = Settings.defaultZone;
  const now = Settings.now;
  const declaration: ProcurementReceiptDraft = {
    quantity: '0.25',
    warehouseId: 'warehouse',
    localTime: '2026-10-05T12:00',
    offsetChoice: '',
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => {
    Settings.defaultZone = 'Europe/Paris';
    Settings.now = () => Date.UTC(2026, 9, 6, 12);
  });
  afterEach(() => {
    Settings.defaultZone = zone;
    Settings.now = now;
  });

  async function setup(source: PurchaseOrderLineOutput = line) {
    TestBed.configureTestingModule({
      imports: [ProcurementReceiptForm],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: InventoryService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(ProcurementReceiptForm);
    fixture.componentRef.setInput('organizationId', organizationId);
    fixture.componentRef.setInput('line', source);
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    await fixture.whenStable();
    const form = fixture.componentInstance as unknown as {
      draft: WritableSignal<ProcurementReceiptDraft>;
      submit: (event: Event) => void;
    };
    return { fixture, form, emitted };
  }

  it('emits a partial decimal receipt for the selected warehouse and an explicit-offset instant', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set(declaration);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      lineId: 'line',
      warehouseId: 'warehouse',
      quantity: '0.250000',
      receivedAt: '2026-10-05T10:00:00Z',
      clientOperationId: expect.any(String),
    });
    const result = emitted.mock.calls[0][0];
    expect(result.clientOperationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(DateTime.fromISO(result.receivedAt).toMillis()).toBe(
      DateTime.fromISO('2026-10-05T12:00:00+02:00').toMillis(),
    );
  });

  it.each(['0', '0.300001', '0.1234567', '1e-1'])(
    'rejects a receipt quantity outside the exact source limit: %s',
    async (quantity) => {
      const { fixture, form, emitted } = await setup();
      form.draft.set({ ...declaration, quantity });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
    },
  );

  it('requires a receiving warehouse for a stock article', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set({ ...declaration, warehouseId: '' });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choose the receiving warehouse.');
  });

  it.each(['101', '1.5'])(
    'rejects equipment receipt quantity %s while preserving physical input',
    async (quantity) => {
      const { fixture, form, emitted } = await setup({
        ...line,
        kind: 'equipment_to_individualize',
        partId: null,
        typeCode: 'EXTINGUISHER',
        quantity: '200.000000',
        remainingQuantity: '200.000000',
      });
      form.draft.set({ ...declaration, quantity, warehouseId: '' });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
      expect(form.draft().quantity).toBe(quantity);
    },
  );

  it('accepts at most one hundred individual units and omits warehouse stock fields', async () => {
    const { fixture, form, emitted } = await setup({
      ...line,
      kind: 'equipment_to_individualize',
      partId: null,
      typeCode: 'EXTINGUISHER',
      quantity: '200.000000',
      remainingQuantity: '200.000000',
    });
    form.draft.set({ ...declaration, quantity: '100', warehouseId: 'stale-stock-selection' });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted.mock.calls[0][0]).toEqual({
      lineId: 'line',
      quantity: '100.000000',
      receivedAt: '2026-10-05T10:00:00Z',
      clientOperationId: expect.any(String),
    });
    expect(fixture.nativeElement.querySelector('app-inventory-warehouse-picker')).toBeNull();
  });

  it.each(['invalid', '', '2026-10-07T12:00'])(
    'rejects an invalid or future physical time %s',
    async (localTime) => {
      const { fixture, form, emitted } = await setup();
      form.draft.set({ ...declaration, localTime });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
    },
  );

  it('rejects a nonexistent device-local hour without normalizing or discarding the physical draft', async () => {
    const { fixture, form, emitted } = await setup();
    const gap = { ...declaration, localTime: '2026-03-29T02:30' };
    form.draft.set(gap);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(gap);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('hlm-field-error')).not.toBeNull();
  });

  it('requires an explicit UTC offset for a repeated device-local hour', async () => {
    const { fixture, form, emitted } = await setup();
    const fold = { ...declaration, localTime: '2025-10-26T02:30' };
    form.draft.set(fold);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(fold);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('UTC offset');
  });

  it.each([
    { offsetChoice: '+02:00', receivedAt: '2025-10-26T00:30:00Z' },
    { offsetChoice: '+01:00', receivedAt: '2025-10-26T01:30:00Z' },
  ])(
    'records the explicitly chosen $offsetChoice physical instant during a repeated hour',
    async ({ offsetChoice, receivedAt }) => {
      const { fixture, form, emitted } = await setup();
      form.draft.set({ ...declaration, localTime: '2025-10-26T02:30' });
      await fixture.whenStable();
      form.draft.update((draft) => ({ ...draft, offsetChoice }));
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).toHaveBeenCalledExactlyOnceWith({
        lineId: 'line',
        warehouseId: 'warehouse',
        quantity: '0.250000',
        receivedAt,
        clientOperationId: expect.any(String),
      });
    },
  );

  it('requires a new repeated-hour decision whenever the device-local date changes', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set({ ...declaration, localTime: '2025-10-26T02:30' });
    await fixture.whenStable();
    form.draft.update((draft) => ({ ...draft, offsetChoice: '+02:00' }));
    await fixture.whenStable();
    form.draft.update((draft) => ({ ...draft, localTime: '2025-10-26T02:45' }));
    await fixture.whenStable();
    expect(form.draft().offsetChoice).toBe('');
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft().localTime).toBe('2025-10-26T02:45');
  });

  it('retains the physical draft through source revision, failure and pending transitions', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set(declaration);
    fixture.componentRef.setInput('line', { ...line, remainingQuantity: '0.280000' });
    fixture.componentRef.setInput('error', 'Review the remaining delivery.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(declaration);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Review the remaining delivery.',
    );
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('line', { ...line, id: 'another-line' });
    await fixture.whenStable();
    expect(form.draft()).toEqual({
      quantity: '',
      warehouseId: '',
      localTime: '2026-10-06T14:00',
      offsetChoice: '',
    });
  });
});
