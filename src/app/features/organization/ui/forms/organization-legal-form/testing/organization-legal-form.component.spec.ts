import { TestBed } from '@angular/core/testing';
import type { OrganizationOutput, UpdateOrganizationInput } from '@features/organization/models';
import { OrganizationLegalForm } from '../organization-legal-form.component';

const ORGANIZATION = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  legalName: 'Acme Corporation SAS',
  legalType: 'SAS',
  registrationNumber: '123 456 789',
  vatNumber: 'FR12345678901',
  country: 'FR',
} as OrganizationOutput;

describe('OrganizationLegalForm', () => {
  const createComponent = (organization: OrganizationOutput | null = ORGANIZATION) => {
    TestBed.configureTestingModule({ imports: [OrganizationLegalForm] });

    const fixture = TestBed.createComponent(OrganizationLegalForm);
    fixture.componentRef.setInput('organization', organization);
    fixture.detectChanges();
    return fixture;
  };

  const submit = (fixture: ReturnType<typeof createComponent>): UpdateOrganizationInput[] => {
    const emitted: UpdateOrganizationInput[] = [];
    fixture.componentInstance.submitted.subscribe((input: UpdateOrganizationInput) =>
      emitted.push(input),
    );
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    return emitted;
  };

  it('should fill the form from the organization', () => {
    const fixture = createComponent();
    const legalName: HTMLInputElement = fixture.nativeElement.querySelector('#legalName');

    expect(legalName.value).toBe('Acme Corporation SAS');
  });

  it('should emit the legal profile on submit', () => {
    const [input] = submit(createComponent());

    expect(input?.legalName).toBe('Acme Corporation SAS');
    expect(input?.vatNumber).toBe('FR12345678901');
  });

  // The backend clears a field when it receives an empty string. Omitting a
  // blank would silently keep the value the user just erased.
  it('should send an emptied field as an empty string, not omit it', () => {
    const fixture = createComponent();
    const vat: HTMLInputElement = fixture.nativeElement.querySelector('#vatNumber');
    vat.value = '';
    vat.dispatchEvent(new Event('input'));

    const [input] = submit(fixture);

    expect(input).toHaveProperty('vatNumber');
    expect(input?.vatNumber).toBe('');
  });

  it('should normalise the country code to upper case', () => {
    const fixture = createComponent();
    const country: HTMLInputElement = fixture.nativeElement.querySelector('#country');
    country.value = 'fr';
    country.dispatchEvent(new Event('input'));

    expect(submit(fixture)[0]?.country).toBe('FR');
  });

  // An organization with no legal profile yet must render an empty form, not
  // the string "null".
  it('should render blanks for an organization with no legal profile', () => {
    const fixture = createComponent({
      id: 'org-2',
      name: 'New',
      slug: 'new',
    } as OrganizationOutput);
    const legalName: HTMLInputElement = fixture.nativeElement.querySelector('#legalName');

    expect(legalName.value).toBe('');
  });
});
