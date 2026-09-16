import { computed, signal } from '@angular/core';
import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { SetupCreateEquipmentInput } from '@features/organization/setup';
import type { OnboardingEquipmentFormDraft } from '../models';
import { OnboardingEquipmentForm } from '../onboarding-equipment-form.component';

describe('OnboardingEquipmentForm', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<OnboardingEquipmentForm>;
  let element: HTMLElement;

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeAll(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    ),
  );
  afterAll(() => vi.unstubAllGlobals());

  beforeEach(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    mobile.set(false);
    TestBed.overrideProvider(INTERACTION_CAPABILITIES_PORT, {
      useValue: {
        isMobileInteractionMode: mobile,
        mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
      },
    });
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

  it('should show the only facility as a summary and attach it automatically', async () => {
    fixture.componentRef.setInput('facilities', [{ id: 'facility-1', name: 'HQ', type: 'site' }]);
    await fixture.whenStable();

    const trigger: HTMLElement | null = element.querySelector(
      '[data-testid="onboarding-equipment-facility-summary"]',
    );
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain('HQ · Site');

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

  it('should require an explicit facility choice when several exist', async () => {
    fixture.componentRef.setInput('facilities', [
      { id: 'facility-1', name: 'HQ', type: 'site' },
      { id: 'facility-2', name: 'Annex', type: 'building' },
    ]);
    await fixture.whenStable();

    const trigger: HTMLElement | null = element.querySelector(
      '[data-testid="onboarding-equipment-facility"]',
    );

    expect(trigger).not.toBeNull();
    expect(fixture.componentInstance['equipmentForm'].facilityId().value()).toBe('');

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

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Select the facility for this equipment.');
    fixture.componentInstance['equipmentForm'].facilityId().value.set('facility-2');
    await submit();
    expect(emitted).toEqual([{ type: 'fire_extinguisher', facilityId: 'facility-2' }]);
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
  it('retains one field tree and the complete draft when interaction mode changes', async () => {
    const form = fixture.componentInstance['equipmentForm'];
    form.type().value.set('fire_extinguisher');
    form.brand().value.set('Draft brand');
    form.serialNumber().value.set('DRAFT-42');
    await fixture.whenStable();
    const originalInput = element.querySelector('[data-testid="onboarding-equipment-brand"]');
    mobile.set(true);
    await fixture.whenStable();
    expect(fixture.componentInstance['equipmentForm']).toBe(form);
    expect(element.querySelector('[data-testid="onboarding-equipment-brand"]')).toBe(originalInput);
    expect(form.brand().value()).toBe('Draft brand');
    expect(form.serialNumber().value()).toBe('DRAFT-42');
    mobile.set(false);
    await fixture.whenStable();
    expect(form.type().value()).toBe('fire_extinguisher');
    expect(form.brand().value()).toBe('Draft brand');
  });

  it('selects a facility from the mobile catalog into the existing form', async () => {
    mobile.set(true);
    fixture.componentRef.setInput('facilities', [
      { id: 'facility-1', name: 'North depot', type: 'site' },
      { id: 'facility-2', name: 'South depot', type: 'site' },
    ]);
    await fixture.whenStable();
    fixture.componentInstance['equipmentForm'].facilityId().value.set('facility-1');
    await fixture.whenStable();
    element
      .querySelector<HTMLButtonElement>('[data-testid="onboarding-equipment-facility"]')
      ?.click();
    await fixture.whenStable();
    const drawer = document.querySelector('hlm-drawer-content');
    expect(drawer).not.toBeNull();
    expect(drawer?.querySelector('[hlmCommandEmpty]')).toBeNull();
    const currentChoice = drawer?.querySelector('button[data-current="true"]');
    expect(currentChoice?.querySelector('.sr-only')?.textContent).toContain('Current choice');
    const search = drawer?.querySelector<HTMLInputElement>('input[role="combobox"]');
    if (!search) throw new Error('The facility drawer has no search field.');
    search.value = 'no matching depot';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(drawer?.querySelector('[hlmCommandEmpty]')?.textContent).toContain(
      'No matching facility.',
    );
    search.value = '';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(drawer?.querySelector('[hlmCommandEmpty]')).toBeNull();
    const choice = Array.from(drawer?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('South depot'),
    );
    expect(choice).toBeDefined();
    choice?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['equipmentForm'].facilityId().value()).toBe('facility-2');
  });
});
