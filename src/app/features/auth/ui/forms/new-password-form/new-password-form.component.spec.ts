import { TestBed } from '@angular/core/testing';
import { NewPasswordForm } from './new-password-form.component';

describe('NewPasswordForm', () => {
  let component: NewPasswordForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new NewPasswordForm());
  });

  it('should not emit when form is invalid (password mismatch)', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    (component as any).form.setValue({
      newPassword: 'password123',
      confirmPassword: 'different123',
    });

    (component as any).onSubmit();

    expect((component as any).form.hasError('passwordMismatch')).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit newPassword when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    (component as any).form.setValue({
      newPassword: 'password123',
      confirmPassword: 'password123',
    });

    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ newPassword: 'password123' });
  });

  it('should emit cancel event on cancel', () => {
    const emitSpy = vi.spyOn(component.cancelled, 'emit');

    (component as any).onCancel();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
