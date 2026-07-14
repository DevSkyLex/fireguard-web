import { TestBed } from '@angular/core/testing';
import { FeedbackService } from '@core/feedback';
import type { UserProfileOutput, SetupTotpOutput } from '@features/account/models';
import { AccountTotpEnrollmentStore, UserStore } from '@features/account/state';
import { AccountMfaPanel } from '../account-mfa-panel.component';

type AccountMfaPanelTestApi = AccountMfaPanel & {
  generate(): void;
  confirm(): void;
  disable(): void;
  startDisable(): void;
  cancelDisable(): void;
  cancelSetup(): void;
  copySecret(): void;
  copyUri(): void;
  groupedSecret: () => string | null;
  totpStatus: () => { label: string; severity: string };
  totpEnabled: () => boolean;
  confirmCode: { setValue(value: string): void; value: string };
  disableCode: { setValue(value: string): void; value: string };
  showDisableForm: () => boolean;
};

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
      setupError?: () => { message: string } | null;
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
      providers: [
        { provide: AccountTotpEnrollmentStore, useValue: mockStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: FeedbackService, useValue: mockFeedback },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new AccountMfaPanel(),
    ) as unknown as AccountMfaPanelTestApi;
    return { component, mockStore, mockFeedback };
  };

  describe('not set up', () => {
    it('should resolve the "not set up" status and request a new key on generate', () => {
      const { component, mockStore } = setup();

      expect(component.totpStatus().label).toBe('Not set up');

      component.generate();

      expect(mockStore.setup).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending confirmation', () => {
    it('should resolve the "pending confirmation" status once a secret is generated', () => {
      const { component } = setup({ setupResult: () => buildResult() });

      expect(component.totpStatus().label).toBe('Pending confirmation');
    });

    it('should format the generated secret into 4-character groups', () => {
      const { component } = setup({ setupResult: () => buildResult() });

      expect(component.groupedSecret()).toBe('JBSW Y3DP EHPK 3PXP');
    });

    it('should confirm with the entered code', () => {
      const { component, mockStore } = setup({ setupResult: () => buildResult() });
      component.confirmCode.setValue('123456');

      component.confirm();

      expect(mockStore.confirm).toHaveBeenCalledWith('123456');
    });

    it('should not confirm with an invalid code', () => {
      const { component, mockStore } = setup({ setupResult: () => buildResult() });
      component.confirmCode.setValue('12');

      component.confirm();

      expect(mockStore.confirm).not.toHaveBeenCalled();
    });

    it('should cancel the pending setup', () => {
      const { component, mockStore } = setup({ setupResult: () => buildResult() });

      component.cancelSetup();

      expect(mockStore.cancelSetup).toHaveBeenCalledTimes(1);
    });

    it('should copy the secret and confirm with a success toast', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      const { component, mockFeedback } = setup({ setupResult: () => buildResult() });

      component.copySecret();
      await Promise.resolve();

      expect(writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
      expect(mockFeedback.success).toHaveBeenCalledTimes(1);
    });

    it('should notify a copy failure when the clipboard API is unavailable', () => {
      Object.assign(navigator, { clipboard: undefined });
      const { component, mockFeedback } = setup({ setupResult: () => buildResult() });

      component.copyUri();

      expect(mockFeedback.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('active', () => {
    it('should resolve the "active" status when TOTP is enabled', () => {
      const { component } = setup({}, true);

      expect(component.totpStatus().label).toBe('Active');
    });

    it('should reveal the disable form on request', () => {
      const { component } = setup({}, true);

      expect(component.showDisableForm()).toBe(false);
      component.startDisable();
      expect(component.showDisableForm()).toBe(true);
    });

    it('should disable with the entered current code', () => {
      const { component, mockStore } = setup({}, true);
      component.startDisable();
      component.disableCode.setValue('654321');

      component.disable();

      expect(mockStore.disable).toHaveBeenCalledWith('654321');
    });

    it('should not disable with an invalid code', () => {
      const { component, mockStore } = setup({}, true);
      component.startDisable();
      component.disableCode.setValue('abc');

      component.disable();

      expect(mockStore.disable).not.toHaveBeenCalled();
    });

    it('should hide the disable form on cancel', () => {
      const { component } = setup({}, true);
      component.startDisable();

      component.cancelDisable();

      expect(component.showDisableForm()).toBe(false);
    });
  });

  describe('code error messages', () => {
    it('should surface an invalid-code message for a 422 confirm error', () => {
      const { component } = setup({
        setupResult: () => buildResult(),
        confirmError: () => ({ message: null, code: 422 }),
      });

      expect(
        (
          component as unknown as { confirmErrorMessage: () => string | null }
        ).confirmErrorMessage(),
      ).toBe('Invalid or expired code.');
    });

    it('should surface a rate-limit message for a 429 disable error', () => {
      const { component } = setup({ disableError: () => ({ message: null, code: 429 }) }, true);

      expect(
        (
          component as unknown as { disableErrorMessage: () => string | null }
        ).disableErrorMessage(),
      ).toBe('Too many attempts. Please wait a moment before trying again.');
    });
  });
});
