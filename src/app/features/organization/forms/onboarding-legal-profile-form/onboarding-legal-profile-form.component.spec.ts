import { TestBed } from '@angular/core/testing';
import { OnboardingLegalProfileForm } from './onboarding-legal-profile-form.component';

describe('OnboardingLegalProfileForm', () => {
  let component: OnboardingLegalProfileForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new OnboardingLegalProfileForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should require registration number for company legal type', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).form.setValue({
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: '',
      vatNumber: '',
    });
    (component as any).onSubmit();

    expect((component as any).form.controls.registrationNumber.hasError('required')).toBe(
      true,
    );
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit legal profile values when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).form.setValue({
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: 'RCS-PAR-123456789',
      vatNumber: 'FR00123456789',
    });
    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: 'RCS-PAR-123456789',
      vatNumber: 'FR00123456789',
    });
  });

  it('should not emit when registration number format is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).form.setValue({
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: 'RCS*INVALID',
      vatNumber: '',
    });
    (component as any).onSubmit();

    expect((component as any).form.controls.registrationNumber.hasError('pattern')).toBe(
      true,
    );
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
