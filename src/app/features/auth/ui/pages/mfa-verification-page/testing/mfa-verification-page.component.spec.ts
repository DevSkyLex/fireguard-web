import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AuthStore } from '@features/auth/state';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import { MfaVerificationPage } from '../mfa-verification-page.component';

type MfaVerificationPageTestApi = MfaVerificationPage & {
  handleOtpSubmit(values: { code: string; trustDevice: boolean }): void;
  handleOtpCancel(): Promise<void>;
  handleOtpResend(): void;
  showResend: () => boolean;
  mfaDestination: () => string | null;
};

describe('MfaVerificationPage', () => {
  const setup = (options?: {
    authenticated?: boolean;
    mfaToken?: string | null;
    returnUrl?: string | null;
    mfaMethod?: string | null;
    mfaDestination?: string | null;
  }) => {
    const mockAuthStore = {
      isAuthenticated: signal(options?.authenticated ?? false),
      isVerifyingMfa: signal(false),
      mfaToken: signal(options?.mfaToken ?? null),
      mfaMethod: signal(options?.mfaMethod ?? null),
      mfaDestination: signal(options?.mfaDestination ?? null),
      loginOperation: signal({ status: 'idle', data: null }),
      loginCallState: signal({ status: 'idle', data: null }),
      mfaVerify: vi.fn(),
      clearMfaState: vi.fn(),
      mfaResend: vi.fn(),
    };
    const mockActiveTrustedDeviceStore = {
      setPendingTrustDevice: vi.fn(),
    };
    const mockUserProfilePort = { load: vi.fn() };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
    const mockMessageService = { add: vi.fn() };
    const mockRoute = {
      snapshot: { queryParamMap: { get: () => options?.returnUrl ?? null } },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: ActiveTrustedDeviceStore, useValue: mockActiveTrustedDeviceStore },
        { provide: USER_PROFILE_PORT, useValue: mockUserProfilePort },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new MfaVerificationPage());
    TestBed.tick();
    return {
      component,
      mockAuthStore,
      mockActiveTrustedDeviceStore,
      mockUserProfilePort,
      mockRouter,
    };
  };

  it('should navigate home when authenticated', () => {
    const { mockUserProfilePort, mockRouter } = setup({ authenticated: true });

    expect(mockUserProfilePort.load).not.toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should navigate to a forwarded returnUrl when authenticated', () => {
    const { mockRouter } = setup({
      authenticated: true,
      returnUrl: '/organizations/invitations/accept?token=abc',
    });

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(
      '/organizations/invitations/accept?token=abc',
    );
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

  it('should show resend for a non-totp MFA method', () => {
    const { component } = setup({ mfaMethod: 'email', mfaDestination: 'j***e@example.com' });
    const page = component as unknown as MfaVerificationPageTestApi;

    expect(page.showResend()).toBe(true);
    expect(page.mfaDestination()).toBe('j***e@example.com');
  });

  it('should hide resend and surface the authenticator app destination for totp', () => {
    const { component } = setup({ mfaMethod: 'totp', mfaDestination: 'Authenticator App' });
    const page = component as unknown as MfaVerificationPageTestApi;

    expect(page.showResend()).toBe(false);
    expect(page.mfaDestination()).toBe('Authenticator App');
  });

  describe('rendering', () => {
    const renderSetup = (options?: { mfaDestination?: string | null }) => {
      TestBed.resetTestingModule();
      const mockAuthStore = {
        isAuthenticated: signal(false),
        isVerifyingMfa: signal(false),
        mfaToken: signal<string | null>('mfa-token'),
        mfaMethod: signal<string | null>('email'),
        mfaDestination: signal<string | null>(options?.mfaDestination ?? null),
        loginCallState: signal({ status: 'idle', data: null }),
        mfaVerify: vi.fn(),
        clearMfaState: vi.fn(),
        mfaResend: vi.fn(),
      };
      const mockActiveTrustedDeviceStore = { setPendingTrustDevice: vi.fn() };
      const mockUserProfilePort = { load: vi.fn() };
      const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
      const mockMessageService = { add: vi.fn() };

      TestBed.configureTestingModule({
        imports: [MfaVerificationPage],
        providers: [
          provideRouter([]),
          { provide: AuthStore, useValue: mockAuthStore },
          { provide: ActiveTrustedDeviceStore, useValue: mockActiveTrustedDeviceStore },
          { provide: USER_PROFILE_PORT, useValue: mockUserProfilePort },
          { provide: Events, useValue: mockEvents },
          { provide: MessageService, useValue: mockMessageService },
        ],
      });

      return { mockAuthStore, mockActiveTrustedDeviceStore };
    };

    it('should render the page heading and the OTP verification form', () => {
      renderSetup();
      const fixture = TestBed.createComponent(MfaVerificationPage);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).toContain('Multi-Factor Authentication');
      expect(nativeElement.querySelector('app-otp-verification-form')).not.toBeNull();
    });

    it('should display the MFA destination when provided', () => {
      renderSetup({ mfaDestination: 'j***e@example.com' });
      const fixture = TestBed.createComponent(MfaVerificationPage);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(
        nativeElement.querySelector('[data-testid="mfa-verification-destination"]'),
      ).not.toBeNull();
      expect(nativeElement.textContent).toContain('j***e@example.com');
    });

    it('should verify the OTP code when the form is submitted via the DOM', () => {
      const { mockAuthStore } = renderSetup();
      const fixture = TestBed.createComponent(MfaVerificationPage);
      fixture.detectChanges();

      const instance = fixture.componentInstance as unknown as {
        handleOtpSubmit(values: { code: string; trustDevice: boolean }): void;
      };
      instance.handleOtpSubmit({ code: '123456', trustDevice: false });
      fixture.detectChanges();

      expect(mockAuthStore.mfaVerify).toHaveBeenCalledWith({
        preAuthToken: 'mfa-token',
        code: '123456',
      });
    });
  });
});
