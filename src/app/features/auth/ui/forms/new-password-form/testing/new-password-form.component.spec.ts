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
      newPassword: 'password123',
      confirmPassword: 'different123',
    });

    formComponent.onSubmit();

    expect(formComponent.form.hasError(MATCH_FIELDS_ERROR_KEY)).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit newPassword when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as NewPasswordFormTestApi;
    formComponent.form.setValue({
      newPassword: 'password123',
      confirmPassword: 'password123',
    });

    formComponent.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ newPassword: 'password123' });
  });

  it('should emit cancel event on cancel', () => {
    const emitSpy = vi.spyOn(component.cancelled, 'emit');
    const formComponent = component as unknown as NewPasswordFormTestApi;

    formComponent.onCancel();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});

