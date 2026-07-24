import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  describe('rendering', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ForgotPasswordForm],
        providers: [provideRouter([])],
      });
    });

    it('should render the email field and submit button', () => {
      const fixture = TestBed.createComponent(ForgotPasswordForm);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('#email')).not.toBeNull();
      expect(nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
    });

    it('should disable the form while loading', () => {
      const fixture = TestBed.createComponent(ForgotPasswordForm);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const instance = fixture.componentInstance as unknown as ForgotPasswordFormTestApi & {
        form: { disabled: boolean };
      };
      expect(instance.form.disabled).toBe(true);
    });

    it('should show a required email error message once the field is touched', () => {
      const fixture = TestBed.createComponent(ForgotPasswordForm);
      fixture.detectChanges();

      const instance = fixture.componentInstance as unknown as ForgotPasswordFormTestApi & {
        form: { controls: { email: { markAsTouched(): void } } };
      };
      instance.form.controls.email.markAsTouched();
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('p-message')).not.toBeNull();
    });

    it('should emit submitted when the form is filled and submitted via the DOM', () => {
      const fixture = TestBed.createComponent(ForgotPasswordForm);
      fixture.detectChanges();
      const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

      const instance = fixture.componentInstance as unknown as ForgotPasswordFormTestApi;
      instance.form.controls.email.setValue('test@example.com');
      fixture.detectChanges();

      const formElement: HTMLFormElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('form');
      formElement?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });
});
