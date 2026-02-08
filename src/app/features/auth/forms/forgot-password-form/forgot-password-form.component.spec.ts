import { TestBed } from '@angular/core/testing';
import { ForgotPasswordForm } from './forgot-password-form.component';

describe('ForgotPasswordForm', () => {
  let component: ForgotPasswordForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new ForgotPasswordForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit email when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    (component as any).form.controls.email.setValue('test@example.com');

    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});
