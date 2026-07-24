import { TestBed } from '@angular/core/testing';
import { RegisterForm } from '../register-form.component';

describe('RegisterForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const createFixture = () => {
    const fixture = TestBed.createComponent(RegisterForm);
    fixture.detectChanges();
    return fixture;
  };

  it('should render the registration fields', () => {
    const fixture = createFixture();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('input#firstName')).toBeTruthy();
    expect(host.querySelector('input#lastName')).toBeTruthy();
    expect(host.querySelector('input#email')).toBeTruthy();
    expect(host.querySelector('p-password#password')).toBeTruthy();
    expect(host.querySelector('p-password#confirmPassword')).toBeTruthy();
  });

  it('should show required errors for firstName and lastName once touched', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const firstName = host.querySelector<HTMLInputElement>('input#firstName');
    const lastName = host.querySelector<HTMLInputElement>('input#lastName');

    firstName?.dispatchEvent(new Event('focus'));
    firstName?.dispatchEvent(new Event('blur'));
    lastName?.dispatchEvent(new Event('focus'));
    lastName?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('First name is required.');
    expect(host.textContent).toContain('Last name is required.');
  });

  it('should show a required error for a missing email', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const email = host.querySelector<HTMLInputElement>('input#email');

    email?.dispatchEvent(new Event('focus'));
    email?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('Email is required.');
  });

  it('should show an invalid-email error for a malformed address', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const email = host.querySelector<HTMLInputElement>('input#email');

    if (email) email.value = 'not-an-email';
    email?.dispatchEvent(new Event('input'));
    email?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('Please enter a valid email address.');
  });

  it('should show a required error for a missing password', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component['form'].controls.password.markAsTouched();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Password is required.');
  });

  it('should show the weak-password hint for a password that does not meet complexity', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component['form'].controls.password.setValue('weakpassword');
    component['form'].controls.password.markAsTouched();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain(
      'Use at least 8 characters with upper- and lowercase letters, a digit, and a special character.',
    );
  });

  it('should show a required error for a missing password confirmation', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component['form'].controls.confirmPassword.markAsTouched();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Please confirm your password.');
  });

  it('should show a mismatch error when passwords do not match', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component['form'].controls.password.setValue('GoodP@ssw0rd!');
    component['form'].controls.confirmPassword.setValue('OtherP@ssw0rd!');
    component['form'].controls.confirmPassword.markAsTouched();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Passwords do not match.');
  });

  it('should not emit submitted when the form is invalid', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit submitted with the form values (without confirmPassword) when valid', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    component['form'].setValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'GoodP@ssw0rd!',
      confirmPassword: 'GoodP@ssw0rd!',
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(emitSpy).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'GoodP@ssw0rd!',
    });
  });

  it('should disable the form and show the loading submit button while loading', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const firstName = host.querySelector<HTMLInputElement>('input#firstName');
    expect(firstName?.disabled).toBe(true);
    const submitButton = host.querySelector('p-button[type="submit"] button');
    expect(submitButton?.hasAttribute('disabled')).toBe(true);
  });
});
