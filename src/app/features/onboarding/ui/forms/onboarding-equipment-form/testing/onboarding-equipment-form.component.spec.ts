import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SetupCreateEquipmentInput } from '@features/organization/setup';
import type { OnboardingEquipmentFormDraft } from '../models';
import { OnboardingEquipmentForm } from '../onboarding-equipment-form.component';

describe('OnboardingEquipmentForm', () => {
  let fixture: ComponentFixture<OnboardingEquipmentForm>;
  let element: HTMLElement;

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingEquipmentForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should refuse to emit while no type is picked, and show the reason', async () => {
    const emitted: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: SetupCreateEquipmentInput): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Equipment type is required.');
  });

  it('should emit the picked type with the free-text fields trimmed, dropping blank ones', async () => {
    const emitted: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: SetupCreateEquipmentInput): void => {
      emitted.push(value);
    });

    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<OnboardingEquipmentFormDraft>;
      }
    ).model.set({
      type: 'fire_extinguisher',
      brand: ' Kidde ',
      model: '',
      serialNumber: '',
      facilityId: '',
    });
    await fixture.whenStable();

    await submit();

    expect(emitted).toEqual([
      { type: 'fire_extinguisher', brand: 'Kidde', model: undefined, serialNumber: undefined },
    ]);
  });

  it('should attach the only created facility silently, without rendering a select', async () => {
    fixture.componentRef.setInput('facilities', [{ id: 'facility-1', name: 'HQ' }]);
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="onboarding-equipment-facility"]')).toBeNull();

    const emitted: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: SetupCreateEquipmentInput): void => {
      emitted.push(value);
    });

    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<OnboardingEquipmentFormDraft>;
      }
    ).model.update((draft) => ({ ...draft, type: 'fire_extinguisher' }));
    await fixture.whenStable();

    await submit();

    expect(emitted).toEqual([{ type: 'fire_extinguisher', facilityId: 'facility-1' }]);
  });

  it('should offer a facility select pre-selected on the first when several were created', async () => {
    fixture.componentRef.setInput('facilities', [
      { id: 'facility-1', name: 'HQ' },
      { id: 'facility-2', name: 'Annex' },
    ]);
    await fixture.whenStable();

    const trigger: HTMLElement | null = element.querySelector(
      '[data-testid="onboarding-equipment-facility"]',
    );

    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain('HQ');

    const emitted: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: SetupCreateEquipmentInput): void => {
      emitted.push(value);
    });

    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<OnboardingEquipmentFormDraft>;
      }
    ).model.update((draft) => ({ ...draft, type: 'fire_extinguisher' }));
    await fixture.whenStable();

    await submit();

    expect(emitted).toEqual([{ type: 'fire_extinguisher', facilityId: 'facility-1' }]);
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [
        { propertyPath: 'serialNumber', message: 'This serial number is already used.' },
      ],
    });
    await fixture.whenStable();

    expect(
      element.querySelector('[data-testid="onboarding-equipment-error"]')?.textContent,
    ).toContain('This serial number is already used.');
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="onboarding-equipment-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Registering…');
  });
});
