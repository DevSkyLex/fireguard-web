import { TestBed } from '@angular/core/testing';
import { MATCH_FIELDS_ERROR_KEY } from '@shared/validators';
import { NewPasswordForm } from '../new-password-form.component';

type NewPasswordFormTestApi = NewPasswordForm & {
  form: {
    setValue(value: { newPassword: string; confirmPassword: string }): void;
    hasError(errorCode: string): boolean;
  };
  onSubmit(): void;
  onCancel(): void;
};

describe('NewPasswordForm', () => {
  let component: NewPasswordForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new NewPasswordForm());
  });

  it('should not emit when form is invalid (password mismatch)', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as NewPasswordFormTestApi;
    formComponent.form.setValue({
      newPassword: 'Password123!',
      confirmPassword: 'Different123!',
    });

    formComponent.onSubmit();

    expect(formComponent.form.hasError(MATCH_FIELDS_ERROR_KEY)).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit newPassword when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as NewPasswordFormTestApi;
    formComponent.form.setValue({
      newPassword: 'Password123!',
      confirmPassword: 'Password123!',
    });

    formComponent.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ newPassword: 'Password123!' });
  });

  it('should emit cancel event on cancel', () => {
    const emitSpy = vi.spyOn(component.cancelled, 'emit');
    const formComponent = component as unknown as NewPasswordFormTestApi;

    formComponent.onCancel();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  describe('rendering', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [NewPasswordForm] });
    });

    it('should render the password fields and action buttons', () => {
      const fixture = TestBed.createComponent(NewPasswordForm);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('#newPassword')).not.toBeNull();
      expect(nativeElement.querySelector('#confirmPassword')).not.toBeNull();
      expect(nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
      expect(nativeElement.querySelector('button[type="button"]')).not.toBeNull();
    });

    it('should show a mismatch error message once fields are touched and differ', () => {
      const fixture = TestBed.createComponent(NewPasswordForm);
      fixture.detectChanges();

      const instance = fixture.componentInstance as unknown as NewPasswordFormTestApi;
      instance.form.setValue({ newPassword: 'Password123!', confirmPassword: 'Different123!' });
      (
        instance as unknown as {
          form: { controls: { confirmPassword: { markAsTouched(): void } } };
        }
      ).form.controls.confirmPassword.markAsTouched();
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelectorAll('p-message').length).toBeGreaterThan(0);
    });

    it('should emit cancelled when the cancel button is clicked', () => {
      const fixture = TestBed.createComponent(NewPasswordForm);
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
      const fixture = TestBed.createComponent(NewPasswordForm);
      fixture.detectChanges();
      const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

      const instance = fixture.componentInstance as unknown as NewPasswordFormTestApi;
      instance.form.setValue({ newPassword: 'Password123!', confirmPassword: 'Password123!' });
      fixture.detectChanges();

      const formElement: HTMLFormElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('form');
      formElement?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({ newPassword: 'Password123!' });
    });
  });

  describe('server validation', () => {
    /** A 422 rejecting the new password, as the API reports a policy breach. */
    const passwordViolation = {
      '@id': '',
      '@type': 'ConstraintViolation',
      status: 422,
      type: 'https://tools.ietf.org/html/rfc4918#section-11.2',
      title: 'Unprocessable Entity',
      detail: 'Validation failed',
      violations: [{ propertyPath: 'newPassword', message: 'This password has been leaked.' }],
    };

    it('should show the server message on the field it names', () => {
      const fixture = TestBed.createComponent(NewPasswordForm);
      fixture.componentRef.setInput('serverError', { error: passwordViolation });
      fixture.detectChanges();

      const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('This password has been leaked.');
    });

    it('should surface a violation naming no field at form level', () => {
      const fixture = TestBed.createComponent(NewPasswordForm);
      fixture.componentRef.setInput('serverError', {
        error: {
          ...passwordViolation,
          violations: [{ propertyPath: 'token', message: 'This reset link has expired.' }],
        },
      });
      fixture.detectChanges();

      const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('This reset link has expired.');
    });

    it('should drop the server message once the page clears the error', () => {
      const fixture = TestBed.createComponent(NewPasswordForm);
      fixture.componentRef.setInput('serverError', { error: passwordViolation });
      fixture.detectChanges();

      fixture.componentRef.setInput('serverError', null);
      fixture.detectChanges();

      const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).not.toContain('This password has been leaked.');
    });
  });
});
