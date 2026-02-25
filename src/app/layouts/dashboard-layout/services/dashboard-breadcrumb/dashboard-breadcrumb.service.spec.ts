import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type ActivatedRoute,
  type ActivatedRouteSnapshot,
  type Routes,
} from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';
import { DashboardBreadcrumbService } from './dashboard-breadcrumb.service';

@Component({
  template: '',
})
class TestPage {}

const MOCK_ORG = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: true,
  status: 'active',
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

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
              breadcrumb: (route: ActivatedRouteSnapshot) => `Notification ${route.paramMap.get('id')}`,
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
  const mockOrganizationStore = {
    selectedOrganization: signal(MOCK_ORG),
  };

  beforeEach(async () => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);

    TestBed.configureTestingModule({
      providers: [
        DashboardBreadcrumbService,
        provideRouter(TEST_ROUTES),
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });

    service = TestBed.inject(DashboardBreadcrumbService);
    router = TestBed.inject(Router);

    await router.navigateByUrl('/');
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a home breadcrumb item with organization link', () => {
    expect(service.home()).toMatchObject({
      icon: 'pi pi-home',
      routerLink: '/organizations/org-1',
    });
  });

  it('should build breadcrumbs from route data', async () => {
    await router.navigateByUrl('/account/notifications');

    expect(service.items().map((item) => item.label)).toEqual(['Account', 'Notifications']);
    expect(service.items().map((item) => item.routerLink)).toEqual([
      '/account',
      '/account/notifications',
    ]);
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
