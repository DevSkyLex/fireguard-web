import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountPasswordForm } from '../account-password-form.component';

/**
 * Types into one field and lets Signal Forms observe the change.
 */
async function type(
  fixture: ComponentFixture<AccountPasswordForm>,
  selector: string,
  value: string,
): Promise<void> {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits whichever step is on screen.
 */
async function submit(fixture: ComponentFixture<AccountPasswordForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('AccountPasswordForm', () => {
  let fixture: ComponentFixture<AccountPasswordForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'request');
    await fixture.whenStable();
  });

  describe('request step', () => {
    it('should ask only for the current password', () => {
      const element: HTMLElement = fixture.nativeElement;

      expect(element.querySelector('#account-current-password')).not.toBeNull();
      expect(element.querySelector('#account-new-password')).toBeNull();
    });

    it('should not emit when the field is empty', async () => {
      const requested = vi.fn();
      fixture.componentInstance.requested.subscribe(requested);

      await submit(fixture);

      expect(requested).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Enter your current password');
    });

    it('should emit the current password', async () => {
      const requested = vi.fn();
      fixture.componentInstance.requested.subscribe(requested);

      await type(fixture, '#account-current-password', 'Old!Passw0rd');
      await submit(fixture);

      expect(requested).toHaveBeenCalledWith('Old!Passw0rd');
    });
  });

  describe('verify step', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('step', 'verify');
      fixture.componentRef.setInput('maskedRecipient', 'a***a@example.com');
      await fixture.whenStable();
    });

    it('should name the inbox the code went to', () => {
      expect(fixture.nativeElement.textContent).toContain('a***a@example.com');
    });

    it('should warn that other sessions end before the button is reached', () => {
      expect(fixture.nativeElement.textContent).toContain('signs you out everywhere else');
    });

    it('should refuse a new password that fails the policy', async () => {
      const confirmed = vi.fn();
      fixture.componentInstance.confirmed.subscribe(confirmed);

      await type(fixture, '#account-password-code', '123456');
      await type(fixture, '#account-new-password', 'weak');
      await type(fixture, '#account-confirm-password', 'weak');
      await submit(fixture);

      expect(confirmed).not.toHaveBeenCalled();
    });

    it('should refuse a confirmation that does not repeat the password', async () => {
      const confirmed = vi.fn();
      fixture.componentInstance.confirmed.subscribe(confirmed);

      await type(fixture, '#account-password-code', '123456');
      await type(fixture, '#account-new-password', 'Str0ng!Passw0rd');
      await type(fixture, '#account-confirm-password', 'Str0ng!Passw0rd2');
      await submit(fixture);

      expect(confirmed).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('do not match');
    });

    it('should refuse a code that is not six digits', async () => {
      const confirmed = vi.fn();
      fixture.componentInstance.confirmed.subscribe(confirmed);

      await type(fixture, '#account-password-code', '12345');
      await type(fixture, '#account-new-password', 'Str0ng!Passw0rd');
      await type(fixture, '#account-confirm-password', 'Str0ng!Passw0rd');
      await submit(fixture);

      expect(confirmed).not.toHaveBeenCalled();
    });

    it('should emit the code and the new password, without the confirmation', async () => {
      const confirmed = vi.fn();
      fixture.componentInstance.confirmed.subscribe(confirmed);

      await type(fixture, '#account-password-code', '123456');
      await type(fixture, '#account-new-password', 'Str0ng!Passw0rd');
      await type(fixture, '#account-confirm-password', 'Str0ng!Passw0rd');
      await submit(fixture);

      // `confirmPassword` is a form concern; the API contract has two fields.
      expect(confirmed).toHaveBeenCalledWith({
        code: '123456',
        newPassword: 'Str0ng!Passw0rd',
      });
    });

    it('should clear both steps when starting over', async () => {
      const restarted = vi.fn();
      fixture.componentInstance.restarted.subscribe(restarted);

      await type(fixture, '#account-new-password', 'Str0ng!Passw0rd');
      // Addressed by test id rather than by `button[type="button"]`: each
      // password field carries its own reveal toggle, which that selector hits
      // first.
      (
        fixture.nativeElement.querySelector(
          '[data-testid="account-password-start-over"]',
        ) as HTMLButtonElement
      ).dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(restarted).toHaveBeenCalled();

      // A password typed into a form that is no longer live has no reason to
      // survive the reset.
      const field = fixture.nativeElement.querySelector(
        '#account-new-password',
      ) as HTMLInputElement | null;
      expect(field?.value ?? '').toBe('');
    });
  });

  describe('success step', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('step', 'success');
      await fixture.whenStable();
    });

    it('should report the outcome and offer another change', () => {
      expect(fixture.nativeElement.textContent).toContain('has been changed');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  });
});
