import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { PasswordResetStore } from '@features/auth/state';
import { ForgotPasswordPage } from '../forgot-password-page.component';

describe('ForgotPasswordPage', () => {
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let challengeToken: WritableSignal<string | null>;
  let mockPasswordResetStore: {
    request: ReturnType<typeof vi.fn>;
    isRequesting: WritableSignal<boolean>;
    requestError: WritableSignal<null>;
    challengeToken: WritableSignal<string | null>;
  };
  let navigate: MockInstance;

  beforeEach(async () => {
    challengeToken = signal<string | null>(null);

    mockPasswordResetStore = {
      request: vi.fn(),
      isRequesting: signal(false),
      requestError: signal(null),
      challengeToken,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PasswordResetStore, useValue: mockPasswordResetStore },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ForgotPasswordPage);
    await fixture.whenStable();
  });

  it('should ask the API for a code', () => {
    fixture.componentInstance['request']({ email: 'ada@example.com' });

    expect(mockPasswordResetStore.request).toHaveBeenCalledWith({ email: 'ada@example.com' });
  });

  it('should stay put while no challenge token exists', () => {
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should hand over to verification once a token exists', async () => {
    // The same signal `passwordResetVerifyGuard` reads, so the page cannot
    // navigate somewhere the guard would bounce it back from.
    challengeToken.set('reset-token');
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/password-reset/verify'], {
      queryParams: { token: 'reset-token', returnUrl: undefined },
    });
  });
});
