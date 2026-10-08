import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InventoryPartOutput } from '@features/organization/features/inventory/models';
import {
  InventoryReferenceForm,
  type InventoryReferenceSubmission,
} from '../inventory-reference-form.component';

describe('InventoryReferenceForm', () => {
  const part: InventoryPartOutput = {
    '@id': '/part',
    '@type': 'InventoryPart',
    id: 'part',
    code: 'SEAL',
    label: 'Seal',
    unit: 'piece',
    kind: 'part',
    archived: false,
  };
  let fixture: ComponentFixture<InventoryReferenceForm>;
  let writes: InventoryReferenceSubmission[];

  function input(id: string): HTMLInputElement {
    const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#inventory-reference-' + id,
    );
    if (!field) throw new Error('Missing reference field ' + id);
    return field;
  }
  async function fill(id: string, value: string): Promise<void> {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }
  async function submit(): Promise<void> {
    const element = (fixture.nativeElement as HTMLElement).querySelector('form');
    if (!element) throw new Error('Missing reference form');
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [InventoryReferenceForm] });
    fixture = TestBed.createComponent(InventoryReferenceForm);
    fixture.componentRef.setInput('kind', 'part');
    writes = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await fixture.whenStable();
  });

  it('creates trimmed reference identity and selected consumable category', async () => {
    await fill('code', '  SEAL  ');
    await fill('name', '  Seal  ');
    await fill('unit', '  piece  ');
    fixture.componentInstance['categoryChanged']('consumable');
    await submit();
    expect(writes).toEqual([{ code: 'SEAL', label: 'Seal', unit: 'piece', kind: 'consumable' }]);
  });

  it('creates warehouses without part-specific fields', async () => {
    fixture.componentRef.setInput('kind', 'warehouse');
    await fixture.whenStable();
    await fill('code', '  VAN  ');
    await fill('name', '  Technician van  ');
    await submit();
    expect(writes).toEqual([{ code: 'VAN', name: 'Technician van' }]);
    expect((fixture.nativeElement as HTMLElement).querySelector('#inventory-reference-unit')).toBe(
      null,
    );
  });

  it.each(['code', 'name', 'unit'])(
    'rejects blank required %s without losing entered fields',
    async (field) => {
      await fill('code', 'SEAL');
      await fill('name', 'Seal');
      await fill('unit', 'piece');
      await fill(field, '   ');
      await submit();
      expect(writes).toEqual([]);
      expect(input(field).value).toBe('   ');
    },
  );

  it('locks permanent code/category and emits original identity even after attempted local replacement', async () => {
    fixture.componentRef.setInput('entry', part);
    await fixture.whenStable();
    expect(input('code').disabled).toBe(true);
    fixture.componentInstance['categoryChanged']('consumable');
    fixture.componentInstance['draft'].set({
      code: 'CHANGED',
      label: 'Updated seal',
      unit: 'pack',
      kind: 'consumable',
    });
    await submit();
    expect(writes).toEqual([{ code: 'SEAL', label: 'Updated seal', unit: 'pack', kind: 'part' }]);
  });

  it('preserves a failed edit through a same-identity server refresh', async () => {
    fixture.componentRef.setInput('entry', part);
    await fixture.whenStable();
    await fill('name', 'Entered draft');
    fixture.componentRef.setInput('error', 'Reference unavailable');
    fixture.componentRef.setInput('entry', { ...part, label: 'Remote label' });
    await fixture.whenStable();
    expect(input('name').value).toBe('Entered draft');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reference unavailable');
    await submit();
    expect(writes).toEqual([{ code: 'SEAL', label: 'Entered draft', unit: 'piece', kind: 'part' }]);
  });

  it('seeds only a new record identity and keeps actual dirty state available to the host', async () => {
    const dirty = vi.fn();
    fixture.componentInstance.dirtyChanged.subscribe(dirty);
    await fill('name', 'Draft');
    expect(dirty).toHaveBeenLastCalledWith(true);
    fixture.componentRef.setInput('entry', {
      ...part,
      id: 'other',
      code: 'OTHER',
      label: 'Other seal',
    });
    await fixture.whenStable();
    expect(input('name').value).toBe('Other seal');
    expect(input('code').value).toBe('OTHER');
    expect(dirty).toHaveBeenLastCalledWith(false);
  });

  it('blocks pending and unauthorized writes while keeping an offline draft cancellable', async () => {
    await fill('code', 'SEAL');
    await fill('name', 'Seal');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(writes).toEqual([]);
    expect(input('name').disabled).toBe(true);
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('available', false);
    await fixture.whenStable();
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    const cancel = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[variant="outline"]',
    );
    if (!cancel) throw new Error('Missing cancel button');
    expect(cancel.disabled).toBe(false);
    cancel.click();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(input('name').value).toBe('Seal');
  });
});
