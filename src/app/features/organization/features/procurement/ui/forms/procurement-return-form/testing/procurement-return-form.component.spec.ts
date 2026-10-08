import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ProcurementReceiptOutput } from '@features/organization/features/procurement/models';
import type { ProcurementReturnDraft } from '../models/procurement-return-draft.interface';
import { ProcurementReturnForm } from '../procurement-return-form.component';

describe('ProcurementReturnForm', () => {
  const receipt: ProcurementReceiptOutput = {
    '@id': '/receipts/receipt',
    '@type': 'ProcurementReceipt',
    id: 'receipt',
    organizationId: 'org',
    orderId: 'order',
    lineId: 'line',
    kind: 'part',
    quantity: '0.300000',
    returnedQuantity: '0.100000',
    pendingReturnQuantity: '0.100000',
    warehouseId: 'warehouse',
    currency: 'EUR',
    receivedAt: '2026-10-05T10:00:00Z',
    createdAt: '2026-10-05T10:00:00Z',
    equipmentIds: [],
    status: 'stock_received',
    revision: 3,
    financialVisible: false,
    replayed: false,
  };
  const declaration: ProcurementReturnDraft = { quantity: '0.20', reason: '  Damaged packaging  ' };

  async function setup(source?: ProcurementReceiptOutput) {
    TestBed.configureTestingModule({ imports: [ProcurementReturnForm] });
    const fixture = TestBed.createComponent(ProcurementReturnForm);
    fixture.componentRef.setInput('receipt', source ?? receipt);
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    await fixture.whenStable();
    const form = fixture.componentInstance as unknown as {
      draft: WritableSignal<ProcurementReturnDraft>;
      submit: (event: Event) => void;
    };
    return { fixture, form, emitted };
  }

  it('emits one motivated exact return without counting pending reconciliation twice', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set(declaration);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledExactlyOnceWith({
      quantity: '0.200000',
      reason: 'Damaged packaging',
      clientOperationId: expect.any(String),
    });
    expect(emitted.mock.calls[0][0].clientOperationId).toMatch(
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
    );
  });

  it.each(['0', '0.200001', '0.1234567', '-0.1', '1e-1'])(
    'rejects return quantity %s outside its source receipt',
    async (quantity) => {
      const { fixture, form, emitted } = await setup();
      form.draft.set({ ...declaration, quantity });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
      expect(form.draft().quantity).toBe(quantity);
    },
  );

  it.each(['', '   ', 'a'.repeat(2001)])(
    'requires a reason of at most two thousand characters',
    async (reason) => {
      const { fixture, form, emitted } = await setup();
      form.draft.set({ ...declaration, reason });
      await fixture.whenStable();
      form.submit(new Event('submit'));
      expect(emitted).not.toHaveBeenCalled();
    },
  );

  it('rejects fractional equipment units while accepting a whole return', async () => {
    const { fixture, form, emitted } = await setup({
      ...receipt,
      kind: 'equipment_to_individualize',
      quantity: '5.000000',
      returnedQuantity: '1.000000',
      pendingReturnQuantity: '0.000000',
    });
    form.draft.set({ ...declaration, quantity: '1.5' });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    form.draft.set({ ...declaration, quantity: '4' });
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).toHaveBeenCalledWith({
      quantity: '4.000000',
      reason: 'Damaged packaging',
      clientOperationId: expect.any(String),
    });
  });

  it('preserves the reason across failures and receipt revisions and resets on a new source', async () => {
    const { fixture, form, emitted } = await setup();
    form.draft.set(declaration);
    fixture.componentRef.setInput('receipt', { ...receipt, revision: 4 });
    fixture.componentRef.setInput('error', 'Stock needs reconciliation.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    form.submit(new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(form.draft()).toEqual(declaration);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Stock needs reconciliation.',
    );
    fixture.componentRef.setInput('receipt', { ...receipt, id: 'another-receipt' });
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(form.draft()).toEqual({ quantity: '', reason: '' });
  });
});
