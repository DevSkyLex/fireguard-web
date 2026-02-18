import { TestBed } from '@angular/core/testing';
import { OnboardingOrganizationForm } from './onboarding-organization-form.component';

describe('OnboardingOrganizationForm', () => {
  let component: OnboardingOrganizationForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new OnboardingOrganizationForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit organization values when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).form.setValue({
      name: 'Fireguard Paris',
      slug: 'fireguard-paris',
    });
    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      name: 'Fireguard Paris',
      slug: 'fireguard-paris',
    });
  });

  it('should not emit when slug is shorter than 3 characters', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).form.setValue({
      name: 'Fireguard Paris',
      slug: 'ab',
    });
    (component as any).onSubmit();

    expect((component as any).form.controls.slug.hasError('minlength')).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
