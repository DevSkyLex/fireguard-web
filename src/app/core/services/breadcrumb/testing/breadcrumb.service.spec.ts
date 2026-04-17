import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type ActivatedRoute,
  type ActivatedRouteSnapshot,
  type Routes,
} from '@angular/router';
import { BreadcrumbService } from '../breadcrumb.service';

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
        path: 'account',
        data: { breadcrumb: 'Account' },
        children: [
          {
            path: 'notifications',
            component: TestPage,
            data: { breadcrumb: 'Notifications' },
          },
          {
            path: 'notifications/:id',
            component: TestPage,
            resolve: {
              breadcrumb: (route: ActivatedRouteSnapshot) =>
                `Notification ${route.paramMap.get('id')}`,
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

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [BreadcrumbService, provideRouter(TEST_ROUTES)],
    });

    service = TestBed.inject(BreadcrumbService);
    router = TestBed.inject(Router);

    await router.navigateByUrl('/');
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a home breadcrumb item linking to root', () => {
    expect(service.home()).toMatchObject({
      icon: 'pi pi-home',
      routerLink: '/',
    });
  });

  it('should build breadcrumbs from route data', async () => {
    await router.navigateByUrl('/account/notifications');

    expect(service.items().map((item) => item.label)).toEqual(['Account', 'Notifications']);
  });

  it('should fallback to route title when breadcrumb data is missing', async () => {
    await router.navigateByUrl('/account/settings');

    expect(service.items().map((item) => item.label)).toEqual(['Account', 'Settings']);
  });

  it('should use resolved breadcrumb label from route snapshot data', async () => {
    await router.navigateByUrl('/account/notifications/42');
    expect(service.items().map((item) => item.label)).toEqual(['Account', 'Notification 42']);

    await router.navigateByUrl('/account/notifications/84');
    expect(service.items().map((item) => item.label)).toEqual(['Account', 'Notification 84']);
  });

  it('should expose root breadcrumb on empty-path route', async () => {
    await router.navigateByUrl('/');

    expect(service.items().map((item) => item.label)).toEqual(['Dashboard']);
  });

  it('should make last breadcrumb item non-clickable', async () => {
    await router.navigateByUrl('/account/notifications');

    const items = service.items();
    const lastItem = items[items.length - 1];

    expect(lastItem.routerLink).toBeUndefined();
    expect(lastItem.linkClass).toContain('!cursor-default');
  });

  it('should safely ignore route nodes without snapshot', () => {
    const unsafeRoute = {
      snapshot: undefined,
      routeConfig: null,
      firstChild: null,
    } as unknown as ActivatedRoute;

    const items = (
      service as unknown as { buildBreadcrumbs: (route: ActivatedRoute) => unknown[] }
    ).buildBreadcrumbs(unsafeRoute);

    expect(items).toEqual([]);
  });
});
