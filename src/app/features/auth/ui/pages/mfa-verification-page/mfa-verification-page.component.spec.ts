import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { UserStore } from '@features/account/state';
import { AuthStore } from '@features/auth/state';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import { MfaVerificationPage } from './mfa-verification-page.component';

type MfaVerificationPageTestApi = MfaVerificationPage & {
  handleOtpSubmit(values: { code: string; trustDevice: boolean }): void;
  handleOtpCancel(): Promise<void>;
  handleOtpResend(): void;
};

describe('MfaVerificationPage', () => {
  const setup = (options?: { authenticated?: boolean; mfaToken?: string | null }) => {
    const mockAuthStore = {
      isAuthenticated: signal(options?.authenticated ?? false),
      isVerifyingMfa: signal(false),
      mfaToken: signal(options?.mfaToken ?? null),
      loginOperation: signal({ status: 'idle', data: null }),
      mfaVerify: vi.fn(),
      clearMfaState: vi.fn(),
      mfaResend: vi.fn(),
    };
    const mockActiveTrustedDeviceStore = {
      setPendingTrustDevice: vi.fn(),
    };
    const mockUserStore = { load: vi.fn() };
    const mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: ActiveTrustedDeviceStore, useValue: mockActiveTrustedDeviceStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: Router, useValue: mockRouter },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new MfaVerificationPage());
    TestBed.tick();
    return { component, mockAuthStore, mockActiveTrustedDeviceStore, mockUserStore, mockRouter };
  };

  it('should load user and navigate home when authenticated', () => {
    const { mockUserStore, mockRouter } = setup({ authenticated: true });

    expect(mockUserStore.load).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should not verify OTP when MFA token is missing', () => {
    const { component, mockAuthStore, mockActiveTrustedDeviceStore } = setup({ mfaToken: null });
    const page = component as unknown as MfaVerificationPageTestApi;

    page.handleOtpSubmit({ code: '123456', trustDevice: true });

    expect(mockActiveTrustedDeviceStore.setPendingTrustDevice).not.toHaveBeenCalled();
    expect(mockAuthStore.mfaVerify).not.toHaveBeenCalled();
  });

  it('should set pending trust and verify OTP when token exists', () => {
    const { component, mockAuthStore, mockActiveTrustedDeviceStore } = setup({
      mfaToken: 'mfa-token',
    });
    const page = component as unknown as MfaVerificationPageTestApi;
    page.handleOtpSubmit({ code: '123456', trustDevice: true });

    expect(mockActiveTrustedDeviceStore.setPendingTrustDevice).toHaveBeenCalledWith(true);
    expect(mockAuthStore.mfaVerify).toHaveBeenCalledWith({
      preAuthToken: 'mfa-token',
      code: '123456',
    });
  });

  it('should clear MFA state and navigate to login on cancel', async () => {
    const { component, mockAuthStore, mockRouter } = setup();
    const page = component as unknown as MfaVerificationPageTestApi;

    await page.handleOtpCancel();

    expect(mockAuthStore.clearMfaState).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should resend MFA code', () => {
    const { component, mockAuthStore } = setup();
    const page = component as unknown as MfaVerificationPageTestApi;

    page.handleOtpResend();

    expect(mockAuthStore.mfaResend).toHaveBeenCalledTimes(1);
  });
});
