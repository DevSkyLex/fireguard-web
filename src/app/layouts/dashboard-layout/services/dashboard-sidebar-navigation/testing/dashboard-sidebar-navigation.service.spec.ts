import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NAVIGATION_SLOT } from '@layouts/dashboard-layout/slots/navigation';
import type { NavigationContribution } from '@layouts/dashboard-layout/slots/navigation';
import { DashboardSidebarNavigationService } from '../dashboard-sidebar-navigation.service';

describe('DashboardSidebarNavigationService', () => {
  let service: DashboardSidebarNavigationService;

  const orgSectionVisible = signal(true);
  const notificationBadge = signal<string | undefined>(undefined);

  const homeContribution: NavigationContribution = {
    id: 'home',
    order: 10,
    section: signal({
      id: 'home',
      label: 'Home',
      expanded: true,
      items: [
        { id: 'home', label: 'Home', routerLink: '/' },
        { id: 'organizations', label: 'Organizations', routerLink: '/organizations' },
      ],
    }),
  };

  const orgContribution: NavigationContribution = {
    id: 'organization',
    order: 20,
    includeInPrimary: false,
    section: computed(() =>
      orgSectionVisible()
        ? {
            id: 'organization',
            label: 'Organization',
            expanded: true,
            items: [{ id: 'dashboard', label: 'Dashboard', routerLink: '/organizations/org-1' }],
          }
        : null,
    ),
  };

  const accountContribution: NavigationContribution = {
    id: 'account',
    order: 30,
    section: computed(() => ({
      id: 'account',
      label: 'Account',
      expanded: true,
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          routerLink: '/account/notifications',
          badge: notificationBadge(),
        },
      ],
    })),
  };

  beforeEach(() => {
    orgSectionVisible.set(true);
    notificationBadge.set(undefined);

    TestBed.configureTestingModule({
      providers: [
        DashboardSidebarNavigationService,
        { provide: NAVIGATION_SLOT, useValue: homeContribution, multi: true },
        { provide: NAVIGATION_SLOT, useValue: orgContribution, multi: true },
        { provide: NAVIGATION_SLOT, useValue: accountContribution, multi: true },
      ],
    });

    service = TestBed.inject(DashboardSidebarNavigationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the full menu by default', () => {
    const labels = service.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Home', 'Organization', 'Account']);
  });

  it('should expose global navigation entries for home and organizations', () => {
    const home = service.menuItems().find((item) => item.label === 'Home');

    expect(home?.items?.map((item) => item.label)).toEqual(['Home', 'Organizations']);
  });

  it('should respect contribution order when sections are registered out of order', () => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        DashboardSidebarNavigationService,
        // Registered in reverse order to validate sorting by `order`
        { provide: NAVIGATION_SLOT, useValue: accountContribution, multi: true },
        { provide: NAVIGATION_SLOT, useValue: orgContribution, multi: true },
        { provide: NAVIGATION_SLOT, useValue: homeContribution, multi: true },
      ],
    });

    const outOfOrderService = TestBed.inject(DashboardSidebarNavigationService);
    const labels = outOfOrderService.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Home', 'Organization', 'Account']);
  });

  it('should hide a section when its contribution returns null', () => {
    orgSectionVisible.set(false);

    expect(service.menuItems().map((item) => item.label)).toEqual(['Home', 'Account']);
  });

  it('should surface the notification badge from the account contribution', () => {
    notificationBadge.set('4');

    const account = service.menuItems().find((item) => item.label === 'Account');
    const notifications = account?.items?.find((item) => item.label === 'Notifications');

    expect(notifications?.badge).toBe('4');
  });

  describe('primaryItems', () => {
    it('should contain only sections included in the primary sidebar', () => {
      const labels = service.primaryItems().map((item) => item.label);

      expect(labels).toEqual(['Home', 'Account']);
    });

    it('should exclude sections with a null contribution', () => {
      orgSectionVisible.set(false);

      const labels = service.primaryItems().map((item) => item.label);

      expect(labels).toEqual(['Home', 'Account']);
    });

    it('should surface the notification badge', () => {
      notificationBadge.set('7');

      const account = service.primaryItems().find((item) => item.label === 'Account');
      const notifications = account?.items?.find((item) => item.label === 'Notifications');

      expect(notifications?.badge).toBe('7');
    });
  });
});
