import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  CreateEquipmentTypeInput,
  EquipmentTypeOutput,
} from '@features/organization/features/equipments/models';
import { EquipmentTypeForm } from '../equipment-type-form.component';

describe('EquipmentTypeForm', () => {
  let fixture: ComponentFixture<EquipmentTypeForm>;
  let writes: CreateEquipmentTypeInput[];
  const entry: EquipmentTypeOutput = {
    '@id': '/api/organizations/org/types/blanket',
    '@type': 'EquipmentType',
    value: 'blanket',
    label: 'Blanket',
    family: 'fire',
    archived: false,
    revision: 2,
  };

  const field = (id: string): HTMLInputElement => {
    const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `#equipment-type-${id}`,
    );
    if (!element) throw new Error(`Missing input ${id}`);
    return element;
  };
  const fill = async (id: string, value: string): Promise<void> => {
    const input = field(id);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    const element = (fixture.nativeElement as HTMLElement).querySelector('form');
    if (!element) throw new Error('Missing type form');
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EquipmentTypeForm] }).compileComponents();
    fixture = TestBed.createComponent(EquipmentTypeForm);
    writes = [];
    fixture.componentInstance.submitted.subscribe((input) => writes.push(input));
    await fixture.whenStable();
  });

  it('emits a valid custom code, trimmed name and selected family', async () => {
    await fill('code', 'gas_sensor');
    await fill('label', '  Gas sensor  ');
    fixture.componentInstance['familyChanged']('safety');
    await submit();
    expect(writes).toEqual([{ value: 'gas_sensor', label: 'Gas sensor', family: 'safety' }]);
  });

  it.each(['', 'UPPERCASE', '1sensor', 'smoke-detector', 'x'.repeat(33)])(
    'rejects invalid permanent code %s',
    async (code) => {
      await fill('code', code);
      await fill('label', 'Sensor');
      await submit();
      expect(writes).toEqual([]);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Use 1–32');
    },
  );

  it.each(['   ', 'x'.repeat(101)])(
    'rejects blank or overlong names without dropping the draft',
    async (label) => {
      await fill('code', 'sensor');
      await fill('label', label);
      await submit();
      expect(writes).toEqual([]);
      expect(field('label').value).toBe(label);
    },
  );

  it('disables immutable code editing and preserves a rejected draft when reviewing a new revision', async () => {
    fixture.componentRef.setInput('entry', entry);
    await fixture.whenStable();
    expect(field('code').disabled).toBe(true);
    await fill('label', 'Draft blanket');
    fixture.componentRef.setInput('error', 'Revision changed.');
    fixture.componentRef.setInput('entry', { ...entry, label: 'Another user label', revision: 3 });
    await fixture.whenStable();
    expect(field('label').value).toBe('Draft blanket');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Revision changed.');
    await submit();
    expect(writes).toEqual([{ value: entry.value, label: 'Draft blanket', family: 'fire' }]);
  });

  it('blocks duplicate writes while leaving entered fields intact', async () => {
    await fill('code', 'sensor');
    await fill('label', 'Sensor');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(field('label').disabled).toBe(true);
    await submit();
    expect(writes).toEqual([]);
    expect(field('label').value).toBe('Sensor');
  });

  it('allows explicit cancellation of an offline draft while disabling new commands', async () => {
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    await fill('code', 'sensor');
    await fill('label', 'Sensor');
    fixture.componentRef.setInput('available', false);
    await fixture.whenStable();
    await submit();
    expect(writes).toEqual([]);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[variant="outline"]',
    );
    if (!button) throw new Error('Missing cancel action');
    expect(button.disabled).toBe(false);
    button.click();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(field('label').value).toBe('Sensor');
  });

  it('resets fields only when selecting a different catalogue identity', async () => {
    fixture.componentRef.setInput('entry', entry);
    await fixture.whenStable();
    await fill('label', 'Draft');
    fixture.componentRef.setInput('entry', {
      ...entry,
      value: 'camera',
      label: 'Camera',
      family: 'safety',
    });
    await fixture.whenStable();
    expect(field('code').value).toBe('camera');
    expect(field('label').value).toBe('Camera');
  });
});
