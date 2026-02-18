import { TestBed } from '@angular/core/testing';
import { OnboardingFirstFacilityForm } from './onboarding-first-facility-form.component';

describe('OnboardingFirstFacilityForm', () => {
  let component: OnboardingFirstFacilityForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new OnboardingFirstFacilityForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit first facility values when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).form.setValue({
      type: 'site',
      name: 'Headquarters',
      code: 'SITE-PAR-001',
      address: '10 rue de Rivoli, Paris',
      country: 'FR',
      timezone: 'Europe/Paris',
    });
    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      type: 'site',
      name: 'Headquarters',
      code: 'SITE-PAR-001',
      address: '10 rue de Rivoli, Paris',
      country: 'FR',
      timezone: 'Europe/Paris',
    });
  });
});
