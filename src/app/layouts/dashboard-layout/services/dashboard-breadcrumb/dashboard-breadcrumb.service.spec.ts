import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type ActivatedRoute,
  type ActivatedRouteSnapshot,
  type Routes,
} from '@angular/router';
import { DashboardBreadcrumbService } from './dashboard-breadcrumb.service';

@Component({
  template: '',
})
class TestPage {}

const TEST_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: TestPage,
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'organization',
        data: { breadcrumb: 'Organization' },
        children: [
          {
            path: 'members',
            component: TestPage,
            data: { breadcrumb: 'Members' },
          },
          {
            path: 'members/:id',
            component: TestPage,
            resolve: {
              breadcrumb: (route: ActivatedRouteSnapshot) => `Member ${route.paramMap.get('id')}`,
            },
          },
          {
            path: 'settings',
            component: TestPage,
            title: 'Settings',
          },
        ],
      },
    ],
  },
];

describe('DashboardBreadcrumbService', () => {
  let service: DashboardBreadcrumbService;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [DashboardBreadcrumbService, provideRouter(TEST_ROUTES)],
    });

    service = TestBed.inject(DashboardBreadcrumbService);
    router = TestBed.inject(Router);

    await router.navigateByUrl('/');
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a home breadcrumb item', () => {
    expect(service.home).toMatchObject({
      icon: 'pi pi-home',
      routerLink: '/',
    });
  });

  it('should build breadcrumbs from route data', async () => {
    await router.navigateByUrl('/organization/members');

    expect(service.items().map((item) => item.label)).toEqual(['Organization', 'Members']);
    expect(service.items().map((item) => item.routerLink)).toEqual([
      '/organization',
      '/organization/members',
    ]);
  });

  it('should fallback to route title when breadcrumb data is missing', async () => {
    await router.navigateByUrl('/organization/settings');

    expect(service.items().map((item) => item.label)).toEqual(['Organization', 'Settings']);
  });

  it('should use resolved breadcrumb label from route snapshot data', async () => {
    await router.navigateByUrl('/organization/members/42');
    expect(service.items().map((item) => item.label)).toEqual(['Organization', 'Member 42']);

    await router.navigateByUrl('/organization/members/84');
    expect(service.items().map((item) => item.label)).toEqual(['Organization', 'Member 84']);
  });

  it('should expose root breadcrumb on empty-path route', async () => {
    await router.navigateByUrl('/');

    expect(service.items().map((item) => item.label)).toEqual(['Dashboard']);
    expect(service.items()[0]?.routerLink).toBe('/');
  });

  it('should safely ignore route nodes without snapshot', () => {
    const unsafeRoute = {
      snapshot: undefined,
      routeConfig: null,
      firstChild: null,
    } as unknown as ActivatedRoute;

    const items = (service as unknown as { buildBreadcrumbs: (route: ActivatedRoute) => unknown[] })
      .buildBreadcrumbs(unsafeRoute);

    expect(items).toEqual([]);
  });
});
