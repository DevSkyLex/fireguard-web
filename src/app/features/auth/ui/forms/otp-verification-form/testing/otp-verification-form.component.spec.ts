import { TestBed } from '@angular/core/testing';
import { OtpVerificationForm } from '../otp-verification-form.component';

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

  it('should default showResend to true', () => {
    expect(component.showResend()).toBe(true);
  });

  describe('rendering', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [OtpVerificationForm] });
    });

    it('should render the OTP field and action buttons', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('p-inputotp')).not.toBeNull();
      expect(nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
      expect(nativeElement.querySelector('button[type="button"]')).not.toBeNull();
    });

    it('should show the resend help text and link when showResend is true', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.componentRef.setInput('showResend', true);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).toContain("Didn't receive the code");
    });

    it('should hide the resend link and show the TOTP help text when showResend is false', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.componentRef.setInput('showResend', false);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).not.toContain("Didn't receive the code");
      expect(nativeElement.textContent).toContain('authenticator app');
    });

    it('should render the trust device checkbox only when showTrustDevice is true', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.componentRef.setInput('showTrustDevice', true);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('#trustDevice')).not.toBeNull();
    });

    it('should not render the trust device checkbox when showTrustDevice is false', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.componentRef.setInput('showTrustDevice', false);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('#trustDevice')).toBeNull();
    });

    it('should show a countdown instead of the resend link while resendIn is active', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.componentRef.setInput('showResend', true);
      fixture.componentRef.setInput('resendIn', 30);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).toContain('Resend available in');
    });

    it('should emit cancelled when the cancel button is clicked', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.componentRef.setInput('showResend', false);
      fixture.detectChanges();
      const emitSpy = vi.spyOn(fixture.componentInstance.cancelled, 'emit');

      const cancelButton: HTMLButtonElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('button[type="button"]');
      cancelButton?.click();
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit submitted when the form is filled and submitted via the DOM', () => {
      const fixture = TestBed.createComponent(OtpVerificationForm);
      fixture.detectChanges();
      const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

      const instance = fixture.componentInstance as unknown as OtpVerificationFormTestApi;
      instance.form.setValue({ code: '123456', trustDevice: false });
      fixture.detectChanges();

      const formElement: HTMLFormElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('form');
      formElement?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({ code: '123456', trustDevice: false });
    });
  });
});
