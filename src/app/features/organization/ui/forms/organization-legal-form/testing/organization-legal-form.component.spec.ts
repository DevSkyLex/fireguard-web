import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OptionOutput } from '@core/api/models';
import type { OrganizationLegalFormValues } from '../models';
import { OrganizationLegalForm } from '../organization-legal-form.component';

const seed: OrganizationLegalFormValues = {
  country: '',
  legalType: '',
  legalName: '',
  registrationNumber: '',
  vatNumber: '',
  registeredAddress: {
    line1: '',
    line2: '',
    postalCode: '',
    city: '',
    region: '',
    countryCode: '',
  },
  privacyContactEmail: '',
};

const legalTypeOptions: ReadonlyArray<OptionOutput> = [
  {
    '@id': '',
    '@type': 'OrganizationLegalType',
    value: 'limited_liability_company',
    label: 'Limited liability company',
  } as unknown as OptionOutput,
];

class ResizeObserverStub implements ResizeObserver {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('OrganizationLegalForm', () => {
  let fixture: ComponentFixture<OrganizationLegalForm>;
  let submissions: OrganizationLegalFormValues[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const countryInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="org-legal-country"]') as HTMLInputElement;
  const legalNameInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="org-legal-name"]') as HTMLInputElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="org-legal-submit"]') as HTMLButtonElement;

  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeAll(() => vi.stubGlobal('ResizeObserver', ResizeObserverStub));
  afterAll(() => vi.unstubAllGlobals());

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationLegalForm);
    fixture.componentRef.setInput('legal', seed);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('legalTypeOptions', legalTypeOptions);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should keep the submit control disabled until a field changes', () => {
    expect(submitButton().disabled).toBe(true);
  });

  it('should emit the edited values once a field changes and the form is submitted', async () => {
    await type(legalNameInput(), 'Fireguard Paris SARL');
    await type(countryInput(), 'FR');
    await submit();

    expect(submissions).toEqual([
      {
        country: 'FR',
        legalType: '',
        legalName: 'Fireguard Paris SARL',
        registrationNumber: '',
        vatNumber: '',
        registeredAddress: seed.registeredAddress,
        privacyContactEmail: '',
      },
    ]);
  });

  it('should resolve the unset and catalog labels for the closed trigger', () => {
    expect(fixture.componentInstance['legalTypeLabel']('')).toBe('Not set');
    expect(fixture.componentInstance['legalTypeLabel']('limited_liability_company')).toBe(
      'Limited liability company',
    );
  });

  it('should re-seed the model when the organization changes', async () => {
    await type(legalNameInput(), 'Unsaved draft');
    fixture.componentRef.setInput('organizationId', 'org-2');
    fixture.componentRef.setInput('legal', { ...seed, legalName: 'Existing Corp' });
    await fixture.whenStable();

    expect(legalNameInput().value).toBe('Existing Corp');
  });

  it('refreshes an intact form when the server legal profile changes', async () => {
    fixture.componentRef.setInput('legal', {
      ...seed,
      legalName: 'Updated Corp',
      registeredAddress: { ...seed.registeredAddress, city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    });
    await fixture.whenStable();

    expect(legalNameInput().value).toBe('Updated Corp');
    expect(
      (root().querySelector('[data-testid="org-legal-address-city"]') as HTMLInputElement).value,
    ).toBe('Lyon');
    expect(
      (root().querySelector('[data-testid="org-legal-privacy-email"]') as HTMLInputElement).value,
    ).toBe('updated@example.com');
    expect(submitButton().disabled).toBe(true);
  });

  it('submits the latest server address and contact after editing a refreshed intact form', async () => {
    const refreshed: OrganizationLegalFormValues = {
      ...seed,
      legalName: 'Updated Corp',
      registeredAddress: { ...seed.registeredAddress, city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    };
    fixture.componentRef.setInput('legal', refreshed);
    await fixture.whenStable();
    await type(legalNameInput(), 'Edited Corp');
    await submit();

    expect(submissions).toEqual([{ ...refreshed, legalName: 'Edited Corp' }]);
  });

  it('refreshes an intact form after a pending settings save finishes', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    fixture.componentRef.setInput('legal', {
      ...seed,
      legalName: 'Updated Corp',
      registeredAddress: { ...seed.registeredAddress, city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    });
    await fixture.whenStable();
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();

    expect(legalNameInput().value).toBe('Updated Corp');
    expect(submitButton().disabled).toBe(true);
    await type(legalNameInput(), 'Edited Corp');
    await submit();
    expect(submissions[0]).toMatchObject({
      legalName: 'Edited Corp',
      registeredAddress: { city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    });
  });

  it('preserves a modified draft when the server returns different legal values', async () => {
    const saved: OrganizationLegalFormValues = {
      ...seed,
      legalName: 'Saved Corp',
      registeredAddress: { ...seed.registeredAddress, city: 'Paris' },
      privacyContactEmail: 'saved@example.com',
    };
    fixture.componentRef.setInput('legal', saved);
    fixture.componentRef.setInput('resetRevision', 1);
    await fixture.whenStable();
    await type(
      root().querySelector('[data-testid="org-legal-address-city"]') as HTMLInputElement,
      'Unsaved city',
    );
    fixture.componentRef.setInput('legal', {
      ...seed,
      legalName: 'Updated Corp',
      registeredAddress: { ...seed.registeredAddress, city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    });
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    await submit();

    expect(submitButton().disabled).toBe(false);
    expect(submissions).toEqual([
      { ...saved, registeredAddress: { ...saved.registeredAddress, city: 'Unsaved city' } },
    ]);
  });

  it('preserves the draft and dirty state through equivalent input refreshes and unrelated saves', async () => {
    await type(legalNameInput(), 'Unsaved draft');
    fixture.componentRef.setInput('legal', {
      ...seed,
      registeredAddress: { ...seed.registeredAddress },
    });
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(legalNameInput().value).toBe('Unsaved draft');
    expect(submitButton().disabled).toBe(false);
  });

  it('resets the draft and field dirtiness only after successful-save acknowledgement', async () => {
    await type(legalNameInput(), 'Saved draft');
    fixture.componentRef.setInput('legal', { ...seed, legalName: 'SAVED DRAFT' });
    fixture.componentRef.setInput('resetRevision', 1);
    await fixture.whenStable();
    expect(legalNameInput().value).toBe('SAVED DRAFT');
    expect(submitButton().disabled).toBe(true);
    expect(fixture.componentInstance['legalForm']().dirty()).toBe(false);
  });

  it('allows a partial registered office and an empty privacy contact', async () => {
    const city = root().querySelector('[data-testid="org-legal-address-city"]') as HTMLInputElement;
    await type(city, 'Paris');
    await submit();
    expect(submissions).toEqual([
      { ...seed, registeredAddress: { ...seed.registeredAddress, city: 'Paris' } },
    ]);
    expect(root().textContent).toContain('You can continue with a partial profile.');
  });

  it('rejects an invalid privacy email and exposes its field error after touch', async () => {
    const privacyEmail = root().querySelector(
      '[data-testid="org-legal-privacy-email"]',
    ) as HTMLInputElement;
    await type(privacyEmail, 'invalid');
    await submit();
    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Enter a valid email address');
    await type(privacyEmail, 'privacy@example.com');
    await submit();
    expect(submissions[0]?.privacyContactEmail).toBe('privacy@example.com');
  });

  it('keeps empty address and email values when clearing a saved profile', async () => {
    fixture.componentRef.setInput('legal', {
      ...seed,
      privacyContactEmail: 'privacy@example.com',
      registeredAddress: { ...seed.registeredAddress, city: 'Paris' },
    });
    fixture.componentRef.setInput('resetRevision', 1);
    await fixture.whenStable();
    await type(
      root().querySelector('[data-testid="org-legal-privacy-email"]') as HTMLInputElement,
      '',
    );
    await type(
      root().querySelector('[data-testid="org-legal-address-city"]') as HTMLInputElement,
      '',
    );
    await submit();
    expect(submissions).toEqual([seed]);
  });

  it('should disable the submit control while a save is already in flight', async () => {
    await type(legalNameInput(), 'Fireguard Paris SARL');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Saving…');
  });
});
