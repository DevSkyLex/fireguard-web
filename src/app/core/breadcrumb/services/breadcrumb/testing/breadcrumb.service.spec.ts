import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type ActivatedRoute,
  type ActivatedRouteSnapshot,
  type Routes,
} from '@angular/router';
import { TitleService } from '@core/title';
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
      {
        path: 'workspace',
        title: 'Workspace',
        children: [
          {
            path: '',
            component: TestPage,
            data: { breadcrumb: false },
          },
        ],
      },
    ],
  },
];

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let router: Router;
  let pageTitle: WritableSignal<string>;

  beforeEach(async () => {
    pageTitle = signal<string>('');

    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        provideRouter(TEST_ROUTES),
        { provide: TitleService, useValue: { pageTitle } },
      ],
    });

    service = TestBed.inject(BreadcrumbService);
    router = TestBed.inject(Router);

    await router.navigateByUrl('/');
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  /**
   * The home node carries no label and no icon: how it is rendered is the
   * presentation layer's call, and the service only states where it points.
   */
  it('should expose a home breadcrumb item linking to root', () => {
    expect(service.home()).toEqual({
      routerLink: '/',
      current: false,
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

  it('should follow the live page title on a current page labelled from its route title', async () => {
    await router.navigateByUrl('/account/settings');

    pageTitle.set('Fire extinguisher — Kidde Pro 210');

    expect(service.items().map((item) => item.label)).toEqual([
      'Account',
      'Fire extinguisher — Kidde Pro 210',
    ]);
  });

  it('should not overlay the live page title on a current page labelled from breadcrumb data', async () => {
    await router.navigateByUrl('/account/notifications');

    pageTitle.set('Something else entirely');

    expect(service.items().map((item) => item.label)).toEqual(['Account', 'Notifications']);
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
    expect(lastItem.current).toBe(true);
  });

  it('should safely ignore route nodes without snapshot', () => {
    const unsafeRoute = {
      snapshot: undefined,
      routeConfig: null,
      firstChild: null,
    } as unknown as ActivatedRoute;

    const result = (
      service as unknown as {
        buildBreadcrumbs: (route: ActivatedRoute) => {
          trail: unknown[];
          deepestSuppressed: boolean;
        };
      }
    ).buildBreadcrumbs(unsafeRoute);

    expect(result.trail).toEqual([]);
  });

  /**
   * `organization-today-page`'s own bug: the leaf suppresses its breadcrumb
   * (`data.breadcrumb: false`) under a title-only ancestor, which used to
   * leave that ancestor's node as the trail's last entry, marked `current`
   * and overlaid with the leaf's own live page title.
   */
  it('should not mark an ancestor current when the deepest route suppresses its own breadcrumb', async () => {
    await router.navigateByUrl('/workspace');

    pageTitle.set('Some unrelated leaf title');

    const items = service.items();

    expect(items.map((item) => item.label)).toEqual(['Workspace']);
    expect(items.every((item) => item.current === false)).toBe(true);
    expect(items[0]?.routerLink).toBe('/workspace');
  });
});
