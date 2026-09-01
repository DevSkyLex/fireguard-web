import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SetupCreateFacilityInput } from '@features/organization/setup';
import type { OnboardingFacilityDraft } from '../models';
import { OnboardingFacilitiesForm } from '../onboarding-facilities-form.component';

describe('OnboardingFacilitiesForm', () => {
  let fixture: ComponentFixture<OnboardingFacilitiesForm>;
  let element: HTMLElement;

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const setDraft = async (draft: OnboardingFacilityDraft): Promise<void> => {
    (
      fixture.componentInstance as unknown as { model: WritableSignal<OnboardingFacilityDraft> }
    ).model.set(draft);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingFacilitiesForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should refuse an empty continue and show the near-form message instead', async () => {
    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupCreateFacilityInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([]);
    expect(element.querySelector('[data-testid="onboarding-facilities-empty"]')).not.toBeNull();
  });

  it('should stage a valid draft row automatically when the operator continues', async () => {
    await setDraft({ type: 'site', name: 'Main warehouse', address: '' });

    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupCreateFacilityInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([[{ type: 'site', name: 'Main warehouse', address: undefined }]]);
  });

  it('should block the continue while a partially filled draft row is invalid', async () => {
    await setDraft({ type: 'site', name: 'HQ', address: '' });
    (element.querySelector('[data-testid="onboarding-facility-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    await setDraft({ type: '', name: 'Annex', address: '' });

    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupCreateFacilityInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([]);
  });

  it('should clear the empty-batch message once a row is staged', async () => {
    await submit();
    expect(element.querySelector('[data-testid="onboarding-facilities-empty"]')).not.toBeNull();

    await setDraft({ type: 'site', name: 'Main warehouse', address: '' });
    (element.querySelector('[data-testid="onboarding-facility-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="onboarding-facilities-empty"]')).toBeNull();
  });

  it('should stage a row, clear the draft, and submit the staged batch', async () => {
    await setDraft({ type: 'site', name: ' Main warehouse ', address: '' });

    const addButton: HTMLButtonElement = element.querySelector(
      '[data-testid="onboarding-facility-add"]',
    ) as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();

    expect(
      element.querySelector('[data-testid="onboarding-facilities-staged"]')?.textContent,
    ).toContain('Main warehouse');

    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupCreateFacilityInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([[{ type: 'site', name: 'Main warehouse', address: undefined }]]);
  });

  it('should remove a staged row', async () => {
    await setDraft({ type: 'site', name: 'Main warehouse', address: '' });
    (element.querySelector('[data-testid="onboarding-facility-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    (
      element.querySelector('[data-testid="onboarding-facilities-remove-0"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="onboarding-facilities-staged"]')).toBeNull();
  });

  it('should disable the add control while the draft is invalid', async () => {
    const addButton: HTMLButtonElement = element.querySelector(
      '[data-testid="onboarding-facility-add"]',
    ) as HTMLButtonElement;

    expect(addButton.disabled).toBe(true);
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'A facility with this name already exists.' }],
    });
    await fixture.whenStable();

    expect(
      element.querySelector('[data-testid="onboarding-facilities-error"]')?.textContent,
    ).toContain('A facility with this name already exists.');
  });
});
