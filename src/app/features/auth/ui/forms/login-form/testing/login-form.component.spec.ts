import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginForm } from '../login-form.component';
import type { LoginFormValues } from '../models';

/**
 * Types the value of one field and lets Signal Forms observe the change, the
 * way a user typing does.
 */
async function type(
  fixture: ComponentFixture<LoginForm>,
  selector: string,
  value: string,
): Promise<void> {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(LoginForm);
    await fixture.whenStable();
  });

  it('should render the credential fields', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#login-email')).not.toBeNull();
    expect(element.querySelector('#login-password')).not.toBeNull();
  });

  it('should not emit when the form is empty', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should surface the failing rules once submission touches the form', async () => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();

    // The messages only appear after the fields are touched, which is what
    // submitting an untouched form is for.
    expect(fixture.nativeElement.textContent).toContain('Enter your email address');
    expect(fixture.nativeElement.textContent).toContain('Enter your password');
  });

  it('should not emit when the address is malformed', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#login-email', 'not-an-address');
    await type(fixture, '#login-password', 'whatever');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should emit the typed credentials when the form is valid', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#login-email', 'ada@example.com');
    await type(fixture, '#login-password', 'Str0ng!Passw0rd');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();

    expect(submitted).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      rememberMe: false,
    } satisfies LoginFormValues);
  });

  it('should disable submission while a sign-in attempt is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(submit.disabled).toBe(true);
  });

  it('should render the server error message when a sign-in attempt failed', async () => {
    fixture.componentRef.setInput('serverError', {
      error: new Error('Invalid credentials.'),
      message: 'Invalid credentials.',
      code: 401,
      retryable: false,
      timestamp: Date.now(),
    });
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector(
      '[data-testid="login-server-error"]',
    ) as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Invalid credentials.');
  });

  it('should fall back to a generic sentence when the server error has no message', async () => {
    fixture.componentRef.setInput('serverError', {
      error: new Error('boom'),
      message: null,
      code: null,
      retryable: false,
      timestamp: Date.now(),
    });
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector(
      '[data-testid="login-server-error"]',
    ) as HTMLElement;

    expect(alert.textContent).toContain('Sign-in failed. Check your credentials.');
  });

  it('should render no server error region while nothing has failed', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="login-server-error"]')).toBeNull();
  });

  it('should mark the email field aria-invalid once it is touched and invalid', async () => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();

    const email = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;

    expect(email.getAttribute('aria-invalid')).toBe('true');
  });

  it('should swap the submit label to the pending wording while signing in', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Signing in…');
  });

  it('should mark the email label required with an aria-hidden asterisk', () => {
    const label = fixture.nativeElement.querySelector(
      'label[for="login-email"]',
    ) as HTMLLabelElement;
    const asterisk = label.querySelector('span[aria-hidden="true"]');

    expect(asterisk?.textContent).toContain('*');
  });
});
