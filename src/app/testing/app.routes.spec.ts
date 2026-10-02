import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { authGuard } from '@features/auth/http/guards';
import { AuthStore } from '@features/auth/state';
import { onboardingRequiredGuard } from '@features/onboarding/http/guards';
import { OnboardingStore } from '@features/onboarding/state';
import { DashboardLayout, DashboardPanelRegistry } from '@layouts/dashboard-layout';
import { APP_ROUTES } from '../app.routes';

@Component({ template: '' })
class GuardedDestinationPage {}

describe('APP_ROUTES', () => {
  const authenticated = signal(false);
  const ensureLoaded = vi.fn();

  beforeEach(async () => {
    authenticated.set(false);
    ensureLoaded.mockReset().mockReturnValue(of({ state: 'completed' }));
    const { APP_DASHBOARD_ROUTES: dashboardRoutes } = await import('../app.dashboard.routes');
    const dashboard = dashboardRoutes.find((route) => route.path === '');
    expect(dashboard).toBeDefined();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth/login', component: GuardedDestinationPage },
          {
            path: '',
            loadChildren: () => [
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
                      {
                        path: 'security/federated/google/callback',
                        component: GuardedDestinationPage,
                      },
                    ],
                  },
                  {
                    path: 'organizations',
                    canActivate: dashboard?.children?.find(
                      (route) => route.path === 'organizations',
                    )?.canActivate,
                    children: [{ path: ':id', component: GuardedDestinationPage }],
                  },
                ],
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

  it('loads one dashboard parent with shared providers after public entry routes', async () => {
    const entry = APP_ROUTES.find((route) => route.path === '');
    expect(entry?.component).toBeUndefined();
    expect(entry?.providers).toBeUndefined();
    expect(entry?.children).toBeUndefined();
    expect(entry?.loadChildren).toBeTypeOf('function');
    const { APP_DASHBOARD_ROUTES: routes } = await import('../app.dashboard.routes');
    expect(await entry?.loadChildren?.()).toBe(routes);
    expect(routes).toHaveLength(1);
    const dashboard = routes[0];
    if (!dashboard) throw new Error('Missing lazy dashboard parent.');
    expect(dashboard.component).toBe(DashboardLayout);
    expect(dashboard.canActivate).toEqual([authGuard]);
    expect(dashboard.runGuardsAndResolvers).toBe('always');
    expect(dashboard.providers?.[0]).toBe(DashboardPanelRegistry);
    expect(dashboard.providers).toHaveLength(4);
    for (const path of ['account', 'organizations']) {
      const child = dashboard.children?.find((route) => route.path === path);
      expect(child?.canActivate).toEqual([onboardingRequiredGuard]);
      expect(child?.providers).toBeUndefined();
      expect(child?.loadChildren).toBeTypeOf('function');
    }
    expect(dashboard.children?.find((route) => route.path === '')).toMatchObject({
      pathMatch: 'full',
      redirectTo: 'organizations',
    });
    const dashboardIndex = APP_ROUTES.findIndex((route) => route.path === '');
    for (const path of [
      'auth',
      'onboarding',
      'error',
      'maintenance',
      'organizations/invitations/accept',
    ]) {
      expect(APP_ROUTES.findIndex((route) => route.path === path)).toBeLessThan(dashboardIndex);
    }
    expect(APP_ROUTES.findIndex((route) => route.path === '**')).toBeGreaterThan(dashboardIndex);
  });

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
