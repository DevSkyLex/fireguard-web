import { TestBed } from '@angular/core/testing';
import { LoginForm } from './login-form.component';

type LoginFormTestApi = LoginForm & {
  form: {
    setValue(value: { email: string; password: string; remember_me: boolean }): void;
  };
  onSubmit(): void;
};

describe('LoginForm', () => {
  let component: LoginForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new LoginForm());
  });

  it('should not emit when form is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as LoginFormTestApi;

    formComponent.onSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit credentials when form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const formComponent = component as unknown as LoginFormTestApi;
    formComponent.form.setValue({
      email: 'test@example.com',
      password: 'password123',
      remember_me: true,
    });

    formComponent.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      remember_me: true,
    });
  });
});
