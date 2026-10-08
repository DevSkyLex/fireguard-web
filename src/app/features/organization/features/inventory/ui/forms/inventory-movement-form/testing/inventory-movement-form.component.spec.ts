import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import {
  InventoryMovementForm,
  type InventoryMovementDraft,
} from '../inventory-movement-form.component';

describe('InventoryMovementForm', () => {
  let fixture: ComponentFixture<InventoryMovementForm>;
  let writes: InventoryMovementDraft[];
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  async function setup(mode: 'correction' | 'return'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [InventoryMovementForm],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            listParts: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            listWarehouses: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            readPart: vi.fn().mockReturnValue(of({ id: 'part', label: 'Seal', archived: false })),
            readWarehouse: vi
              .fn()
              .mockReturnValue(of({ id: 'warehouse', name: 'Van', archived: false })),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(InventoryMovementForm);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('mode', mode);
    writes = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await fixture.whenStable();
  }
  async function submit(draft: InventoryMovementDraft): Promise<void> {
    fixture.componentInstance['draft'].set(draft);
    await fixture.whenStable();
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    if (!form) throw new Error('Missing movement form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }
  const draft: InventoryMovementDraft = {
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '1',
    reason: 'Count correction',
  };

  it.each(['999999999999999999.123456', '-999999999999999999.123456'])(
    'preserves exact signed correction %s',
    async (quantity) => {
      await setup('correction');
      await submit({ ...draft, quantity, reason: '  Physical count  ' });
      expect(writes).toEqual([{ ...draft, quantity, reason: 'Physical count' }]);
    },
  );

  it('pads correction decimal places without floating-point arithmetic', async () => {
    await setup('correction');
    await submit({ ...draft, quantity: '-0.000001' });
    expect(writes[0]?.quantity).toBe('-0.000001');
    await submit({ ...draft, quantity: '1.5' });
    expect(writes[1]?.quantity).toBe('1.500000');
  });

  it.each(['0', '-0.000000', '1.1234567', '1000000000000000000', '1e3', '1,5'])(
    'rejects invalid correction quantity %s without losing the draft',
    async (quantity) => {
      await setup('correction');
      await submit({ ...draft, quantity });
      expect(writes).toEqual([]);
      expect(fixture.componentInstance['draft']().quantity).toBe(quantity);
    },
  );

  it('requires active reference UUIDs for corrections but not for a return linked by its owner', async () => {
    await setup('correction');
    await submit({ ...draft, partId: '', warehouseId: '' });
    expect(writes).toEqual([]);
    fixture.componentRef.setInput('mode', 'return');
    await fixture.whenStable();
    await submit({ ...draft, partId: '', warehouseId: '', quantity: '0.5' });
    expect(writes).toEqual([{ ...draft, partId: '', warehouseId: '', quantity: '0.500000' }]);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-inventory-part-picker')).toBe(
      null,
    );
  });

  it('rejects negative return quantity and requires a nonblank bounded motivation', async () => {
    await setup('return');
    await submit({ ...draft, quantity: '-1' });
    await submit({ ...draft, reason: '   ' });
    await submit({ ...draft, reason: 'x'.repeat(2001) });
    expect(writes).toEqual([]);
    await submit({ ...draft, reason: 'x'.repeat(2000) });
    expect(writes).toHaveLength(1);
  });

  it('keeps entered physical facts on failure and disables pending or unavailable submissions', async () => {
    await setup('return');
    fixture.componentRef.setInput('error', 'Network response lost');
    fixture.componentRef.setInput('pending', true);
    await submit(draft);
    expect(writes).toEqual([]);
    expect(fixture.componentInstance['draft']()).toEqual(draft);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Network response lost');
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('available', false);
    await fixture.whenStable();
    await submit(draft);
    expect(writes).toEqual([]);
  });
});
