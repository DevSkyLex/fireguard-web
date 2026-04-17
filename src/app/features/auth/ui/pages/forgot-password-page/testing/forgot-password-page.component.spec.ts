import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { PasswordResetStore } from '@features/auth/state';
import { ForgotPasswordPage } from '../forgot-password-page.component';

type ForgotPasswordPageTestApi = ForgotPasswordPage & {
  handleSubmit(values: { email: string }): void;
};

describe('ForgotPasswordPage', () => {
  const setup = (options?: { challengeToken?: string | null }) => {
    const mockPasswordResetStore = {
      clear: vi.fn(),
      request: vi.fn(),
      isRequesting: signal(false),
      currentRequest: signal(
        options?.challengeToken
          ? {
              challengeToken: options.challengeToken,
            }
          : null,
      ),
    };
    const mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: PasswordResetStore, useValue: mockPasswordResetStore },
        { provide: Router, useValue: mockRouter },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ForgotPasswordPage());
    TestBed.tick();
    return { component, mockPasswordResetStore, mockRouter };
  };

  it('should clear password reset state on init', () => {
    const { mockPasswordResetStore } = setup();
    expect(mockPasswordResetStore.clear).toHaveBeenCalledTimes(1);
  });

  it('should navigate to verify page when challenge token exists', () => {
    const { mockRouter } = setup({ challengeToken: 'challenge-token' });

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/password-reset/verify'], {
      queryParams: { token: 'challenge-token' },
    });
  });

  it('should request password reset on submit', () => {
    const { component, mockPasswordResetStore } = setup();
    const page = component as unknown as ForgotPasswordPageTestApi;

    page.handleSubmit({ email: 'test@example.com' });

    expect(mockPasswordResetStore.request).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});
