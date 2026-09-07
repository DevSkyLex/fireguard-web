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

  const setDraft = async (
    draft: Pick<OnboardingFacilityDraft, 'type' | 'name' | 'address'>,
  ): Promise<void> => {
    (
      fixture.componentInstance as unknown as { model: WritableSignal<OnboardingFacilityDraft> }
    ).model.set({
      city: 'Paris',
      country: '',
      postalCode: '',
      ...draft,
      address: draft.address || '12 Quai des Docks',
    });
    fixture.componentRef.setInput('addressMatches', [
      {
        displayName: draft.address || '12 Quai des Docks',
        latitude: 48.8,
        longitude: 2.3,
        street: draft.address || '12 Quai des Docks',
        city: 'Paris',
        country: 'France',
        postalCode: '',
      },
    ]);
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { selectAddress(label: string): void }).selectAddress(
      draft.address || '12 Quai des Docks',
    );
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingFacilitiesForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should refuse an empty submit and let the required-field errors name what is missing', async () => {
    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupCreateFacilityInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Facility type is required.');
    expect(element.textContent).toContain('Name is required.');
  });

  it('should name the primary action after what a submit would create', async () => {
    const submitButton = (): HTMLButtonElement =>
      element.querySelector('[data-testid="onboarding-facilities-submit"]') as HTMLButtonElement;

    expect(submitButton().textContent).toContain('Create facility');

    await setDraft({ type: 'site', name: 'HQ', address: '' });
    (element.querySelector('[data-testid="onboarding-facility-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    await setDraft({ type: 'building', name: 'Annex', address: '' });

    expect(submitButton().textContent).toContain('Create facilities');
  });

  it('should never render a skip control — the backend does not let this step be skipped', () => {
    expect(element.querySelector('[data-testid="onboarding-wizard-skip"]')).toBeNull();
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

    expect(emitted).toEqual([
      [
        {
          type: 'site',
          name: 'Main warehouse',
          address: '12 Quai des Docks',
          latitude: 48.8,
          longitude: 2.3,
        },
      ],
    ]);
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

  it('should summarize a staged row with its type and address', async () => {
    await setDraft({ type: 'site', name: 'Main warehouse', address: '12 Quai des Docks' });
    (element.querySelector('[data-testid="onboarding-facility-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    const staged: string | undefined = element.querySelector(
      '[data-testid="onboarding-facilities-staged"]',
    )?.textContent;

    expect(staged).toContain('Main warehouse');
    expect(staged).toContain('Site · 12 Quai des Docks');
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

    expect(emitted).toEqual([
      [
        {
          type: 'site',
          name: 'Main warehouse',
          address: '12 Quai des Docks',
          latitude: 48.8,
          longitude: 2.3,
        },
      ],
    ]);
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

  it('rejects a typed address that was never selected', async () => {
    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    const form = fixture.componentInstance as unknown as {
      model: WritableSignal<OnboardingFacilityDraft>;
    };
    form.model.set({
      type: 'site',
      name: 'HQ',
      address: 'Invented address',
      city: '',
      country: '',
      postalCode: '',
    });
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Select a suggested address.');
  });

  it('invalidates the selected address when its text changes', async () => {
    await setDraft({ type: 'site', name: 'HQ', address: '12 Quai des Docks' });
    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    (fixture.componentInstance as unknown as { searchAddress(query: string): void }).searchAddress(
      'Other address',
    );
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([]);
  });

  it('keeps the batch at five facilities and permits editing at capacity', async () => {
    for (let index = 0; index < 5; index++) {
      // Each row depends on the previous staging action and its cleared form.
      // eslint-disable-next-line no-await-in-loop
      await setDraft({ type: 'site', name: `Site ${index}`, address: '12 Quai des Docks' });
      (
        element.querySelector('[data-testid="onboarding-facility-add"]') as HTMLButtonElement
      ).click();
      // eslint-disable-next-line no-await-in-loop
      await fixture.whenStable();
    }
    expect(element.querySelector('[data-testid="onboarding-facility-add"]')).toBeNull();
    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    await submit();
    expect(emitted[0]).toHaveLength(5);
    (fixture.componentInstance as unknown as { editFacility(index: number): void }).editFacility(2);
    await fixture.whenStable();
    await submit();
    expect(emitted[1]).toHaveLength(5);
    expect(emitted[1].filter((row) => row.name === 'Site 2')).toHaveLength(1);
  });

  it.each([
    ['city', 'Paris', 'Lyon'],
    ['country', 'France', 'Belgium'],
  ])('fills %s and invalidates coordinates when it changes', async (field, initial, changed) => {
    await setDraft({ type: 'site', name: 'HQ', address: '12 Quai des Docks' });
    const input = element.querySelector<HTMLInputElement>(`#onboarding-facility-${field}`);
    if (!input) throw new Error('Address component input is required.');
    expect(input.value).toBe(initial);
    const emitted: Array<readonly SetupCreateFacilityInput[]> = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    input.value = changed;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Select a suggested address.');
  });
});
