import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import type { MfaMethod } from '@features/auth/models';
import { ActiveTrustedDeviceStore, AuthStore } from '@features/auth/state';
import { MfaVerifyPage } from '../mfa-verify-page.component';

describe('MfaVerifyPage', () => {
  let fixture: ComponentFixture<MfaVerifyPage>;
  let isAuthenticated: WritableSignal<boolean>;
  let mfaMethod: WritableSignal<MfaMethod | null>;
  let mfaDestination: WritableSignal<string | null>;
  let mfaToken: WritableSignal<string | null>;
  let mockAuthStore: {
    clearMfaState: ReturnType<typeof vi.fn>;
    mfaVerify: ReturnType<typeof vi.fn>;
    mfaResend: ReturnType<typeof vi.fn>;
    isVerifyingMfa: WritableSignal<boolean>;
    isResendingMfa: WritableSignal<boolean>;
    mfaVerifyError: WritableSignal<null>;
    mfaResendError: WritableSignal<null>;
    mfaResendAvailableIn: WritableSignal<number>;
    isAuthenticated: WritableSignal<boolean>;
    mfaMethod: WritableSignal<MfaMethod | null>;
    mfaDestination: WritableSignal<string | null>;
    mfaToken: WritableSignal<string | null>;
  };
  let navigateByUrl: MockInstance;
  let setPendingTrustDevice: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    isAuthenticated = signal(false);
    mfaMethod = signal<MfaMethod | null>('email');
    mfaDestination = signal<string | null>('a***@example.com');
    mfaToken = signal<string | null>('pre-auth-token');

    mockAuthStore = {
      clearMfaState: vi.fn(),
      mfaVerify: vi.fn(),
      mfaResend: vi.fn(),
      isVerifyingMfa: signal(false),
      isResendingMfa: signal(false),
      mfaVerifyError: signal(null),
      mfaResendError: signal(null),
      mfaResendAvailableIn: signal(0),
      isAuthenticated,
      mfaMethod,
      mfaDestination,
      mfaToken,
    };

    setPendingTrustDevice = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: ActiveTrustedDeviceStore, useValue: { setPendingTrustDevice } },
      ],
    });

    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(MfaVerifyPage);
    await fixture.whenStable();
  });

  it('should submit the code with the pre-auth token the sign-in left behind', () => {
    fixture.componentInstance['verify']({ code: '123456', trustDevice: false });

    expect(mockAuthStore.mfaVerify).toHaveBeenCalledWith({
      preAuthToken: 'pre-auth-token',
      code: '123456',
    });
  });

  it('should record the trust intent before verifying', () => {
    const order: string[] = [];
    setPendingTrustDevice.mockImplementation(() => order.push('trust'));
    mockAuthStore.mfaVerify.mockImplementation(() => order.push('verify'));

    fixture.componentInstance['verify']({ code: '123456', trustDevice: true });

    // AuthStore reads the pending flag right after the verify succeeds, so it
    // has to be set before the request leaves.
    expect(setPendingTrustDevice).toHaveBeenCalledWith(true);
    expect(order).toEqual(['trust', 'verify']);
  });

  it('should offer the trust-device control', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="otp-trust-device"]')).not.toBeNull();
  });

  it('should not submit when the challenge has expired', async () => {
    mfaToken.set(null);
    await fixture.whenStable();

    fixture.componentInstance['verify']({ code: '123456', trustDevice: false });

    // Without a token the request could only fail; the guard sends the visitor
    // back to sign-in on the next navigation.
    expect(mockAuthStore.mfaVerify).not.toHaveBeenCalled();
  });

  it('should name the destination the code was sent to', () => {
    expect(fixture.nativeElement.textContent).toContain('a***@example.com');
  });

  it('should offer a resend for a delivered challenge', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="otp-resend"]')).not.toBeNull();
  });

  it('should hide the resend for an authenticator challenge', async () => {
    mfaMethod.set('totp');
    mfaDestination.set(null);
    await fixture.whenStable();

    // A TOTP code is generated on the device: there is no delivery to repeat,
    // and the backend rejects the resend outright.
    expect(fixture.nativeElement.querySelector('[data-testid="otp-resend"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('authenticator app');
  });

  it('should route to the return url once the second factor completes', async () => {
    isAuthenticated.set(true);
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
  it('clears the MFA challenge before navigating back to sign-in', () => {
    const order: string[] = [];
    mockAuthStore.clearMfaState.mockImplementation(() => order.push('clear'));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(async () => {
      order.push('navigate');
      return true;
    });

    fixture.componentInstance['restartSignIn']();

    expect(order).toEqual(['clear', 'navigate']);
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: undefined },
    });
  });

  it('keeps the challenge while verification or resend is pending', () => {
    mockAuthStore.isVerifyingMfa.set(true);
    fixture.componentInstance['restartSignIn']();
    mockAuthStore.isVerifyingMfa.set(false);
    mockAuthStore.isResendingMfa.set(true);
    fixture.componentInstance['restartSignIn']();

    expect(mockAuthStore.clearMfaState).not.toHaveBeenCalled();
  });
});
