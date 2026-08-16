import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateEquipmentInput } from '@features/organization/features/equipments/models';
import { EquipmentCreateForm } from '../equipment-create-form.component';
import type { EquipmentCreateFormDraft } from '../models';

describe('EquipmentCreateForm', () => {
  let fixture: ComponentFixture<EquipmentCreateForm>;
  let element: HTMLElement;

  const fill = async (testId: string, value: string): Promise<void> => {
    const input: HTMLInputElement = element.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EquipmentCreateForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should stay quiet until the form is touched', () => {
    expect(element.textContent).not.toContain('Equipment type is required.');
  });

  it('should refuse to emit while no type is picked, and show the reason', async () => {
    const emitted: CreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateEquipmentInput): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Equipment type is required.');
  });

  it('should emit the picked type with the free-text fields trimmed, dropping blank ones', async () => {
    const emitted: CreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateEquipmentInput): void => {
      emitted.push(value);
    });

    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<EquipmentCreateFormDraft>;
      }
    ).model.set({
      type: 'fire_extinguisher',
      subType: ' CO2 ',
      brand: 'Kidde',
      model: '',
      serialNumber: '',
      locationLabel: '',
    });
    await fixture.whenStable();

    await fill('equipment-create-subtype', ' CO2 ');
    await submit();

    expect(emitted).toEqual([
      {
        type: 'fire_extinguisher',
        subType: 'CO2',
        brand: 'Kidde',
        model: undefined,
        serialNumber: undefined,
        locationLabel: undefined,
      },
    ]);
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [
        { propertyPath: 'serialNumber', message: 'This serial number is already used.' },
      ],
    });
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="equipment-create-error"]')?.textContent).toContain(
      'This serial number is already used.',
    );
  });

  it('should fall back to a generic message when the rejection carries no violations', async () => {
    fixture.componentRef.setInput('serverError', new Error('boom'));
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="equipment-create-error"]')?.textContent).toContain(
      'The equipment could not be registered.',
    );
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="equipment-create-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Registering…');
  });

  it('should report dirtiness through dirtyChanged as the field tree is touched', async () => {
    const dirtyChanges: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((dirty: boolean): void => {
      dirtyChanges.push(dirty);
    });
    await fixture.whenStable();

    await fill('equipment-create-subtype', 'CO2');

    expect(dirtyChanges.at(-1)).toBe(true);
  });
});
