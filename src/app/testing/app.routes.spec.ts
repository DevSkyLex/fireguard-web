import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthStore } from '@features/auth/state';
import { OnboardingStore } from '@features/onboarding/state';
import { APP_ROUTES } from '../app.routes';

@Component({ template: '' })
class GuardedDestinationPage {}

describe('APP_ROUTES', () => {
  const authenticated = signal(false);
  const ensureLoaded = vi.fn();

  beforeEach(() => {
    authenticated.set(false);
    ensureLoaded.mockReset().mockReturnValue(of({ state: 'completed' }));
    const dashboard = APP_ROUTES.find((route) => route.path === '');
    expect(dashboard).toBeDefined();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth/login', component: GuardedDestinationPage },
          {
            path: '',
            canActivate: dashboard?.canActivate,
            runGuardsAndResolvers: dashboard?.runGuardsAndResolvers,
            children: [
              {
                path: 'account',
                canActivate: dashboard?.children?.find((route) => route.path === 'account')
                  ?.canActivate,
                children: [
                  { path: 'security', component: GuardedDestinationPage },
                  { path: 'security/federated/google/callback', component: GuardedDestinationPage },
                ],
              },
              {
                path: 'organizations',
                canActivate: dashboard?.children?.find((route) => route.path === 'organizations')
                  ?.canActivate,
                children: [{ path: ':id', component: GuardedDestinationPage }],
              },
            ],
          },
        ]),
        { provide: AuthStore, useValue: { isAuthenticated: authenticated } },
        { provide: OnboardingStore, useValue: { ensureLoaded, loadError: signal(null) } },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each(['/account/security', '/organizations/alpha?view=all'])(
    'authenticates before reading onboarding on anonymous entry %s',
    async (destination) => {
      await RouterTestingHarness.create(destination);
      const router = TestBed.inject(Router);
      expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe(destination);
      expect(router.url.split('?')[0]).toBe('/auth/login');
      expect(ensureLoaded).not.toHaveBeenCalled();
    },
  );

  it('checks onboarding after authentication succeeds', async () => {
    authenticated.set(true);
    await RouterTestingHarness.create('/organizations/alpha');
    expect(TestBed.inject(Router).url).toBe('/organizations/alpha');
    expect(ensureLoaded).toHaveBeenCalledOnce();
  });

  it('rechecks authentication when the dashboard parent is reused', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create('/organizations/alpha');
    ensureLoaded.mockClear();
    authenticated.set(false);
    await harness.navigateByUrl('/account/security');
    const router = TestBed.inject(Router);
    expect(router.url.split('?')[0]).toBe('/auth/login');
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/account/security');
    expect(ensureLoaded).not.toHaveBeenCalled();
  });

  it('does not retain credentials from an expired account connection callback', async () => {
    await RouterTestingHarness.create(
      '/account/security/federated/google/callback?code=private-code&state=private-state',
    );
    const router = TestBed.inject(Router);
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/account/security');
    expect(router.url).not.toContain('private-');
    expect(ensureLoaded).not.toHaveBeenCalled();
  });
});
