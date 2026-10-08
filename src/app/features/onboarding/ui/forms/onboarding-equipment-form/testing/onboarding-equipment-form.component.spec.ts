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
    fixture.componentRef.setInput('typeOptions', [
      {
        value: 'fire_extinguisher',
        label: 'Fire extinguisher',
        family: 'fire',
        icon: 'lucideFireExtinguisher',
      },
    ]);
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

  it('accepts a server-defined fire code without narrowing it to the historical enum', async () => {
    fixture.componentRef.setInput('typeOptions', [
      {
        value: 'custom_fire_system',
        label: 'Custom fire system',
        family: 'fire',
        icon: 'lucideBox',
      },
    ]);
    fixture.componentRef.setInput('restored', { type: 'custom_fire_system', brand: '  Acme  ' });
    await fixture.whenStable();
    const writes: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await submit();
    expect(writes).toEqual([{ type: 'custom_fire_system', brand: 'Acme' }]);
    expect(fixture.componentInstance['typeLabelOf']('custom_fire_system')).toBe(
      'Custom fire system',
    );
  });

  it('preserves an unavailable prepared code and requires choosing an active type before new creation', async () => {
    fixture.componentRef.setInput('restored', {
      type: 'archived_fire_system',
      serialNumber: 'PREPARED-42',
    });
    await fixture.whenStable();
    const writes: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await submit();
    expect(writes).toEqual([]);
    expect(fixture.componentInstance['equipmentForm'].type().value()).toBe('archived_fire_system');
    expect(fixture.componentInstance['equipmentForm'].serialNumber().value()).toBe('PREPARED-42');
    expect(element.textContent).toContain('This type is no longer available');
    fixture.componentInstance['equipmentForm'].type().value.set('fire_extinguisher');
    await submit();
    expect(writes).toEqual([{ type: 'fire_extinguisher', serialNumber: 'PREPARED-42' }]);
  });

  it('opens all families for a restored safety code while new drafts start with fire types', async () => {
    const choices = [
      { value: 'fire_extinguisher', label: 'Extinguisher', family: 'fire', icon: 'lucideBox' },
      { value: 'custom_camera', label: 'Camera', family: 'safety', icon: 'lucideBox' },
    ];
    fixture.componentRef.setInput('typeOptions', choices);
    await fixture.whenStable();
    expect(fixture.componentInstance['visibleTypeOptions']().map((option) => option.value)).toEqual(
      ['fire_extinguisher'],
    );
    fixture.componentRef.setInput('restored', { type: 'custom_camera' });
    await fixture.whenStable();
    expect(fixture.componentInstance['visibleTypeOptions']().map((option) => option.value)).toEqual(
      ['fire_extinguisher', 'custom_camera'],
    );
    const writes: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await submit();
    expect(writes).toEqual([{ type: 'custom_camera' }]);
  });

  it('invalidates a type archived after selection without dropping the other draft fields', async () => {
    fixture.componentInstance['equipmentForm'].type().value.set('fire_extinguisher');
    fixture.componentInstance['equipmentForm'].brand().value.set('Draft brand');
    fixture.componentRef.setInput('typeOptions', []);
    await fixture.whenStable();
    const writes: SetupCreateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await submit();
    expect(writes).toEqual([]);
    expect(fixture.componentInstance['equipmentForm'].brand().value()).toBe('Draft brand');
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
