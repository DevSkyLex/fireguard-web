import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import {
  PAGE_HEADER_SLOT,
  type PageHeaderContribution,
} from '@layouts/dashboard-layout/slots/page-header';
import { DashboardPageHeaderService } from '../dashboard-page-header.service';

@Component({ template: '' })
class TestPage {}

@Component({ template: 'export' })
class ExportAction {}

@Component({ template: 'import' })
class ImportAction {}

const TEST_ROUTES: Routes = [
  { path: '', component: TestPage },
  { path: 'settings', component: TestPage, title: 'Settings' },
  {
    path: 'parent',
    title: 'Parent',
    children: [
      { path: '', component: TestPage },
      { path: 'child', component: TestPage, title: 'Child' },
    ],
  },
];

describe('DashboardPageHeaderService', () => {
  const setup = (contributions: PageHeaderContribution[] = []) => {
    TestBed.configureTestingModule({
      providers: [
        DashboardPageHeaderService,
        provideRouter(TEST_ROUTES),
        ...contributions.map((contribution) => ({
          provide: PAGE_HEADER_SLOT,
          useValue: contribution,
          multi: true,
        })),
      ],
    });

    const service = TestBed.inject(DashboardPageHeaderService);
    const router = TestBed.inject(Router);
    return { service, router };
  };

  it('should expose no title for routes without one', async () => {
    const { service, router } = setup();
    await router.navigateByUrl('/');

    expect(service.title()).toBeNull();
  });

  it('should resolve the title from the route title', async () => {
    const { service, router } = setup();
    await router.navigateByUrl('/settings');

    expect(service.title()).toBe('Settings');
  });

  it('should resolve the deepest defined title', async () => {
    const { service, router } = setup();

    await router.navigateByUrl('/parent/child');
    expect(service.title()).toBe('Child');

    await router.navigateByUrl('/parent');
    expect(service.title()).toBe('Parent');
  });

  it('should clear the title when navigating to a route without one', async () => {
    const { service, router } = setup();

    await router.navigateByUrl('/settings');
    expect(service.title()).toBe('Settings');

    await router.navigateByUrl('/');
    expect(service.title()).toBeNull();
  });

  it('should expose no actions when the slot has no contributions', () => {
    const { service } = setup();

    expect(service.actions).toEqual([]);
  });

  it('should expose slot action components sorted by ascending order', () => {
    const { service } = setup([
      { id: 'import', order: 20, component: ImportAction },
      { id: 'export', order: 10, component: ExportAction },
    ]);

    expect(service.actions).toEqual([ExportAction, ImportAction]);
  });
});
