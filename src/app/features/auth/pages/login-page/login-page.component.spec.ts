import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { LoginPage } from './login-page.component';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

describe('LoginPage', () => {
  const setup = (options?: { mfaRequired?: boolean; authenticated?: boolean }) => {
    const authState = {
      isLoggingIn: signal(false),
      mfaRequired: signal(options?.mfaRequired ?? false),
      isAuthenticated: signal(options?.authenticated ?? false),
    };
    const mockAuthStore = {
      ...authState,
      login: vi.fn(),
    };
    const mockUserStore = { load: vi.fn() };
    const mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
    const mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
        { provide: Router, useValue: mockRouter },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new LoginPage());
    TestBed.tick();
    return { component, mockAuthStore, mockUserStore, mockRouter };
  };

  it('should call authStore.login when form is submitted', () => {
    const { component, mockAuthStore } = setup();

    (component as any).handleLogin({
      email: 'test@example.com',
      password: 'password123',
      remember_me: true,
    });

    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      remember_me: true,
    });
  });

  it('should navigate to MFA page when MFA is required', () => {
    const { mockRouter } = setup({ mfaRequired: true });

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/mfa-verify']);
  });

  it('should load user and navigate home when user is authenticated', () => {
    const { mockUserStore, mockRouter } = setup({ authenticated: true });

    expect(mockUserStore.load).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
