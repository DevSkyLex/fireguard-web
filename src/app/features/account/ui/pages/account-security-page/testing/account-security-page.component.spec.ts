import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import type {
  RequestEmailChangeOutput,
  SetupTotpOutput,
  UserProfileOutput,
} from '@features/account/models';
import {
  AccountDeactivationStore,
  AccountEmailChangeStore,
  AccountPasswordChangeStore,
  AccountTotpEnrollmentStore,
  UserStore,
} from '@features/account/state';
import { AUTH_SESSION_PORT } from '@features/auth';
import type { SessionOutput, TrustedDeviceOutput } from '@features/auth/models';
import { SessionStore, TrustedDeviceStore } from '@features/auth/state';
import { AccountSecurityPage } from '../account-security-page.component';

const SETUP: SetupTotpOutput = {
  '@id': '/api/otp/totp/setup',
  '@type': 'Totp',
  secret: 'JBSWY3DPEHPK3PXP',
  qrCodeUri: 'otpauth://totp/FireGuard:ada@example.com?secret=JBSWY3DPEHPK3PXP',
};

describe('AccountSecurityPage', () => {
  let fixture: ComponentFixture<AccountSecurityPage>;
  let profile: WritableSignal<UserProfileOutput | null>;
  let loadError: WritableSignal<StoreError | null>;
  let userStore: {
    profile: WritableSignal<UserProfileOutput | null>;
    loadError: WritableSignal<StoreError | null>;
    isLoading: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  };
  let totpStore: {
    setup: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    disable: ReturnType<typeof vi.fn>;
    cancelSetup: ReturnType<typeof vi.fn>;
    setupResult: WritableSignal<SetupTotpOutput | null>;
    isSettingUp: WritableSignal<boolean>;
    isConfirming: WritableSignal<boolean>;
    isDisabling: WritableSignal<boolean>;
  };
  let passwordStore: {
    request: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    restart: ReturnType<typeof vi.fn>;
    step: WritableSignal<'request' | 'verify' | 'success'>;
    isRequesting: WritableSignal<boolean>;
    isConfirming: WritableSignal<boolean>;
    maskedRecipient: WritableSignal<string | null>;
  };
  let sessionStore: {
    load: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    revokeOthers: ReturnType<typeof vi.fn>;
    sessions: WritableSignal<ReadonlyArray<SessionOutput>>;
    currentSession: WritableSignal<SessionOutput | null>;
    listCallState: WritableSignal<CallState<null>>;
    isRevoking: WritableSignal<boolean>;
    isRevokingAll: WritableSignal<boolean>;
    hasOtherSessions: WritableSignal<boolean>;
  };
  let trustedDeviceStore: {
    load: ReturnType<typeof vi.fn>;
    revokeDevice: ReturnType<typeof vi.fn>;
    revokeAllDevices: ReturnType<typeof vi.fn>;
    devices: WritableSignal<ReadonlyArray<TrustedDeviceOutput>>;
    listCallState: WritableSignal<CallState<null>>;
    isRevoking: WritableSignal<boolean>;
    isRevokingAll: WritableSignal<boolean>;
  };
  let deactivationStore: {
    deactivate: ReturnType<typeof vi.fn>;
    deactivateCallState: WritableSignal<CallState<UserProfileOutput | null>>;
    isDeactivating: WritableSignal<boolean>;
    deactivateError: WritableSignal<StoreError | null>;
  };
  let emailChangeStore: {
    request: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    pendingEmail: WritableSignal<string | null>;
    expiresAt: WritableSignal<string | null>;
    requestCallState: WritableSignal<CallState<RequestEmailChangeOutput | null>>;
    cancelCallState: WritableSignal<CallState<null>>;
    isRequesting: WritableSignal<boolean>;
    isCancelling: WritableSignal<boolean>;
    hasPendingRequest: WritableSignal<boolean>;
    requestError: WritableSignal<StoreError | null>;
  };
  let authSession: { clearSession: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    profile = signal<UserProfileOutput | null>({ totpEnabled: false } as UserProfileOutput);
    loadError = signal<StoreError | null>(null);
    userStore = {
      profile,
      loadError,
      isLoading: signal(false),
      load: vi.fn(),
      reload: vi.fn(),
    };
    totpStore = {
      setup: vi.fn(),
      confirm: vi.fn(),
      disable: vi.fn(),
      cancelSetup: vi.fn(),
      setupResult: signal<SetupTotpOutput | null>(null),
      isSettingUp: signal(false),
      isConfirming: signal(false),
      isDisabling: signal(false),
    };
    passwordStore = {
      request: vi.fn(),
      confirm: vi.fn(),
      restart: vi.fn(),
      step: signal<'request' | 'verify' | 'success'>('request'),
      isRequesting: signal(false),
      isConfirming: signal(false),
      maskedRecipient: signal<string | null>(null),
    };
    sessionStore = {
      load: vi.fn(),
      revoke: vi.fn(),
      revokeOthers: vi.fn(),
      sessions: signal<ReadonlyArray<SessionOutput>>([]),
      currentSession: signal<SessionOutput | null>(null),
      listCallState: signal<CallState<null>>(idleCallState()),
      isRevoking: signal(false),
      isRevokingAll: signal(false),
      hasOtherSessions: signal(false),
    };
    trustedDeviceStore = {
      load: vi.fn(),
      revokeDevice: vi.fn(),
      revokeAllDevices: vi.fn(),
      devices: signal<ReadonlyArray<TrustedDeviceOutput>>([]),
      listCallState: signal<CallState<null>>(idleCallState()),
      isRevoking: signal(false),
      isRevokingAll: signal(false),
    };

    deactivationStore = {
      deactivate: vi.fn(),
      deactivateCallState: signal<CallState<UserProfileOutput | null>>(idleCallState()),
      isDeactivating: signal(false),
      deactivateError: signal<StoreError | null>(null),
    };
    emailChangeStore = {
      request: vi.fn(),
      cancel: vi.fn(),
      pendingEmail: signal<string | null>(null),
      expiresAt: signal<string | null>(null),
      requestCallState: signal<CallState<RequestEmailChangeOutput | null>>(idleCallState()),
      cancelCallState: signal<CallState<null>>(idleCallState()),
      isRequesting: signal(false),
      isCancelling: signal(false),
      hasPendingRequest: signal(false),
      requestError: signal<StoreError | null>(null),
    };
    authSession = { clearSession: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: UserStore, useValue: userStore },
        { provide: AUTH_SESSION_PORT, useValue: authSession },
      ],
    })
      .overrideComponent(AccountSecurityPage, {
        set: {
          providers: [
            { provide: AccountTotpEnrollmentStore, useValue: totpStore },
            { provide: AccountPasswordChangeStore, useValue: passwordStore },
            { provide: SessionStore, useValue: sessionStore },
            { provide: TrustedDeviceStore, useValue: trustedDeviceStore },
            { provide: AccountDeactivationStore, useValue: deactivationStore },
            { provide: AccountEmailChangeStore, useValue: emailChangeStore },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountSecurityPage);
    await fixture.whenStable();
  });

  it('should read two-factor state from the profile, not from the enrollment store', async () => {
    expect(fixture.nativeElement.textContent).toContain('Off');

    profile.set({ totpEnabled: true } as UserProfileOutput);
    await fixture.whenStable();

    // The enrollment store only knows about the attempt in progress; `/api/me`
    // is the authority on the outcome.
    expect(fixture.nativeElement.textContent).toContain('On');
  });

  it('should claim nothing about two-factor before the profile has landed', async () => {
    profile.set(null);
    await fixture.whenStable();

    // Rendering "Off" here is worse than rendering nothing: for a user who has
    // two-factor on, it is a false statement about their own security, next to
    // a button offering to set up what is already set up.
    expect(fixture.nativeElement.textContent).not.toContain('Off');
    expect(fixture.nativeElement.querySelector('[data-testid="account-mfa-setup"]')).toBeNull();
  });

  it('should offer a retry when the profile could not be fetched', async () => {
    profile.set(null);
    loadError.set({ error: null, message: 'Boom', code: 500, retryable: true, timestamp: 0 });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain("Couldn't load your account");

    fixture.componentInstance['retryProfile']();

    expect(userStore.reload).toHaveBeenCalled();
  });

  it('should ask for the profile it depends on', () => {
    expect(userStore.load).toHaveBeenCalled();
  });

  it('should ask the store for a key when set-up is requested', async () => {
    (
      fixture.nativeElement.querySelector('[data-testid="account-mfa-setup"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(totpStore.setup).toHaveBeenCalled();
  });

  it('should show the pending key once the store has one', async () => {
    totpStore.setupResult.set(SETUP);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#account-mfa-confirm-code')).not.toBeNull();
  });

  it('should forward the activation code', () => {
    fixture.componentInstance['confirmTotp']('123456');

    expect(totpStore.confirm).toHaveBeenCalledWith('123456');
  });

  it('should forward the code proving the right to switch off', () => {
    fixture.componentInstance['disableTotp']('654321');

    expect(totpStore.disable).toHaveBeenCalledWith('654321');
  });

  it('should forward the current password to start a change', () => {
    fixture.componentInstance['requestPasswordChange']('Old!Passw0rd');

    expect(passwordStore.request).toHaveBeenCalledWith('Old!Passw0rd');
  });

  it('should forward the code and the new password', () => {
    fixture.componentInstance['confirmPasswordChange']({
      code: '123456',
      newPassword: 'Str0ng!Passw0rd',
    });

    expect(passwordStore.confirm).toHaveBeenCalledWith({
      code: '123456',
      newPassword: 'Str0ng!Passw0rd',
    });
  });

  it('should treat either password step as pending', async () => {
    passwordStore.isConfirming.set(true);
    await fixture.whenStable();

    expect(fixture.componentInstance['isChangingPassword']()).toBe(true);
  });

  it('should render no error surface of its own', () => {
    // Whole-request failures are toasts raised by the app-wide feedback listener.
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('should ask for sessions and trusted devices on init', () => {
    expect(sessionStore.load).toHaveBeenCalled();
    expect(trustedDeviceStore.load).toHaveBeenCalled();
  });

  it('should forward a session revoke to the session store', () => {
    fixture.componentInstance['revokeSession']('session-1');

    expect(sessionStore.revoke).toHaveBeenCalledWith('session-1');
  });

  it('should forward "sign out other sessions" to the session store', () => {
    fixture.componentInstance['revokeOtherSessions']();

    expect(sessionStore.revokeOthers).toHaveBeenCalled();
  });

  it('should retry the sessions list through the session store', () => {
    fixture.componentInstance['retrySessions']();

    expect(sessionStore.load).toHaveBeenCalledTimes(2);
  });

  it('should forward a device revoke to the trusted-device store', () => {
    fixture.componentInstance['revokeDevice']('device-1');

    expect(trustedDeviceStore.revokeDevice).toHaveBeenCalledWith('device-1');
  });

  it('should forward "revoke all devices" to the trusted-device store', () => {
    fixture.componentInstance['revokeAllDevices']();

    expect(trustedDeviceStore.revokeAllDevices).toHaveBeenCalled();
  });

  it('should retry the trusted-devices list through the trusted-device store', () => {
    fixture.componentInstance['retryDevices']();

    expect(trustedDeviceStore.load).toHaveBeenCalledTimes(2);
  });

  it('should open the deactivation dialog from the danger zone', async () => {
    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-danger-deactivate-open"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(fixture.componentInstance['confirmingDeactivation']()).toBe(true);
  });

  it('should forward the confirmed deactivation to the store', () => {
    fixture.componentInstance['deactivateAccount']();

    expect(deactivationStore.deactivate).toHaveBeenCalled();
  });

  it('should purge the local session and leave for the login page once deactivation succeeds', async () => {
    const router: Router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    deactivationStore.deactivateCallState.set(pendingCallState());
    await fixture.whenStable();
    deactivationStore.deactivateCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(authSession.clearSession).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not purge anything when deactivation fails', async () => {
    const router: Router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    deactivationStore.deactivateCallState.set(pendingCallState());
    await fixture.whenStable();
    deactivationStore.deactivateCallState.set(
      errorCallState({ error: null, message: 'Boom', code: 403, retryable: false, timestamp: 0 }),
    );
    await fixture.whenStable();

    expect(authSession.clearSession).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should show the current address with a way to change it', () => {
    profile.set({ totpEnabled: false, email: 'ada@example.com' } as UserProfileOutput);

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-email-change-open"]',
      ) as HTMLButtonElement
    ).click();

    expect(fixture.componentInstance['changingEmail']()).toBe(true);
  });

  it('should forward the email change request to the store', () => {
    fixture.componentInstance['requestEmailChange']({
      newEmail: 'new@example.com',
      currentPassword: 'Secret123!',
    });

    expect(emailChangeStore.request).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
      currentPassword: 'Secret123!',
    });
  });

  it('should close the dialog once the request is accepted', async () => {
    fixture.componentInstance['changingEmail'].set(true);
    emailChangeStore.requestCallState.set(pendingCallState());
    await fixture.whenStable();
    emailChangeStore.requestCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['changingEmail']()).toBe(false);
  });

  it('should swap to the pending panel with Resend and Cancel once a link was sent', async () => {
    emailChangeStore.pendingEmail.set('new@example.com');
    emailChangeStore.hasPendingRequest.set(true);
    await fixture.whenStable();

    const panel: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="account-email-pending"]',
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('new@example.com');

    (
      panel.querySelector('[data-testid="account-email-cancel-request"]') as HTMLButtonElement
    ).click();
    expect(emailChangeStore.cancel).toHaveBeenCalledTimes(1);

    (panel.querySelector('[data-testid="account-email-resend"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance['changingEmail']()).toBe(true);
  });
});
