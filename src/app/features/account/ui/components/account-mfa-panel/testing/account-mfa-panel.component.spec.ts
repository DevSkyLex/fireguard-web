import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SetupTotpOutput } from '@features/account/models';
import { AccountMfaPanel } from '../account-mfa-panel.component';

const SETUP: SetupTotpOutput = {
  '@id': '/api/otp/totp/setup',
  '@type': 'Totp',
  secret: 'JBSWY3DPEHPK3PXP',
  qrCodeUri: 'otpauth://totp/FireGuard:ada@example.com?secret=JBSWY3DPEHPK3PXP&issuer=FireGuard',
};

describe('AccountMfaPanel', () => {
  let fixture: ComponentFixture<AccountMfaPanel>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountMfaPanel);
    await fixture.whenStable();
  });

  describe('not set up', () => {
    it('should say two-factor is off and offer to set it up', () => {
      const element: HTMLElement = fixture.nativeElement;

      // The word, not only the badge colour — a monochrome reader gets the
      // same answer.
      expect(element.textContent).toContain('Off');
      expect(element.querySelector('[data-testid="account-mfa-setup"]')).not.toBeNull();
    });

    it('should show neither the key nor a code field', () => {
      const element: HTMLElement = fixture.nativeElement;

      expect(element.querySelector('[data-testid="account-mfa-secret"]')).toBeNull();
      expect(element.querySelector('#account-mfa-confirm-code')).toBeNull();
    });

    it('should emit when set-up is asked for', async () => {
      const setupRequested = vi.fn();
      fixture.componentInstance.setupRequested.subscribe(setupRequested);

      (
        fixture.nativeElement.querySelector(
          '[data-testid="account-mfa-setup"]',
        ) as HTMLButtonElement
      ).dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(setupRequested).toHaveBeenCalled();
    });
  });

  describe('pending confirmation', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('setupResult', SETUP);
      await fixture.whenStable();
    });

    it('should print the key in transcribable blocks', () => {
      const secret = fixture.nativeElement.querySelector(
        '[data-testid="account-mfa-secret"]',
      ) as HTMLElement;

      // Grouped by four: this is the fallback when the camera is not an
      // option, so it has to be readable by a human.
      expect(secret.textContent?.trim()).toBe('JBSW Y3DP EHPK 3PXP');
    });

    it('should ask for the activation code', () => {
      expect(fixture.nativeElement.querySelector('#account-mfa-confirm-code')).not.toBeNull();
    });

    it('should still offer no set-up button while one is pending', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="account-mfa-setup"]')).toBeNull();
    });

    it('should emit cancellation', async () => {
      const cancelled = vi.fn();
      fixture.componentInstance.cancelled.subscribe(cancelled);

      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      );
      buttons
        .find((button): boolean => button.textContent?.includes('Cancel') === true)
        ?.dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(cancelled).toHaveBeenCalled();
    });
  });

  describe('active', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('totpEnabled', true);
      await fixture.whenStable();
    });

    it('should say two-factor is on and offer to turn it off', () => {
      const element: HTMLElement = fixture.nativeElement;

      expect(element.textContent).toContain('On');
      expect(element.querySelector('[data-testid="account-mfa-disable"]')).not.toBeNull();
    });

    it('should ask for a code before switching off', async () => {
      expect(fixture.nativeElement.querySelector('#account-mfa-disable-code')).toBeNull();

      (
        fixture.nativeElement.querySelector(
          '[data-testid="account-mfa-disable"]',
        ) as HTMLButtonElement
      ).dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('#account-mfa-disable-code')).not.toBeNull();
    });

    it('should keep showing as active while a pending key also exists', async () => {
      // `totpEnabled` is the only authority. A stale `setupResult` left over
      // from an earlier attempt must not make an active enrollment look
      // unconfirmed.
      fixture.componentRef.setInput('setupResult', SETUP);
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('#account-mfa-confirm-code')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('On');
    });

    it('should close the switch-off step once two-factor is actually off', async () => {
      (
        fixture.nativeElement.querySelector(
          '[data-testid="account-mfa-disable"]',
        ) as HTMLButtonElement
      ).dispatchEvent(new Event('click'));
      await fixture.whenStable();

      fixture.componentRef.setInput('totpEnabled', false);
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('#account-mfa-disable-code')).toBeNull();
    });
  });
});
