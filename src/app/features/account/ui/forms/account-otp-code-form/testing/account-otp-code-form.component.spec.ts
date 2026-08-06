import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountOtpCodeForm } from '../account-otp-code-form.component';

/**
 * Types into the single input `brn-input-otp` keeps behind its slots.
 */
async function type(fixture: ComponentFixture<AccountOtpCodeForm>, value: string): Promise<void> {
  const input = fixture.nativeElement.querySelector('#totp-confirm') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits the form the way the button does.
 */
async function submit(fixture: ComponentFixture<AccountOtpCodeForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('AccountOtpCodeForm', () => {
  let fixture: ComponentFixture<AccountOtpCodeForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountOtpCodeForm);
    fixture.componentRef.setInput('inputId', 'totp-confirm');
    fixture.componentRef.setInput('submitLabel', 'Turn on');
    await fixture.whenStable();
  });

  it('should use the id it was given, so two instances can coexist', () => {
    expect(fixture.nativeElement.querySelector('#totp-confirm')).not.toBeNull();
  });

  it('should label the confirm control from its input', () => {
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.textContent?.trim()).toBe('Turn on');
  });

  it('should not emit an empty code', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter the code');
  });

  it('should not emit a code shorter than six digits', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '12345');
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
  });

  it('should emit the bare code', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '123456');
    await submit(fixture);

    // One field, one value: wrapping it in an object buys the caller nothing.
    expect(submitted).toHaveBeenCalledWith('123456');
  });

  it('should clear the field on reset so a rejected code is not deleted by hand', async () => {
    await type(fixture, '123456');

    fixture.componentInstance.reset();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('#totp-confirm') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should emit cancellation', async () => {
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);

    (
      fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement
    ).dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(cancelled).toHaveBeenCalled();
  });

  it('should read as destructive when the code is proving the right to switch off', async () => {
    fixture.componentRef.setInput('destructive', true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.className).toContain('destructive');
  });
});
