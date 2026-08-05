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

    // The form emits what it edits; dropping `confirmPassword` for the API is
    // the page's job, not this component's.
    expect(submitted).toHaveBeenCalledWith(VALID);
  });
});
