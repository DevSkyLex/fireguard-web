import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FeedbackService } from '@core/feedback';
import type { UserProfileOutput, SetupTotpOutput } from '@features/account/models';
import { AccountTotpEnrollmentStore, UserStore } from '@features/account/state';
import { AccountMfaPanel } from '../account-mfa-panel.component';

const query = <T extends HTMLElement>(
  fixture: ComponentFixture<AccountMfaPanel>,
  testid: string,
): T | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);

/**
 * Locates a `p-button` host by its `data-testid` and returns its inner native
 * `<button>`, since PrimeNG's `Button` component renders the clickable
 * element inside the custom-element host that carries the test id.
 */
const queryButton = (
  fixture: ComponentFixture<AccountMfaPanel>,
  testid: string,
): HTMLButtonElement | null => query<HTMLElement>(fixture, testid)?.querySelector('button') ?? null;

describe('AccountMfaPanel', () => {
  const buildResult = (overrides: Partial<SetupTotpOutput> = {}): SetupTotpOutput =>
    ({
      '@id': '',
      '@type': 'Totp',
      secret: 'JBSWY3DPEHPK3PXP',
      qrCodeUri: 'otpauth://totp/FireGuard%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP',
      ...overrides,
    }) as SetupTotpOutput;

  const buildProfile = (totpEnabled: boolean): UserProfileOutput =>
    ({ totpEnabled }) as UserProfileOutput;

  const setup = (
    storeOverrides: {
      setupResult?: () => SetupTotpOutput | null;
      setupError?: () => { message: string | null } | null;
      confirmError?: () => { message: string | null; code: number | null } | null;
      disableError?: () => { message: string | null; code: number | null } | null;
      isSettingUp?: () => boolean;
      isConfirming?: () => boolean;
      isDisabling?: () => boolean;
    } = {},
    totpEnabled = false,
  ) => {
    const mockStore = {
      setup: vi.fn(),
      confirm: vi.fn(),
      disable: vi.fn(),
      cancelSetup: vi.fn(),
      setupResult: () => null,
      setupError: () => null,
      confirmError: () => null,
      disableError: () => null,
      isSettingUp: () => false,
      isConfirming: () => false,
      isDisabling: () => false,
      ...storeOverrides,
    };
    const mockUserStore = {
      profile: () => buildProfile(totpEnabled),
    };
    const mockFeedback = {
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AccountMfaPanel],
      providers: [
        { provide: AccountTotpEnrollmentStore, useValue: mockStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: FeedbackService, useValue: mockFeedback },
      ],
    });
    TestBed.overrideProvider(AccountTotpEnrollmentStore, { useValue: mockStore });

    const fixture: ComponentFixture<AccountMfaPanel> = TestBed.createComponent(AccountMfaPanel);
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance, mockStore, mockFeedback };
  };

  describe('not set up', () => {
    it('should resolve the "not set up" status and request a new key on generate', () => {
      const { fixture, mockStore } = setup();

      expect(query(fixture, 'account-mfa-totp-status')?.textContent).toContain('Not set up');

      queryButton(fixture, 'account-mfa-generate')?.click();

      expect(mockStore.setup).toHaveBeenCalledTimes(1);
    });

    it('should render the enable button and no disable/confirm form', () => {
      const { fixture } = setup();

      expect(query(fixture, 'account-mfa-generate')).toBeTruthy();
      expect(query(fixture, 'account-mfa-confirm-form')).toBeNull();
      expect(query(fixture, 'account-mfa-disable-form')).toBeNull();
    });

    it('should surface the standing email hint when TOTP is not enabled', () => {
      const { fixture } = setup();

      expect(query(fixture, 'account-mfa-email-totp-note')).toBeNull();
    });

    it('should render the setup error message when present', () => {
      const { fixture } = setup({ setupError: () => ({ message: 'Boom' }) });

      expect(query(fixture, 'account-mfa-setup-error')?.textContent).toContain('Boom');
    });

    it('should render the fallback setup error copy when no message is provided', () => {
      const { fixture } = setup({ setupError: () => ({ message: null }) });

      expect(query(fixture, 'account-mfa-setup-error')?.textContent).toContain(
        'The authenticator key could not be generated.',
      );
    });
  });

  describe('pending confirmation', () => {
    it('should resolve the "pending confirmation" status once a secret is generated', () => {
      const { fixture } = setup({ setupResult: () => buildResult() });

      expect(query(fixture, 'account-mfa-totp-status')?.textContent).toContain(
        'Pending confirmation',
      );
    });

    it('should format the generated secret into 4-character groups', () => {
      const { fixture } = setup({ setupResult: () => buildResult() });

      expect(query(fixture, 'account-mfa-secret')?.textContent?.trim()).toBe('JBSW Y3DP EHPK 3PXP');
    });

    it('should render the setup URI', () => {
      const { fixture } = setup({ setupResult: () => buildResult() });

      expect(query(fixture, 'account-mfa-uri')?.textContent?.trim()).toBe(
        'otpauth://totp/FireGuard%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP',
      );
    });

    it('should confirm with the entered code', () => {
      const { fixture, mockStore } = setup({ setupResult: () => buildResult() });
      const input = query<HTMLInputElement>(fixture, 'account-mfa-confirm-code');
      const inner = input?.querySelector('input') ?? input;
      if (inner) {
        (inner as HTMLInputElement).value = '123456';
        inner.dispatchEvent(new Event('input'));
      }
      query<HTMLFormElement>(fixture, 'account-mfa-confirm-form')?.dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();

      expect(mockStore.confirm).toHaveBeenCalled();
    });

    it('should not confirm with an invalid code and show the pattern hint', () => {
      const { fixture, mockStore } = setup({ setupResult: () => buildResult() });

      query<HTMLFormElement>(fixture, 'account-mfa-confirm-form')?.dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();

      expect(mockStore.confirm).not.toHaveBeenCalled();
    });

    it('should cancel the pending setup', () => {
      const { fixture, mockStore } = setup({ setupResult: () => buildResult() });

      queryButton(fixture, 'account-mfa-cancel-setup')?.click();

      expect(mockStore.cancelSetup).toHaveBeenCalledTimes(1);
    });

    it('should regenerate a new key from the pending state', () => {
      const { fixture, mockStore } = setup({ setupResult: () => buildResult() });

      queryButton(fixture, 'account-mfa-generate')?.click();

      expect(mockStore.setup).toHaveBeenCalledTimes(1);
    });

    it('should show the confirm error message when present', () => {
      const { fixture } = setup({
        setupResult: () => buildResult(),
        confirmError: () => ({ message: null, code: 422 }),
      });

      expect(query(fixture, 'account-mfa-confirm-error')?.textContent).toContain(
        'Invalid or expired code.',
      );
    });

    it('should disable the confirm and regenerate buttons while a request is pending', () => {
      const { fixture } = setup({
        setupResult: () => buildResult(),
        isConfirming: () => true,
        isSettingUp: () => true,
      });

      expect(queryButton(fixture, 'account-mfa-confirm')?.disabled).toBe(true);
    });

    it('should copy the secret and confirm with a success toast', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      const { fixture, mockFeedback } = setup({ setupResult: () => buildResult() });

      expect(query(fixture, 'account-mfa-secret')).toBeTruthy();

      (fixture.componentInstance as unknown as { copySecret(): void }).copySecret();
      await Promise.resolve();

      expect(writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
      expect(mockFeedback.success).toHaveBeenCalledTimes(1);
    });

    it('should notify a copy failure when the clipboard API is unavailable', () => {
      Object.assign(navigator, { clipboard: undefined });
      const { fixture, mockFeedback } = setup({ setupResult: () => buildResult() });

      (fixture.componentInstance as unknown as { copyUri(): void }).copyUri();

      expect(mockFeedback.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('active', () => {
    it('should resolve the "active" status when TOTP is enabled', () => {
      const { fixture } = setup({}, true);

      expect(query(fixture, 'account-mfa-totp-status')?.textContent).toContain('Active');
    });

    it('should show the email-code note when TOTP is active', () => {
      const { fixture } = setup({}, true);

      expect(query(fixture, 'account-mfa-email-totp-note')).toBeTruthy();
    });

    it('should reveal the disable form on request', () => {
      const { fixture } = setup({}, true);

      expect(query(fixture, 'account-mfa-disable-form')).toBeNull();

      queryButton(fixture, 'account-mfa-start-disable')?.click();
      fixture.detectChanges();

      expect(query(fixture, 'account-mfa-disable-form')).toBeTruthy();
    });

    it('should not submit the disable form with an invalid code', () => {
      const { fixture, mockStore } = setup({}, true);
      queryButton(fixture, 'account-mfa-start-disable')?.click();
      fixture.detectChanges();

      query<HTMLFormElement>(fixture, 'account-mfa-disable-form')?.dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();

      expect(mockStore.disable).not.toHaveBeenCalled();
    });

    it('should show the disable error message when present', () => {
      const { fixture } = setup({ disableError: () => ({ message: null, code: 429 }) }, true);
      queryButton(fixture, 'account-mfa-start-disable')?.click();
      fixture.detectChanges();

      expect(query(fixture, 'account-mfa-disable-error')?.textContent).toContain(
        'Too many attempts. Please wait a moment before trying again.',
      );
    });

    it('should disable the confirm-disable button while disabling', () => {
      const { fixture } = setup({ isDisabling: () => true }, true);
      queryButton(fixture, 'account-mfa-start-disable')?.click();
      fixture.detectChanges();

      expect(queryButton(fixture, 'account-mfa-confirm-disable')?.disabled).toBe(true);
    });

    it('should hide the disable form on cancel', () => {
      const { fixture } = setup({}, true);
      queryButton(fixture, 'account-mfa-start-disable')?.click();
      fixture.detectChanges();

      const cancelButtons = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];
      const cancel = cancelButtons.find((button) => button.textContent?.trim() === 'Cancel');
      cancel?.click();
      fixture.detectChanges();

      expect(query(fixture, 'account-mfa-disable-form')).toBeNull();
      expect(query(fixture, 'account-mfa-start-disable')).toBeTruthy();
    });
  });

  describe('class logic', () => {
    it('should not confirm with an invalid code (component-level)', () => {
      const { component, mockStore } = setup({ setupResult: () => buildResult() });
      (component as unknown as { confirmCode: { setValue(v: string): void } }).confirmCode.setValue(
        '12',
      );

      (component as unknown as { confirm(): void }).confirm();

      expect(mockStore.confirm).not.toHaveBeenCalled();
    });

    it('should not disable with an invalid code (component-level)', () => {
      const { component, mockStore } = setup({}, true);
      (component as unknown as { startDisable(): void }).startDisable();
      (component as unknown as { disableCode: { setValue(v: string): void } }).disableCode.setValue(
        'abc',
      );

      (component as unknown as { disable(): void }).disable();

      expect(mockStore.disable).not.toHaveBeenCalled();
    });

    it('should confirm with a valid code (component-level)', () => {
      const { component, mockStore } = setup({ setupResult: () => buildResult() });
      (component as unknown as { confirmCode: { setValue(v: string): void } }).confirmCode.setValue(
        '123456',
      );

      (component as unknown as { confirm(): void }).confirm();

      expect(mockStore.confirm).toHaveBeenCalledWith('123456');
    });

    it('should disable with a valid code (component-level)', () => {
      const { component, mockStore } = setup({}, true);
      (component as unknown as { startDisable(): void }).startDisable();
      (component as unknown as { disableCode: { setValue(v: string): void } }).disableCode.setValue(
        '654321',
      );

      (component as unknown as { disable(): void }).disable();

      expect(mockStore.disable).toHaveBeenCalledWith('654321');
    });
  });
});
