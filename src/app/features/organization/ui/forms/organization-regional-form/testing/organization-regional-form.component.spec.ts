import { TestBed } from '@angular/core/testing';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationRegionalForm } from '../organization-regional-form.component';

const organization = (overrides: Partial<OrganizationOutput> = {}): OrganizationOutput =>
  ({
    id: 'org-1',
    name: 'Acme Corp',
    settings: {},
    ...overrides,
  }) as unknown as OrganizationOutput;

describe('OrganizationRegionalForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const createFixture = (organizationInput: OrganizationOutput | null = null) => {
    const fixture = TestBed.createComponent(OrganizationRegionalForm);
    if (organizationInput) fixture.componentRef.setInput('organization', organizationInput);
    fixture.detectChanges();
    return fixture;
  };

  it('should render with default regional values when no organization is set', () => {
    const fixture = createFixture();

    const component = fixture.componentInstance;
    expect(component['form'].value).toEqual({
      timezone: 'UTC',
      locale: 'en-US',
      dateFormat: 'yyyy-MM-dd',
      firstDayOfWeek: 'monday',
      measurementSystem: 'metric',
    });
  });

  it('should populate the form with the organization persisted regional settings', () => {
    const fixture = createFixture(
      organization({
        settings: {
          regional: {
            timezone: 'Europe/Paris',
            locale: 'fr-FR',
            dateFormat: 'dd/MM/yyyy',
            firstDayOfWeek: 'sunday',
            measurementSystem: 'imperial',
          },
        },
      } as never),
    );

    const component = fixture.componentInstance;
    expect(component['form'].value).toEqual({
      timezone: 'Europe/Paris',
      locale: 'fr-FR',
      dateFormat: 'dd/MM/yyyy',
      firstDayOfWeek: 'sunday',
      measurementSystem: 'imperial',
    });
  });

  it('should fall back to defaults for settings fields not persisted yet', () => {
    const fixture = createFixture(organization({ settings: { regional: { locale: 'fr-FR' } } } as never));

    const component = fixture.componentInstance;
    expect(component['form'].value.timezone).toBe('UTC');
    expect(component['form'].value.locale).toBe('fr-FR');
  });

  it('should emit submitted with the regional settings payload on submit', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(emitSpy).toHaveBeenCalledWith({
      regional: {
        timezone: 'UTC',
        locale: 'en-US',
        dateFormat: 'yyyy-MM-dd',
        firstDayOfWeek: 'monday',
        measurementSystem: 'metric',
      },
    });
  });

  it('should not emit submitted when the form is invalid', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component['form'].controls.timezone.setValue('');
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

    component['submit']();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component['form'].controls.timezone.touched).toBe(true);
  });

  it('should disable the form and show the loading save button while saving', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component['form'].disabled).toBe(true);
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const saveButton = host.querySelector('p-button[type="submit"] button');
    expect(saveButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should render timezone options with their resolved UTC offset', () => {
    const fixture = createFixture();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-select[formcontrolname="timezone"]')).toBeTruthy();
  });

  it('should render locale, date-format, first-day and measurement selects', () => {
    const fixture = createFixture();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-select[formcontrolname="locale"]')).toBeTruthy();
    expect(host.querySelector('p-select[formcontrolname="dateFormat"]')).toBeTruthy();
    expect(host.querySelector('p-select[formcontrolname="firstDayOfWeek"]')).toBeTruthy();
    expect(host.querySelector('p-select[formcontrolname="measurementSystem"]')).toBeTruthy();
  });
});
