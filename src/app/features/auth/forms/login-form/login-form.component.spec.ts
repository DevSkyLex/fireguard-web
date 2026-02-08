import { TestBed } from '@angular/core/testing';
import { LoginForm } from './login-form.component';

describe('LoginForm', () => {
  let component: LoginForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new LoginForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    (component as any).onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit credentials when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    (component as any).form.setValue({
      email: 'test@example.com',
      password: 'password123',
      remember_me: true,
    });

    (component as any).onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      remember_me: true,
    });
  });
});
