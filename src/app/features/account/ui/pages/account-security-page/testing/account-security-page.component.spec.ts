import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { SetupTotpOutput, UserProfileOutput } from '@features/account/models';
import {
  AccountPasswordChangeStore,
  AccountTotpEnrollmentStore,
  UserStore,
} from '@features/account/state';
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

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: UserStore, useValue: userStore }],
    })
      .overrideComponent(AccountSecurityPage, {
        set: {
          providers: [
            { provide: AccountTotpEnrollmentStore, useValue: totpStore },
            { provide: AccountPasswordChangeStore, useValue: passwordStore },
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
    // Whole-request failures are toasts raised by the app-wide feedback
    // listener; a banner here would show the same message twice.
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
