import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { RegisterFormValues } from '../models';
import { RegisterForm } from '../register-form.component';

/**
 * The values a complete, valid registration carries.
 */
const VALID: RegisterFormValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'Str0ng!Passw0rd',
  confirmPassword: 'Str0ng!Passw0rd',
};

/**
 * Types one field and lets Signal Forms observe the change.
 */
async function type(
  fixture: ComponentFixture<RegisterForm>,
  selector: string,
  value: string,
): Promise<void> {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Fills every field, optionally overriding some of them.
 */
async function fill(
  fixture: ComponentFixture<RegisterForm>,
  overrides: Partial<RegisterFormValues> = {},
): Promise<void> {
  const values: RegisterFormValues = { ...VALID, ...overrides };

  await type(fixture, '#register-first-name', values.firstName);
  await type(fixture, '#register-last-name', values.lastName);
  await type(fixture, '#register-email', values.email);
  await type(fixture, '#register-password', values.password);
  await type(fixture, '#register-confirm-password', values.confirmPassword);
}

/**
 * Submits the form the way the browser does.
 */
async function submit(fixture: ComponentFixture<RegisterForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('RegisterForm', () => {
  let fixture: ComponentFixture<RegisterForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(RegisterForm);
    await fixture.whenStable();
  });

  it('should not emit when the form is empty', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should not emit when the confirmation does not repeat the password', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await fill(fixture, { confirmPassword: 'Different!Passw0rd' });
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('The two passwords do not match');
  });

  it('should not emit when the password breaks the policy', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await fill(fixture, { password: 'weak', confirmPassword: 'weak' });
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should emit every typed value, confirmation included, when valid', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await fill(fixture);
    await submit(fixture);

    // The form emits what it edits; dropping `confirmPassword` is the page's job.
    expect(submitted).toHaveBeenCalledWith(VALID);
  });

  it('should render the server error message when account creation failed', async () => {
    fixture.componentRef.setInput('serverError', {
      error: new Error('Email already in use.'),
      message: 'Email already in use.',
      code: 422,
      retryable: false,
      timestamp: Date.now(),
    });
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector(
      '[data-testid="register-server-error"]',
    ) as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Email already in use.');
  });

  it('should render no server error region while nothing has failed', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="register-server-error"]')).toBeNull();
  });

  it('should replace the inline password hint with an accessible requirements popover', () => {
    expect(
      fixture.nativeElement.querySelector('hlm-field-description')?.classList.contains('sr-only'),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('hlm-popover')).not.toBeNull();
  });

  it('should render every password criterion while the password field is focused', async () => {
    const password = fixture.nativeElement.querySelector('#register-password') as HTMLInputElement;

    password.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await fixture.whenStable();

    const menu = document.body.querySelector('[data-slot="popover-content"]') as HTMLElement | null;
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('Password requirements');
    expect(menu?.querySelectorAll('li')).toHaveLength(5);

    password.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await fixture.whenStable();

    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();
  });

  it('should mark the first name field aria-invalid once submission touches it empty', async () => {
    await submit(fixture);

    const firstName = fixture.nativeElement.querySelector(
      '#register-first-name',
    ) as HTMLInputElement;

    expect(firstName.getAttribute('aria-invalid')).toBe('true');
  });

  it('should swap the submit label to the pending wording while registering', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Creating your account…');
  });

  it('should mark the email label required with an aria-hidden asterisk', () => {
    const label = fixture.nativeElement.querySelector(
      'label[for="register-email"]',
    ) as HTMLLabelElement;
    const asterisk = label.querySelector('span[aria-hidden="true"]');

    expect(asterisk?.textContent).toContain('*');
  });
  it('associates the native password input with persistent requirements through Spartan Field', () => {
    const password = fixture.nativeElement.querySelector('#register-password') as HTMLInputElement;
    expect(password.getAttribute('aria-describedby')?.split(' ')).toContain(
      'register-password-requirements-description',
    );
    const description = fixture.nativeElement.querySelector(
      '#register-password-requirements-description',
    ) as HTMLElement;
    expect(description.textContent).toContain('At least 8 characters');
    expect(description.textContent).toContain('An upper case letter');
  });

  it('announces criterion changes without announcing each character or moving input focus', async () => {
    const password = fixture.nativeElement.querySelector('#register-password') as HTMLInputElement;
    const announcement = fixture.nativeElement.querySelector(
      '[data-testid="register-password-requirements-announcement"]',
    ) as HTMLElement;
    password.focus();
    await type(fixture, '#register-password', 'A');
    const firstStatus = announcement.textContent;
    expect(firstStatus).toContain('An upper case letter: Met');
    expect(firstStatus).toContain('A digit: Not met');
    expect(document.activeElement).toBe(password);
    await type(fixture, '#register-password', 'AB');
    expect(announcement.textContent).toBe(firstStatus);
    await type(fixture, '#register-password', 'AB1');
    expect(announcement.textContent).toContain('A digit: Met');
    expect(announcement.textContent).not.toContain('AB1');
    expect(document.activeElement).toBe(password);
    const rows = document.body.querySelectorAll('[data-slot="popover-content"] li');
    expect(Array.from(rows).some((row) => row.textContent?.includes('Not met'))).toBe(true);
    expect(Array.from(rows).some((row) => row.textContent?.includes('Met'))).toBe(true);
  });
});
