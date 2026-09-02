import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { PasswordResetStore } from '@features/auth/state';
import { PasswordResetVerifyPage } from '../password-reset-verify-page.component';

describe('PasswordResetVerifyPage', () => {
  let challengeToken: WritableSignal<string | null>;
  let mockPasswordResetStore: {
    setChallengeToken: ReturnType<typeof vi.fn>;
    setVerificationCode: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
    isResending: WritableSignal<boolean>;
    resendError: WritableSignal<null>;
    resendAvailableIn: WritableSignal<number>;
    challengeToken: WritableSignal<string | null>;
  };
  let navigate: MockInstance;

  /**
   * Builds the page with a given `token` query parameter, which is what an
   * emailed reset link carries.
   */
  async function createPage(
    token: string | null,
  ): Promise<ComponentFixture<PasswordResetVerifyPage>> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PasswordResetStore, useValue: mockPasswordResetStore },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(token === null ? {} : { token }) },
          },
        },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(PasswordResetVerifyPage);
    await fixture.whenStable();

    return fixture;
  }

  beforeEach(() => {
    challengeToken = signal<string | null>(null);

    mockPasswordResetStore = {
      setChallengeToken: vi.fn(),
      setVerificationCode: vi.fn(),
      resend: vi.fn(),
      isResending: signal(false),
      resendError: signal(null),
      resendAvailableIn: signal(0),
      challengeToken,
    };
  });

  it('should seed the store from an emailed link', async () => {
    await createPage('link-token');

    // A visitor arriving from their inbox has a token in the URL but nothing in
    // the store; without this the next step would find none and bounce them.
    expect(mockPasswordResetStore.setChallengeToken).toHaveBeenCalledWith('link-token');
  });

  it('should not overwrite a token the flow already established', async () => {
    challengeToken.set('existing-token');

    await createPage('link-token');

    expect(mockPasswordResetStore.setChallengeToken).not.toHaveBeenCalled();
  });

  it('should do nothing when no token is offered', async () => {
    await createPage(null);

    expect(mockPasswordResetStore.setChallengeToken).not.toHaveBeenCalled();
  });

  it('should record the code and move on without calling the API', async () => {
    const fixture = await createPage('link-token');

    fixture.componentInstance['verify']({ code: '123456', trustDevice: false });

    // Nothing is sent yet: the API validates the code and the new password in
    // one call, so this step only records what the final screen will need.
    expect(mockPasswordResetStore.setVerificationCode).toHaveBeenCalledWith('123456');
    expect(navigate).toHaveBeenCalledWith(['/auth/password-reset/new']);
  });

  it('should forward a resend request', async () => {
    const fixture = await createPage('link-token');

    fixture.componentInstance['resend']();

    expect(mockPasswordResetStore.resend).toHaveBeenCalledTimes(1);
  });
});
