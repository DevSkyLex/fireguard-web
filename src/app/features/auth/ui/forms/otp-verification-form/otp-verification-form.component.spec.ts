import { TestBed } from '@angular/core/testing';
import { OtpVerificationForm } from './otp-verification-form.component';

describe('OtpVerificationForm', () => {
  let component: OtpVerificationForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new OtpVerificationForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit otp values when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    (component as any).form.setValue({
      code: '123456',
      trustDevice: true,
    });

    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      code: '123456',
      trustDevice: true,
    });
  });

  it('should emit cancel event on cancel', () => {
    const emitSpy = vi.spyOn(component.cancelled, 'emit');

    (component as any).onCancel();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit resend event on resend', () => {
    const emitSpy = vi.spyOn(component.resend, 'emit');

    (component as any).onResend();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
