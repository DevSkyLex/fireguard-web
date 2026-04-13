import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { PasswordResetStore } from '@features/auth/state';
import { PasswordResetVerifyPage } from './password-reset-verify-page.component';

type PasswordResetVerifyPageTestApi = PasswordResetVerifyPage & {
  resendIn: () => number | null;
  handleVerify(values: { code: string; trustDevice: boolean }): Promise<void>;
  handleCancel(): Promise<void>;
  handleResend(): void;
};

describe('PasswordResetVerifyPage', () => {
  const setup = (options?: { canResendIn?: number | null }) => {
    const mockPasswordResetStore = {
      isResending: signal(false),
      currentRequest: signal(
        options?.canResendIn !== undefined ? { canResendIn: options.canResendIn } : null,
      ),
      setVerificationCode: vi.fn(),
      clear: vi.fn(),
      resend: vi.fn(),
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

    const component = TestBed.runInInjectionContext(() => new PasswordResetVerifyPage());
    return { component, mockPasswordResetStore, mockRouter };
  };

  it('should expose resendIn value from current request', () => {
    const { component } = setup({ canResendIn: 30 });
    const page = component as unknown as PasswordResetVerifyPageTestApi;
    expect(page.resendIn()).toBe(30);
  });

  it('should set verification code and navigate to new password page', async () => {
    const { component, mockPasswordResetStore, mockRouter } = setup();
    const page = component as unknown as PasswordResetVerifyPageTestApi;

    await page.handleVerify({ code: '123456', trustDevice: false });

    expect(mockPasswordResetStore.setVerificationCode).toHaveBeenCalledWith('123456');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/password-reset/new']);
  });

  it('should clear state and navigate to forgot page on cancel', async () => {
    const { component, mockPasswordResetStore, mockRouter } = setup();
    const page = component as unknown as PasswordResetVerifyPageTestApi;

    await page.handleCancel();

    expect(mockPasswordResetStore.clear).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/password-reset/forgot']);
  });

  it('should request resend', () => {
    const { component, mockPasswordResetStore } = setup();
    const page = component as unknown as PasswordResetVerifyPageTestApi;

    page.handleResend();

    expect(mockPasswordResetStore.resend).toHaveBeenCalledTimes(1);
  });
});
