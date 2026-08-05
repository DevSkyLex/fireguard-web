import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NewPasswordForm } from '../new-password-form.component';

/**
 * Types one field and lets Signal Forms observe the change.
 */
async function type(
  fixture: ComponentFixture<NewPasswordForm>,
  selector: string,
  value: string,
): Promise<void> {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits the form the way the browser does.
 */
async function submit(fixture: ComponentFixture<NewPasswordForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('NewPasswordForm', () => {
  let fixture: ComponentFixture<NewPasswordForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(NewPasswordForm);
    await fixture.whenStable();
  });

  it('should not emit when the form is empty', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should not emit when the two entries disagree', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#new-password', 'Str0ng!Passw0rd');
    await type(fixture, '#new-password-confirm', 'Different!Passw0rd');
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('The two passwords do not match');
  });

  it('should apply the same policy as registration', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    // Both entries agree, so only the policy can reject this — which is the
    // point: the reset surface shares registration's validator.
    await type(fixture, '#new-password', 'weak');
    await type(fixture, '#new-password-confirm', 'weak');
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should emit when both entries agree and satisfy the policy', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#new-password', 'Str0ng!Passw0rd');
    await type(fixture, '#new-password-confirm', 'Str0ng!Passw0rd');
    await submit(fixture);

    expect(submitted).toHaveBeenCalledWith({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Str0ng!Passw0rd',
    });
  });
});
