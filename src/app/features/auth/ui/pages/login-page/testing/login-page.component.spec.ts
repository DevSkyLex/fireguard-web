import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { errorCallState, idleCallState, type CallState } from '@core/request-state';
import type { FederatedProviderOutput } from '@features/auth/models';
import { AuthStore, FederatedAuthStore } from '@features/auth/state';
import { LoginPage } from '../login-page.component';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let mfaRequired: WritableSignal<boolean>;
  let isAuthenticated: WritableSignal<boolean>;
  let mockAuthStore: {
    login: ReturnType<typeof vi.fn>;
    isLoggingIn: WritableSignal<boolean>;
    loginError: WritableSignal<null>;
    mfaRequired: WritableSignal<boolean>;
    isAuthenticated: WritableSignal<boolean>;
  };
  let mockFederatedStore: {
    loadProviders: ReturnType<typeof vi.fn>;
    startLogin: ReturnType<typeof vi.fn>;
    resetStart: ReturnType<typeof vi.fn>;
    enabledProviders: WritableSignal<readonly ('google' | 'microsoft')[]>;
    providersLoading: WritableSignal<boolean>;
    providersCallState: WritableSignal<CallState<readonly FederatedProviderOutput[]>>;
    startPending: WritableSignal<boolean>;
    pendingProvider: WritableSignal<'google' | 'microsoft' | null>;
    startUrl: WritableSignal<string | null>;
    startCallState: WritableSignal<{ status: 'idle'; data: null; error: null }>;
  };
  let navigateByUrl: MockInstance;
  let navigate: MockInstance;

  beforeEach(async () => {
    mfaRequired = signal(false);
    isAuthenticated = signal(false);

    mockAuthStore = {
      login: vi.fn(),
      isLoggingIn: signal(false),
      loginError: signal(null),
      mfaRequired,
      isAuthenticated,
    };
    mockFederatedStore = {
      loadProviders: vi.fn(),
      startLogin: vi.fn(),
      resetStart: vi.fn(),
      enabledProviders: signal([]),
      providersLoading: signal(false),
      providersCallState: signal<CallState<readonly FederatedProviderOutput[]>>(idleCallState()),
      startPending: signal(false),
      pendingProvider: signal(null),
      startUrl: signal(null),
      startCallState: signal({ status: 'idle', data: null, error: null }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: FederatedAuthStore, useValue: mockFederatedStore },
      ],
    });

    const router: Router = TestBed.inject(Router);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
  });

  it('should not navigate while no outcome is reached', () => {
    expect(mockFederatedStore.loadProviders).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('should render only enabled providers and start the selected provider once', async () => {
    mockFederatedStore.enabledProviders.set(['google']);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="auth-provider-google"]')
      ?.closest('button');
    expect(button).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Microsoft');

    button?.click();
    expect(mockFederatedStore.startLogin).toHaveBeenCalledOnce();
    expect(mockFederatedStore.startLogin).toHaveBeenCalledWith({
      provider: 'google',
      returnUrl: '/',
    });
  });

  it('should send plain credentials without remember_me when it was not asked for', () => {
    fixture.componentInstance['login']({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      rememberMe: false,
    });

    // The flag is omitted rather than sent as false, so the request keeps the
    // shape the backend documents for a plain sign-in.
    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
    });
    expect(mockFederatedStore.resetStart).toHaveBeenCalledOnce();
  });

  it('should send remember_me when it was asked for', () => {
    fixture.componentInstance['login']({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      rememberMe: true,
    });

    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      remember_me: true,
    });
  });

  it('should route to the return url once the session is established', async () => {
    isAuthenticated.set(true);
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
    expect(mockFederatedStore.resetStart).toHaveBeenCalledOnce();
  });

  it('should route to verification when a challenge is pending', async () => {
    mfaRequired.set(true);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParams: { returnUrl: undefined },
    });
  });

  it('should prefer the challenge over an established session', async () => {
    // A pending challenge means the session is not really established yet, so
    // it must win — otherwise the second factor is silently skipped.
    mfaRequired.set(true);
    isAuthenticated.set(true);
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParams: { returnUrl: undefined },
    });
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('should lock provider start while password sign-in is pending', async () => {
    mockFederatedStore.enabledProviders.set(['google']);
    mockAuthStore.isLoggingIn.set(true);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="auth-provider-google"]')
      ?.closest<HTMLButtonElement>('button');
    button?.click();

    expect(button?.disabled).toBe(true);
    expect(mockFederatedStore.startLogin).not.toHaveBeenCalled();
  });

  it('should reject password submission while a provider start is pending', () => {
    mockFederatedStore.startPending.set(true);

    fixture.componentInstance['login']({
      email: 'ada@example.com',
      password: 'Str0ng!Passw0rd',
      rememberMe: false,
    });

    expect(mockAuthStore.login).not.toHaveBeenCalled();
    expect(mockFederatedStore.resetStart).not.toHaveBeenCalled();
  });

  it('should expose a localized retry when provider discovery fails', async () => {
    mockFederatedStore.providersCallState.set(
      errorCallState(
        {
          error: null,
          message: 'provider_unavailable',
          code: 503,
          retryable: true,
          timestamp: 0,
        },
        [],
      ),
    );
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This sign-in provider is temporarily unavailable. Try again.',
    );
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="federated-provider-retry"]')
      ?.click();

    expect(mockFederatedStore.resetStart).toHaveBeenCalledOnce();
    expect(mockFederatedStore.loadProviders).toHaveBeenCalledTimes(2);
  });
  it('should carry the invitation destination through registration, recovery and MFA links', async () => {
    const destination = '/invitations/invite-token';
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot, 'queryParamMap', 'get').mockReturnValue(
      convertToParamMap({ returnUrl: destination, extra: 'discard-me' }),
    );
    fixture.destroy();
    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href^="/auth/register"]')?.getAttribute('href')).toContain(
      'returnUrl=%2Finvitations%2Finvite-token',
    );
    expect(
      element.querySelector('a[href^="/auth/password-reset/forgot"]')?.getAttribute('href'),
    ).toContain('returnUrl=%2Finvitations%2Finvite-token');
    mfaRequired.set(true);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParams: { returnUrl: destination },
    });
  });

  it('should discard an external return destination from authentication links', async () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot, 'queryParamMap', 'get').mockReturnValue(
      convertToParamMap({ returnUrl: 'https://outside.example' }),
    );
    fixture.destroy();
    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('a[href^="/auth/register"]')
        ?.getAttribute('href'),
    ).toBe('/auth/register');
  });
});
