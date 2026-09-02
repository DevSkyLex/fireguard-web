import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OtpForm } from '../otp-form.component';

/**
 * Types into the real input `brn-input-otp` keeps behind its slots — the slots
 * themselves render characters, they do not receive them.
 */
async function typeCode(fixture: ComponentFixture<OtpForm>, value: string): Promise<void> {
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits the form the way the browser does.
 */
async function submit(fixture: ComponentFixture<OtpForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('OtpForm', () => {
  let fixture: ComponentFixture<OtpForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OtpForm);
    await fixture.whenStable();
  });

  it('should render one slot per digit of the code', () => {
    const slots = fixture.nativeElement.querySelectorAll('hlm-input-otp-slot');

    expect(slots.length).toBe(6);
  });

  it('should offer the code to a phone through the one-time-code hint', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
  });

  it('should not emit an empty code', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter the verification code');
  });

  it('should reject a code shorter than six digits', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await typeCode(fixture, '12345');
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should emit a well-formed code', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await typeCode(fixture, '123456');
    await submit(fixture);

    expect(submitted).toHaveBeenCalledWith({ code: '123456', trustDevice: false });
  });

  it('should hide the trust-device control by default', () => {
    // Registration and password-reset verification have no session to bind a
    // device to; only the MFA page turns the control on.
    expect(fixture.nativeElement.querySelector('[data-testid="otp-trust-device"]')).toBeNull();
  });

  it('should emit the trust intent when the control is shown and checked', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentRef.setInput('showTrustDevice', true);
    await fixture.whenStable();

    const checkbox = fixture.nativeElement.querySelector(
      '[data-testid="otp-trust-device"]',
    ) as HTMLElement;
    expect(checkbox).not.toBeNull();
    checkbox.click();
    await fixture.whenStable();

    await typeCode(fixture, '123456');
    await submit(fixture);

    expect(submitted).toHaveBeenCalledWith({ code: '123456', trustDevice: true });
  });

  it('should hide the resend control by default', () => {
    // Only the submit control: an authenticator challenge has no delivery to
    // repeat, so the resend is opt-in rather than opt-out.
    const buttons = fixture.nativeElement.querySelectorAll('button');

    expect(buttons.length).toBe(1);
  });

  it('should render the server error message when verification failed', async () => {
    fixture.componentRef.setInput('serverError', {
      error: new Error('Invalid code.'),
      message: 'Invalid code.',
      code: 400,
      retryable: false,
      timestamp: Date.now(),
    });
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector(
      '[data-testid="otp-server-error"]',
    ) as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Invalid code.');
  });

  it('should render no server error region while nothing has failed', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="otp-server-error"]')).toBeNull();
  });

  it('should disable the resend control and name the wait during a cooldown', async () => {
    fixture.componentRef.setInput('showResend', true);
    fixture.componentRef.setInput('resendAvailableIn', 30);
    await fixture.whenStable();

    const resendButton = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;
    const cooldown = fixture.nativeElement.querySelector(
      '[data-testid="otp-resend-cooldown"]',
    ) as HTMLElement;

    expect(resendButton.disabled).toBe(true);
    expect(cooldown.textContent).toContain('Resend available in 30s');
  });

  it('should re-enable the resend control when the cooldown is reseeded to zero', async () => {
    fixture.componentRef.setInput('showResend', true);
    fixture.componentRef.setInput('resendAvailableIn', 30);
    await fixture.whenStable();
    fixture.componentRef.setInput('resendAvailableIn', 0);
    await fixture.whenStable();

    const resendButton = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;

    expect(resendButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="otp-resend-cooldown"]')).toBeNull();
  });

  it('should tick the cooldown down once per second', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      fixture.componentRef.setInput('showResend', true);
      fixture.componentRef.setInput('resendAvailableIn', 2);
      await fixture.whenStable();

      vi.advanceTimersByTime(1000);
      await fixture.whenStable();
      expect(
        (fixture.nativeElement.querySelector('[data-testid="otp-resend-cooldown"]') as HTMLElement)
          .textContent,
      ).toContain('Resend available in 1s');

      vi.advanceTimersByTime(1000);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[data-testid="otp-resend-cooldown"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should emit a resend request when the control is shown and used', async () => {
    const resent = vi.fn();
    fixture.componentInstance.resent.subscribe(resent);
    fixture.componentRef.setInput('showResend', true);
    await fixture.whenStable();

    const resendButton = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;
    resendButton.click();
    await fixture.whenStable();

    expect(resent).toHaveBeenCalledTimes(1);
  });
});
