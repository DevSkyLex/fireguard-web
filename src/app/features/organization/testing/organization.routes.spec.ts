import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type RedirectFunction,
  type Route,
  type UrlTree,
} from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY } from '@core/routing';
import { ORGANIZATION_ROUTES } from '../organization.routes';

const organizationRoute = (): Route => {
  const route = ORGANIZATION_ROUTES.find((candidate) => candidate.path === ':organizationId');
  if (!route) throw new Error('Organization workspace route is missing.');
  return route;
};

const child = (path: string): Route => {
  const route = organizationRoute().children?.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Organization ${path} route is missing.`);
  return route;
};

describe('organization routes', () => {
  it('keeps organization context and access checks above every workspace page', () => {
    const route = organizationRoute();

    expect(route.canActivate).toHaveLength(1);
    expect(route.resolve?.['organization']).toBeDefined();
    expect(route.title).toBeDefined();
    expect(child('members').canActivate).toHaveLength(1);
    expect(child('settings').canActivate).toHaveLength(1);
    expect(child('members/:memberId').canActivate).toBeUndefined();
  });

  it.each([
    ['team', 'roles'],
    ['teams', 'teams'],
  ])(
    'redirects retired %s links to the correct tab without losing query parameters',
    (path, tab) => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      const router = TestBed.inject(Router);
      const redirect = child(path).redirectTo as RedirectFunction;

      const target = TestBed.runInInjectionContext(() =>
        redirect({
          paramMap: { get: (name: string) => (name === 'organizationId' ? 'org-1' : null) },
          queryParams: { page: '2', tab: 'old', origin: 'bookmark' },
        } as unknown as Parameters<RedirectFunction>[0]),
      ) as UrlTree;

      expect(router.serializeUrl(target)).toBe(
        `/organizations/org-1/members?page=2&tab=${tab}&origin=bookmark`,
      );
    },
  );

  it('keeps the estate explorer scoped and the primary mobile pages identifiable', () => {
    const assets = child('assets');
    expect(assets.canActivate).toHaveLength(1);
    expect(assets.providers).toHaveLength(3);
    expect(assets.data?.[DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]).toBe(true);
    expect(child('more').data?.[DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]).toBe(true);
    expect(child('').data?.[DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]).toBe(true);
  });

  it.each(['interventions', 'facilities', 'messages', 'channels'])(
    'loads the %s child route tree from its feature chunk',
    async (path) => {
      const loadChildren = child(path).loadChildren;
      if (!loadChildren) throw new Error(`${path} has no route loader.`);

      const routes = await loadChildren();
      expect(Array.isArray(routes)).toBe(true);
      expect((routes as Route[]).length).toBeGreaterThan(0);
    },
  );

  it.each(['', 'assets', 'members', 'settings'])(
    'loads the %s workspace page component from its route chunk',
    async (path) => {
      const loadComponent = child(path).loadComponent;
      if (!loadComponent) throw new Error(`${path} has no page loader.`);

      expect(typeof (await loadComponent())).toBe('function');
    },
  );
});
