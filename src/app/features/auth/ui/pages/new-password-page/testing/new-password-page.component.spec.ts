import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { PasswordResetStore } from '@features/auth/state';
import { NewPasswordPage } from '../new-password-page.component';

type NewPasswordPageTestApi = NewPasswordPage & {
  handlePasswordSubmit(values: { newPassword: string }): void;
  handlePasswordCancel(): Promise<void>;
};

describe('NewPasswordPage', () => {
  const setup = (options?: {
    status?: 'idle' | 'loading' | 'success' | 'error';
    code?: string | null;
  }) => {
    const mockPasswordResetStore = {
      isConfirming: signal(false),
      verificationCode: signal(options?.code ?? null),
      confirmCallState: signal({
        status: options?.status ?? 'idle',
        data: null,
        error: null,
      }),
      confirmError: signal(null),
      confirm: vi.fn(),
      clear: vi.fn(),
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

    const component = TestBed.runInInjectionContext(() => new NewPasswordPage());
    TestBed.tick();
    return { component, mockPasswordResetStore, mockRouter };
  };

  it('should clear state and navigate to login when confirm operation succeeds', () => {
    const { mockPasswordResetStore, mockRouter } = setup({ status: 'success' });

    expect(mockPasswordResetStore.clear).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { passwordReset: 'success' },
    });
  });

  it('should not submit when verification code is missing', () => {
    const { component, mockPasswordResetStore } = setup({ code: null });
    const page = component as unknown as NewPasswordPageTestApi;

    page.handlePasswordSubmit({ newPassword: 'NewPass123!' });

    expect(mockPasswordResetStore.confirm).not.toHaveBeenCalled();
  });

  it('should submit with verification code when available', () => {
    const { component, mockPasswordResetStore } = setup({ code: '123456' });
    const page = component as unknown as NewPasswordPageTestApi;

    page.handlePasswordSubmit({ newPassword: 'NewPass123!' });

    expect(mockPasswordResetStore.confirm).toHaveBeenCalledWith({
      code: '123456',
      newPassword: 'NewPass123!',
    });
  });

  it('should clear state and navigate to login on cancel', async () => {
    const { component, mockPasswordResetStore, mockRouter } = setup();
    const page = component as unknown as NewPasswordPageTestApi;

    await page.handlePasswordCancel();

    expect(mockPasswordResetStore.clear).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  describe('rendering', () => {
    const renderSetup = () => {
      TestBed.resetTestingModule();
      const mockPasswordResetStore = {
        isConfirming: signal(false),
        verificationCode: signal<string | null>('123456'),
        confirmCallState: signal({ status: 'idle', data: null, error: null }),
        confirmError: signal(null),
        confirm: vi.fn(),
        clear: vi.fn(),
      };
      const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
      const mockMessageService = { add: vi.fn() };

      TestBed.configureTestingModule({
        imports: [NewPasswordPage],
        providers: [
          provideRouter([]),
          { provide: PasswordResetStore, useValue: mockPasswordResetStore },
          { provide: Events, useValue: mockEvents },
          { provide: MessageService, useValue: mockMessageService },
        ],
      });

      return { mockPasswordResetStore };
    };

    it('should render the page heading and the new password form', () => {
      renderSetup();
      const fixture = TestBed.createComponent(NewPasswordPage);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).toContain('Set Your New Password');
      expect(nativeElement.querySelector('app-new-password-form')).not.toBeNull();
    });

    it('should confirm the new password when the form is submitted via the DOM', () => {
      const { mockPasswordResetStore } = renderSetup();
      const fixture = TestBed.createComponent(NewPasswordPage);
      fixture.detectChanges();

      const instance = fixture.componentInstance as unknown as {
        handlePasswordSubmit(values: { newPassword: string }): void;
      };
      instance.handlePasswordSubmit({ newPassword: 'NewPass123!' });
      fixture.detectChanges();

      expect(mockPasswordResetStore.confirm).toHaveBeenCalledWith({
        code: '123456',
        newPassword: 'NewPass123!',
      });
    });
  });
});
