import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AuthStore } from '@features/auth/state';
import { LoginPage } from '../login-page.component';

type LoginPageTestApi = LoginPage & {
  handleLogin(values: { email: string; password: string; remember_me: boolean }): void;
};

describe('LoginPage', () => {
  const setup = (options?: {
    mfaRequired?: boolean;
    authenticated?: boolean;
    returnUrl?: string | null;
  }) => {
    const authState = {
      isLoggingIn: signal(false),
      loginError: signal(null),
      mfaRequired: signal(options?.mfaRequired ?? false),
      isAuthenticated: signal(options?.authenticated ?? false),
    };
    const mockAuthStore = {
      ...authState,
      login: vi.fn(),
    };
    const mockUserProfilePort = { load: vi.fn() };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
    const mockMessageService = { add: vi.fn() };
    const mockRoute = {
      snapshot: { queryParamMap: { get: () => options?.returnUrl ?? null } },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: USER_PROFILE_PORT, useValue: mockUserProfilePort },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new LoginPage());
    TestBed.tick();
    return { component, mockAuthStore, mockUserProfilePort, mockRouter };
  };

  it('should call authStore.login when form is submitted', () => {
    const { component, mockAuthStore } = setup();
    const page = component as unknown as LoginPageTestApi;

    page.handleLogin({
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

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], { queryParams: {} });
  });

  it('should forward the returnUrl to the MFA page when MFA is required', () => {
    const { mockRouter } = setup({
      mfaRequired: true,
      returnUrl: '/organizations/invitations/accept?token=abc',
    });

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParams: { returnUrl: '/organizations/invitations/accept?token=abc' },
    });
  });

  it('should navigate home when user is authenticated', () => {
    const { mockUserProfilePort, mockRouter } = setup({ authenticated: true });

    expect(mockUserProfilePort.load).not.toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should navigate to a safe returnUrl when user is authenticated', () => {
    const { mockRouter } = setup({
      authenticated: true,
      returnUrl: '/organizations/invitations/accept?token=abc',
    });

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(
      '/organizations/invitations/accept?token=abc',
    );
  });

  it('should ignore an unsafe (external) returnUrl when authenticated', () => {
    const { mockRouter } = setup({ authenticated: true, returnUrl: 'https://evil.example.com' });

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  describe('rendering', () => {
    const renderSetup = (options?: { loading?: boolean }) => {
      TestBed.resetTestingModule();
      const authState = {
        isLoggingIn: signal(options?.loading ?? false),
        loginError: signal(null),
        mfaRequired: signal(false),
        isAuthenticated: signal(false),
      };
      const mockAuthStore = { ...authState, login: vi.fn() };
      const mockUserProfilePort = { load: vi.fn() };
      const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
      const mockMessageService = { add: vi.fn() };

      TestBed.configureTestingModule({
        imports: [LoginPage],
        providers: [
          provideRouter([]),
          { provide: AuthStore, useValue: mockAuthStore },
          { provide: USER_PROFILE_PORT, useValue: mockUserProfilePort },
          { provide: Events, useValue: mockEvents },
          { provide: MessageService, useValue: mockMessageService },
        ],
      });

      return { mockAuthStore };
    };

    it('should render the page heading and the login form', () => {
      renderSetup();
      const fixture = TestBed.createComponent(LoginPage);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).toContain('Welcome Back');
      expect(nativeElement.querySelector('app-login-form')).not.toBeNull();
    });

    it('should call authStore.login when the login form is submitted via the DOM', () => {
      const { mockAuthStore } = renderSetup();
      const fixture = TestBed.createComponent(LoginPage);
      fixture.detectChanges();

      const loginFormDebugElement = fixture.debugElement.query(
        (node) => node.name === 'app-login-form',
      );
      const loginForm = loginFormDebugElement.componentInstance as unknown as {
        form: {
          setValue(value: { email: string; password: string; remember_me: boolean }): void;
        };
      };
      loginForm.form.setValue({
        email: 'test@example.com',
        password: 'password123',
        remember_me: false,
      });
      fixture.detectChanges();

      const formElement: HTMLFormElement | null = (
        fixture.nativeElement as HTMLElement
      ).querySelector('form');
      formElement?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(mockAuthStore.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        remember_me: false,
      });
    });
  });
});
