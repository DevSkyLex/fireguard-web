import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EmailRequestForm } from '../email-request-form.component';

/**
 * Types the address and lets Signal Forms observe the change.
 */
async function typeEmail(
  fixture: ComponentFixture<EmailRequestForm>,
  value: string,
): Promise<void> {
  const input = fixture.nativeElement.querySelector('#email-request-address') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits the form the way the browser does.
 */
async function submit(fixture: ComponentFixture<EmailRequestForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('EmailRequestForm', () => {
  let fixture: ComponentFixture<EmailRequestForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EmailRequestForm);
    fixture.componentRef.setInput('submitLabel', 'Send reset code');
    await fixture.whenStable();
  });

  it('should render the caller-supplied submit label', () => {
    const submitButton = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(submitButton.textContent?.trim()).toBe('Send reset code');
  });

  it('should not emit an empty address', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter your email address');
  });

  it('should not emit a malformed address', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await typeEmail(fixture, 'not-an-address');
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should emit a well-formed address', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await typeEmail(fixture, 'ada@example.com');
    await submit(fixture);

    expect(submitted).toHaveBeenCalledWith({ email: 'ada@example.com' });
  });
});
