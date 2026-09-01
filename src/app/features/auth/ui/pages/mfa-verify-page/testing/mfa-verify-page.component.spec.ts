import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import type { MfaMethod } from '@features/auth/models';
import { AuthStore } from '@features/auth/state';
import { MfaVerifyPage } from '../mfa-verify-page.component';

describe('MfaVerifyPage', () => {
  let fixture: ComponentFixture<MfaVerifyPage>;
  let isAuthenticated: WritableSignal<boolean>;
  let mfaMethod: WritableSignal<MfaMethod | null>;
  let mfaDestination: WritableSignal<string | null>;
  let mfaToken: WritableSignal<string | null>;
  let mockAuthStore: {
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

  beforeEach(async () => {
    isAuthenticated = signal(false);
    mfaMethod = signal<MfaMethod | null>('email');
    mfaDestination = signal<string | null>('a***@example.com');
    mfaToken = signal<string | null>('pre-auth-token');

    mockAuthStore = {
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(MfaVerifyPage);
    await fixture.whenStable();
  });

  it('should submit the code with the pre-auth token the sign-in left behind', () => {
    fixture.componentInstance['verify']({ code: '123456' });

    expect(mockAuthStore.mfaVerify).toHaveBeenCalledWith({
      preAuthToken: 'pre-auth-token',
      code: '123456',
    });
  });

  it('should not submit when the challenge has expired', async () => {
    mfaToken.set(null);
    await fixture.whenStable();

    fixture.componentInstance['verify']({ code: '123456' });

    // Without a token the request could only fail; the guard sends the visitor
    // back to sign-in on the next navigation.
    expect(mockAuthStore.mfaVerify).not.toHaveBeenCalled();
  });

  it('should name the destination the code was sent to', () => {
    expect(fixture.nativeElement.textContent).toContain('a***@example.com');
  });

  it('should offer a resend for a delivered challenge', () => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');

    expect(buttons.length).toBe(2);
  });

  it('should hide the resend for an authenticator challenge', async () => {
    mfaMethod.set('totp');
    mfaDestination.set(null);
    await fixture.whenStable();

    // A TOTP code is generated on the device: there is no delivery to repeat,
    // and the backend rejects the resend outright.
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');

    expect(buttons.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('authenticator app');
  });

  it('should route to the return url once the second factor completes', async () => {
    isAuthenticated.set(true);
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
