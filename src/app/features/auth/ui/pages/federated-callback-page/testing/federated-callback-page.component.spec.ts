import { Location } from '@angular/common';
import { Component, PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AuthService } from '@features/auth/data-access';
import { mfaGuard } from '@features/auth/http/guards';
import type { LoginOutput } from '@features/auth/models';
import { FederatedReturnContextService } from '@features/auth/services';
import { ActiveTrustedDeviceStore, AuthStore, FederatedAuthStore } from '@features/auth/state';
import { FederatedCallbackPage } from '../federated-callback-page.component';

@Component({ template: '<main id="integrated-mfa-page">MFA</main>' })
class IntegratedMfaPage {}

describe('FederatedCallbackPage', () => {
  afterEach(() => {
    window.sessionStorage.removeItem('fireguard.auth.federated-return');
    TestBed.resetTestingModule();
  });

  it.each([
    ['error=access_denied&state=opaque-state', 'access_denied'],
    ['code=one-time-code&state=opaque-state', 'account_exists'],
    ['code=one-time-code&state=opaque-state', 'provider_unavailable'],
    ['error=access_denied', 'invalid_state'],
  ])('keeps invitation intent in the retry link after %s (%s)', async (query, message) => {
    const destination = '/organizations/invitations/accept?token=invitation-intent';
    const completeLogin = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'auth/federated/:provider/callback', component: FederatedCallbackPage },
          { path: 'auth/login', component: IntegratedMfaPage },
        ]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin,
            completeLoginResult: signal(null),
            completeLoginError: signal({
              error: null,
              code: 400,
              message,
              timestamp: 0,
              retryable: false,
            }),
            resetCompleteLogin: vi.fn(),
          },
        },
        { provide: AuthStore, useValue: { applySession: vi.fn(), sessionRevision: signal(0) } },
      ],
    });
    const context = TestBed.inject(FederatedReturnContextService);
    context.remember('google', destination);
    const replaceState = vi.spyOn(TestBed.inject(Location), 'replaceState');
    const harness = await RouterTestingHarness.create(`/auth/federated/google/callback?${query}`);
    const router = TestBed.inject(Router);
    const expectedRetry = router.serializeUrl(
      router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: destination } }),
    );
    const retry = harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a');
    expect(retry?.getAttribute('href')).toBe(expectedRetry);
    expect(context.consume('google')).toBe('');
    expect(replaceState).toHaveBeenCalledWith(
      `/auth/federated/google/callback?returnUrl=${encodeURIComponent(destination)}`,
    );

    retry?.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe(expectedRetry);

    await harness.navigateByUrl(
      `/auth/federated/google/callback?returnUrl=${encodeURIComponent(destination)}`,
    );
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe(
      expectedRetry,
    );
    expect(completeLogin).toHaveBeenCalledTimes(query.includes('state=') ? 1 : 0);
  });

  it('should leave the one-time callback untouched during SSR', () => {
    const completeLogin = vi.fn();
    const replaceState = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Location, useValue: { replaceState } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'google' }),
              queryParamMap: convertToParamMap({ code: 'one-time-code', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/auth/federated/google/callback?code=one-time-code&state=opaque-state',
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin,
            completeLoginResult: signal(null),
            completeLoginError: signal(null),
            resetCompleteLogin: vi.fn(),
          },
        },
        { provide: AuthStore, useValue: { applySession: vi.fn(), sessionRevision: signal(0) } },
      ],
    });
    TestBed.overrideComponent(FederatedCallbackPage, { set: { template: '' } });

    TestBed.createComponent(FederatedCallbackPage).detectChanges();

    expect(completeLogin).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('should consume the callback once in the browser after cleaning the URL', () => {
    const completeLogin = vi.fn();
    const replaceState = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Location, useValue: { replaceState } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'google' }),
              queryParamMap: convertToParamMap({ code: 'one-time-code', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/auth/federated/google/callback?code=one-time-code&state=opaque-state',
            navigate: vi.fn(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin,
            completeLoginResult: signal(null),
            completeLoginError: signal(null),
            resetCompleteLogin: vi.fn(),
          },
        },
        { provide: AuthStore, useValue: { applySession: vi.fn(), sessionRevision: signal(0) } },
      ],
    });
    TestBed.overrideComponent(FederatedCallbackPage, { set: { template: '' } });

    TestBed.createComponent(FederatedCallbackPage).detectChanges();

    expect(replaceState).toHaveBeenCalledWith('/auth/federated/google/callback');
    expect(completeLogin).toHaveBeenCalledOnce();
    expect(completeLogin).toHaveBeenCalledWith({
      provider: 'google',
      input: { code: 'one-time-code', state: 'opaque-state' },
    });
  });

  it('should submit a provider cancellation so the backend consumes the flow', () => {
    const completeLogin = vi.fn();
    const replaceState = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Location, useValue: { replaceState } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'google' }),
              queryParamMap: convertToParamMap({ error: 'access_denied', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/auth/federated/google/callback?error=access_denied&state=opaque-state',
            navigate: vi.fn(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin,
            completeLoginResult: signal(null),
            completeLoginError: signal(null),
            resetCompleteLogin: vi.fn(),
          },
        },
        { provide: AuthStore, useValue: { applySession: vi.fn(), sessionRevision: signal(0) } },
      ],
    });
    TestBed.overrideComponent(FederatedCallbackPage, { set: { template: '' } });

    TestBed.createComponent(FederatedCallbackPage).detectChanges();

    expect(replaceState).toHaveBeenCalledWith('/auth/federated/google/callback');
    expect(completeLogin).toHaveBeenCalledWith({
      provider: 'google',
      input: { error: 'access_denied', state: 'opaque-state' },
    });
  });

  it('discards a callback result if another session was established before its page continuation', async () => {
    const completeLoginResult = signal<LoginOutput | null>(null);
    const sessionRevision = signal(0);
    const applySession = vi.fn();
    const navigate = vi.fn();
    const navigateByUrl = vi.fn();
    const resetCompleteLogin = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Location, useValue: { replaceState: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'google' }),
              queryParamMap: convertToParamMap({ code: 'one-time-code', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/auth/federated/google/callback?code=one-time-code&state=opaque-state',
            navigate,
            navigateByUrl,
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin: vi.fn(),
            completeLoginResult,
            completeLoginError: signal(null),
            resetCompleteLogin,
          },
        },
        { provide: AuthStore, useValue: { applySession, sessionRevision } },
      ],
    });
    TestBed.overrideComponent(FederatedCallbackPage, { set: { template: '' } });
    const fixture = TestBed.createComponent(FederatedCallbackPage);
    fixture.detectChanges();
    completeLoginResult.set({
      '@id': '/api/auth/federated/google/complete',
      '@type': 'Token',
      access_token: 'obsolete-token',
    } as LoginOutput);
    sessionRevision.set(1);
    await fixture.whenStable();
    expect(applySession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(resetCompleteLogin).toHaveBeenCalledOnce();
  });

  it('should apply an MFA callback result before navigating to verification', async () => {
    const completeLoginResult = signal<LoginOutput | null>(null);
    const applySession = vi.fn();
    const navigate = vi.fn().mockResolvedValue(true);
    const resetCompleteLogin = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Location, useValue: { replaceState: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'google' }),
              queryParamMap: convertToParamMap({ code: 'one-time-code', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/auth/federated/google/callback?code=one-time-code&state=opaque-state',
            navigate,
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin: vi.fn(),
            completeLoginResult,
            completeLoginError: signal(null),
            resetCompleteLogin,
          },
        },
        { provide: AuthStore, useValue: { applySession, sessionRevision: signal(0) } },
      ],
    });
    TestBed.overrideComponent(FederatedCallbackPage, { set: { template: '' } });

    const fixture = TestBed.createComponent(FederatedCallbackPage);
    fixture.detectChanges();

    const result = {
      '@id': '/api/auth/federated/google/complete',
      '@type': 'Token',
      token_type: 'Bearer',
      mfa_required: true,
      mfa_token: 'pre-auth-token',
      challenge_token: 'challenge-token',
      mfa_method: 'email',
      mfa_destination: 'a***n@example.com',
      mfa_resend_in: 30,
      return_url: '/',
    } satisfies LoginOutput;
    completeLoginResult.set(result);
    await fixture.whenStable();

    expect(applySession).toHaveBeenCalledWith(result);
    expect(resetCompleteLogin).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/auth/mfa-verify'], {
      queryParams: { returnUrl: undefined },
      replaceUrl: true,
    });
  });

  it('should preserve the MFA challenge through the real route guard', async () => {
    const destination = '/organizations/invitations/accept?token=invitation-intent';
    const completeLoginResult = signal<LoginOutput | null>(null);
    const resetCompleteLogin = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          {
            path: 'auth/federated/:provider/callback',
            component: FederatedCallbackPage,
          },
          {
            path: 'auth/mfa-verify',
            canActivate: [mfaGuard],
            component: IntegratedMfaPage,
          },
          { path: 'auth/login', component: IntegratedMfaPage },
        ]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        {
          provide: USER_PROFILE_PORT,
          useValue: { load: vi.fn(), initialize: vi.fn(), clear: vi.fn() },
        },
        {
          provide: AuthService,
          useValue: {
            login: vi.fn(),
            logout: vi.fn(),
            refresh: vi.fn(),
            mfaVerify: vi.fn(),
            mfaResend: vi.fn(),
          },
        },
        {
          provide: ActiveTrustedDeviceStore,
          useValue: {
            clear: vi.fn(),
            pendingTrustDevice: vi.fn(() => false),
            trustDevice: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLogin: vi.fn(),
            completeLoginResult,
            completeLoginError: signal(null),
            resetCompleteLogin,
          },
        },
      ],
    });
    TestBed.overrideComponent(FederatedCallbackPage, { set: { template: '' } });

    TestBed.inject(FederatedReturnContextService).remember('google', destination);

    const harness = await RouterTestingHarness.create(
      '/auth/federated/google/callback?code=one-time-code&state=opaque-state',
    );
    const result = {
      '@id': '/api/auth/federated/google/complete',
      '@type': 'Token',
      token_type: 'Bearer',
      mfa_required: true,
      mfa_token: 'pre-auth-token',
      challenge_token: 'challenge-token',
      mfa_method: 'email',
      mfa_destination: 'a***n@example.com',
      mfa_resend_in: 30,
    } satisfies LoginOutput;

    completeLoginResult.set(result);
    await harness.fixture.whenStable();

    const router = TestBed.inject(Router);
    expect(router.url.split('?')[0]).toBe('/auth/mfa-verify');
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe(destination);
    expect(TestBed.inject(AuthStore).mfaRequired()).toBe(true);
    expect(TestBed.inject(AuthStore).mfaToken()).toBe('pre-auth-token');
    expect(resetCompleteLogin).toHaveBeenCalledOnce();
  });
});
