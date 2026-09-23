import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type RedirectFunction,
  type Route,
  type UrlTree,
} from '@angular/router';
import { APP_ROUTES } from '@app/app.routes';
import { FederatedLinkCallbackPage } from '@features/auth';
import { DashboardLayout } from '@layouts/dashboard-layout';
import { ACCOUNT_ROUTES } from '../account.routes';
import { AccountNotificationsPage } from '../ui/pages/account-notifications-page/account-notifications-page.component';
import { AccountOrganizationsPage } from '../ui/pages/account-organizations-page/account-organizations-page.component';
import { AccountPage } from '../ui/pages/account-page/account-page.component';
import { AccountProfilePage } from '../ui/pages/account-profile-page/account-profile-page.component';
import { AccountSecurityPage } from '../ui/pages/account-security-page/account-security-page.component';

const accountRoot = (): Route => {
  const route = ACCOUNT_ROUTES.find((candidate) => candidate.path === '');
  if (!route) throw new Error('Missing account page route.');
  return route;
};

const section = (path: string): Route => {
  const route = accountRoot().children?.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Missing account section: ${path}`);
  return route;
};

const expectPage = async (route: Route, componentType: unknown): Promise<void> => {
  const component = await route.loadComponent?.();
  expect(component).toBe(componentType);
};

describe('ACCOUNT_ROUTES', () => {
  it('mounts the account workspace beneath the authenticated dashboard shell', async () => {
    const dashboard = APP_ROUTES.find((route) => route.path === '');
    const entry = dashboard?.children?.find((route) => route.path === 'account');

    expect(dashboard?.component).toBe(DashboardLayout);
    expect(dashboard?.canActivate).toHaveLength(1);
    expect(dashboard?.runGuardsAndResolvers).toBe('always');
    expect(entry?.canActivate).toHaveLength(1);
    expect(await entry?.loadChildren?.()).toBe(ACCOUNT_ROUTES);
    await expectPage(accountRoot(), AccountPage);
  });

  it('keeps account sections under one stable account page', async () => {
    const sections = [
      ['profile', AccountProfilePage],
      ['security', AccountSecurityPage],
      ['organizations', AccountOrganizationsPage],
      ['notifications', AccountNotificationsPage],
    ] as const;

    await Promise.all(
      sections.map(async ([path, page]) => {
        const child = section(path);
        expect(child.canActivate).toBeUndefined();
        expect(child.data?.['breadcrumb']).toBeDefined();
        await expectPage(child, page);
      }),
    );
    expect(section('')).toMatchObject({ pathMatch: 'full', redirectTo: 'profile' });
  });

  it('keeps the connected provider callback inside account security', async () => {
    const callback = section('security/federated/:provider/callback');

    expect(callback.canActivate).toBeUndefined();
    expect(callback.data?.['breadcrumb']).toBe(section('security').data?.['breadcrumb']);
    await expectPage(callback, FederatedLinkCallbackPage);
  });

  it('redirects retired notification preference links to the preferences tab', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    const children = accountRoot().children ?? [];
    const preferences = section('notifications/preferences');
    const redirect = preferences.redirectTo as RedirectFunction;

    expect(children.indexOf(preferences)).toBeLessThan(children.indexOf(section('notifications')));
    const target = TestBed.runInInjectionContext(() =>
      redirect({
        queryParams: { source: 'bookmark' },
      } as unknown as Parameters<RedirectFunction>[0]),
    ) as UrlTree;
    expect(router.serializeUrl(target)).toBe('/account/notifications?tab=preferences');
  });
});
