import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { NOTIFICATION_CENTER_PORT, withAccountNavigation } from '@features/account';
import { withMainNavigation } from '@features/main';
import { withOrganizationNavigation } from '@features/organization';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import { DashboardLayoutSidebarNavigation } from '../dashboard-layout-sidebar-navigation.component';

@Component({
  template: '',
})
class DummyPage {}

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

describe('DashboardLayoutSidebarNavigation', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal<typeof MOCK_ORG | null>(MOCK_ORG),
  };
  const mockOrganizationMemberAccess = {
    permissions: signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]),
  };
  const mockNotificationCenterPort = {
    unreadCount: signal(0),
    hasUnread: signal(false),
    initialize: vi.fn(),
    load: vi.fn(),
    connectMercure: vi.fn(),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    mockNotificationCenterPort.unreadCount.set(0);
    mockNotificationCenterPort.hasUnread.set(false);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarNavigation],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideDashboardLayoutSlots({
          navigation: [
            withMainNavigation(),
            withOrganizationNavigation(),
            withAccountNavigation(),
          ],
        }),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
        provideRouter([
          { path: '', component: DummyPage },
          { path: 'organizations', component: DummyPage },
          { path: 'organizations/:organizationId', component: DummyPage },
          { path: 'organizations/:organizationId/facilities', component: DummyPage },
          { path: 'organizations/:organizationId/equipments', component: DummyPage },
          { path: 'organizations/:organizationId/inspections', component: DummyPage },
          { path: 'account/notifications', component: DummyPage },
        ]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render navigation links and section dividers', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('a[data-sidebar-item-id]')).length).toBe(7);
    expect(
      fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length,
    ).toBe(2);
    expect(fixture.debugElement.query(By.css('p-panelmenu'))).toBeFalsy();
  });

  it('should expose organization links using the active organization id', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const organization = component.menuItems().find((group) => group.label === 'Organization');
    const facilities = organization?.items?.find((item) => item.label === 'Facilities');

    expect(facilities?.routerLink).toBe('/organizations/org-1/facilities');
  });

  it('should show an empty state when no menu items are available', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No navigation items available.');
    expect(fixture.debugElement.queryAll(By.css('a[data-sidebar-item-id]')).length).toBe(0);
  });

  it('should close sidebar only for leaf items with routerLink', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const closeSpy = vi.spyOn(sidebarService, 'close');
    const component = fixture.componentInstance as unknown as {
      readonly onItemClick: (item: {
        readonly routerLink?: string;
        readonly items?: readonly unknown[];
      }) => void;
    };

    component.onItemClick({ routerLink: '/organizations/org-1' });
    component.onItemClick({ routerLink: '/organizations/org-1', items: [{}] });
    component.onItemClick({});

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should render only the sections provided via the items input', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const service = TestBed.inject(DashboardSidebarNavigationService);

    fixture.componentRef.setInput('items', service.primaryItems());
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const labels = component.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Home', 'Account']);
    expect(labels).not.toContain('Organization');
  });

  it('should surface unread notifications as a badge', () => {
    mockNotificationCenterPort.unreadCount.set(3);
    mockNotificationCenterPort.hasUnread.set(true);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const account = component.menuItems().find((group) => group.label === 'Account');
    const notifications = account?.items?.find((item) => item.label === 'Notifications');

    expect(notifications?.badge).toBe('3');
  });

  it('should highlight the active route item', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account/notifications');

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const activeLinks = fixture.debugElement.queryAll(By.css('a[aria-current="page"]'));
    const notificationsLink = fixture.debugElement.query(
      By.css('a[data-sidebar-item-id="notifications"]'),
    );
    const dashboardLink = fixture.debugElement.query(By.css('a[data-sidebar-item-id="dashboard"]'));

    expect(activeLinks.length).toBe(1);
    expect(notificationsLink.nativeElement.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink.nativeElement.getAttribute('aria-current')).toBeNull();
  });
});
