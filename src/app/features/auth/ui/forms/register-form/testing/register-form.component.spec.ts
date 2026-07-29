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

  it('should pre-fill the email when the caller already knows it', () => {
    const fixture = TestBed.createComponent(RegisterForm);
    fixture.componentRef.setInput('email', 'bob@example.com');
    fixture.detectChanges();

    const email: HTMLInputElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'input#email',
    );

    // An invitation names its recipient; retyping it is how the addresses end
    // up mismatched.
    expect(email?.value).toBe('bob@example.com');
  });

  it('should leave the email empty when none is supplied', () => {
    const fixture = createFixture();

    const email: HTMLInputElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'input#email',
    );

    expect(email?.value).toBe('');
  });

  it('should render the registration fields', () => {
    const fixture = createFixture();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('input#firstName')).toBeTruthy();
    expect(host.querySelector('input#lastName')).toBeTruthy();
    expect(host.querySelector('input#email')).toBeTruthy();
    // `inputId`, not `id`: PrimeNG binds it on the inner <input>, whereas `id` lands
    // on the <p-password> host — an element <label for> cannot be associated with.
    expect(host.querySelector('input#password')).toBeTruthy();
    expect(host.querySelector('input#confirmPassword')).toBeTruthy();
  });

  it('should associate every label with a real form control', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    const labels = [...host.querySelectorAll<HTMLLabelElement>('label[for]')];
    expect(labels.length).toBeGreaterThan(0);

    for (const label of labels) {
      const target = host.querySelector(`#${label.htmlFor}`);
      expect(target, `label[for="${label.htmlFor}"] points at nothing`).toBeTruthy();
      expect(
        target?.tagName.toLowerCase(),
        `label[for="${label.htmlFor}"] must target a labelable control`,
      ).toMatch(/^(input|select|textarea)$/);
    }
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
