import { TestBed } from '@angular/core/testing';
import { ForgotPasswordForm } from '../forgot-password-form.component';

type ForgotPasswordFormTestApi = ForgotPasswordForm & {
  form: {
    controls: {
      email: {
        setValue(value: string): void;
      };
    };
  };
  onSubmit(): void;
};

describe('ForgotPasswordForm', () => {
  let component: ForgotPasswordForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new ForgotPasswordForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as ForgotPasswordFormTestApi;

    formComponent.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit email when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as ForgotPasswordFormTestApi;
    formComponent.form.controls.email.setValue('test@example.com');

    formComponent.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});
