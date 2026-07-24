import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginForm } from '../login-form.component';

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

  describe('rendering', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [LoginForm],
        providers: [provideRouter([])],
      });
    });

    it('should render the login form with email, password and submit controls', () => {
      const fixture = TestBed.createComponent(LoginForm);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('#email')).not.toBeNull();
      expect(nativeElement.querySelector('#password')).not.toBeNull();
      expect(nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
    });

    it('should disable the submit button while loading', () => {
      const fixture = TestBed.createComponent(LoginForm);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const submitButton: HTMLButtonElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(true);
    });

    it('should show a required email error message once the field is touched', () => {
      const fixture = TestBed.createComponent(LoginForm);
      fixture.detectChanges();

      const instance = fixture.componentInstance as unknown as LoginFormTestApi & {
        form: { controls: { email: { markAsTouched(): void } } };
      };
      instance.form.controls.email.markAsTouched();
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('p-message')).not.toBeNull();
    });

    it('should emit submitted when the form is filled and submitted via the DOM', () => {
      const fixture = TestBed.createComponent(LoginForm);
      fixture.detectChanges();
      const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

      const instance = fixture.componentInstance as unknown as LoginFormTestApi;
      instance.form.setValue({
        email: 'test@example.com',
        password: 'password123',
        remember_me: false,
      });
      fixture.detectChanges();

      const formElement: HTMLFormElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('form');
      formElement?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        remember_me: false,
      });
    });
  });
});
