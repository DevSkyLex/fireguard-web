import { TestBed } from '@angular/core/testing';
import { OtpVerificationForm } from './otp-verification-form.component';

type OtpVerificationFormTestApi = OtpVerificationForm & {
  form: {
    setValue(value: { code: string; trustDevice: boolean }): void;
  };
  onSubmit(): void;
  onCancel(): void;
  onResend(): void;
};

describe('OtpVerificationForm', () => {
  let component: OtpVerificationForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new OtpVerificationForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as OtpVerificationFormTestApi;

    formComponent.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit otp values when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as OtpVerificationFormTestApi;
    formComponent.form.setValue({
      code: '123456',
      trustDevice: true,
    });

    formComponent.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      code: '123456',
      trustDevice: true,
    });
  });

  it('should emit cancel event on cancel', () => {
    const emitSpy = vi.spyOn(component.cancelled, 'emit');
    const formComponent = component as unknown as OtpVerificationFormTestApi;

    formComponent.onCancel();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit resend event on resend', () => {
    const emitSpy = vi.spyOn(component.resend, 'emit');
    const formComponent = component as unknown as OtpVerificationFormTestApi;

    formComponent.onResend();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
