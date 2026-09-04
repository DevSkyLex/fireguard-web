import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { PasswordResetStore } from '@features/auth/state';
import { NewPasswordPage } from '../new-password-page.component';

describe('NewPasswordPage', () => {
  let fixture: ComponentFixture<NewPasswordPage>;
  let challengeToken: WritableSignal<string | null>;
  let verificationCode: WritableSignal<string | null>;
  let confirmError: WritableSignal<null>;
  let isConfirming: WritableSignal<boolean>;
  let mockPasswordResetStore: {
    confirm: ReturnType<typeof vi.fn>;
    isConfirming: WritableSignal<boolean>;
    confirmError: WritableSignal<null>;
    challengeToken: WritableSignal<string | null>;
    verificationCode: WritableSignal<string | null>;
  };
  let navigate: MockInstance;

  beforeEach(async () => {
    // The guard guarantees both are present before this page renders.
    challengeToken = signal<string | null>('reset-token');
    verificationCode = signal<string | null>('123456');
    confirmError = signal(null);
    isConfirming = signal(false);

    mockPasswordResetStore = {
      confirm: vi.fn(),
      isConfirming,
      confirmError,
      challengeToken,
      verificationCode,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PasswordResetStore, useValue: mockPasswordResetStore },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(NewPasswordPage);
    await fixture.whenStable();
  });

  it('should send the recorded code with the new password', () => {
    fixture.componentInstance['reset']({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Str0ng!Passw0rd',
    });

    // Only the password travels from the form: the store already holds the
    // token and the code the previous step recorded.
    expect(mockPasswordResetStore.confirm).toHaveBeenCalledWith({
      code: '123456',
      newPassword: 'Str0ng!Passw0rd',
    });
  });

  it('should not send anything when no code was recorded', async () => {
    verificationCode.set(null);
    await fixture.whenStable();

    fixture.componentInstance['reset']({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Str0ng!Passw0rd',
    });

    expect(mockPasswordResetStore.confirm).not.toHaveBeenCalled();
  });

  it('should stay put while the flow still holds a token', () => {
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should stay put while the request is in flight', async () => {
    isConfirming.set(true);
    challengeToken.set(null);
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should route to sign-in once the reset has cleared the flow', async () => {
    // The store empties the token on success, so its absence with no error and
    // nothing in flight is what marks the reset as done.
    challengeToken.set(null);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: undefined },
    });
  });
});
