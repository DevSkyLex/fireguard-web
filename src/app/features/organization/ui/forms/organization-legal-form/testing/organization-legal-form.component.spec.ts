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
};

const legalTypeOptions: ReadonlyArray<OptionOutput> = [
  {
    '@id': '',
    '@type': 'OrganizationLegalType',
    value: 'limited_liability_company',
    label: 'Limited liability company',
  } as unknown as OptionOutput,
];

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

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationLegalForm);
    fixture.componentRef.setInput('legal', seed);
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
      },
    ]);
  });

  it('should resolve the unset and catalog labels for the closed trigger', () => {
    expect(fixture.componentInstance['legalTypeLabel']('')).toBe('Not set');
    expect(fixture.componentInstance['legalTypeLabel']('limited_liability_company')).toBe(
      'Limited liability company',
    );
  });

  it('should re-seed the model whenever the legal input changes', async () => {
    fixture.componentRef.setInput('legal', { ...seed, legalName: 'Existing Corp' });
    await fixture.whenStable();

    expect(legalNameInput().value).toBe('Existing Corp');
  });

  it('should disable the submit control while a save is already in flight', async () => {
    await type(legalNameInput(), 'Fireguard Paris SARL');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Saving…');
  });
});
