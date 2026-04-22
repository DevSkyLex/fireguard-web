import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOTIFICATION_CENTER_PORT } from '@features/account/ports';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import { DashboardSidebarNavigationService } from '../dashboard-sidebar-navigation.service';

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

describe('DashboardSidebarNavigationService', () => {
  let service: DashboardSidebarNavigationService;
  const mockOrganizationStore = {
    selectedOrganization: signal<(typeof MOCK_ORG) | null>(MOCK_ORG),
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
      providers: [
        DashboardSidebarNavigationService,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
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

  it('should prefix organization routerLinks with the active organization path', () => {
    const menuItems = service.menuItems();
    const organization = menuItems.find((item) => item.label === 'Organization');
    const dashboardItem = organization?.items?.find((item) => item.label === 'Dashboard');

    expect(dashboardItem?.routerLink).toBe('/organizations/org-1');
  });

  it('should expose global navigation entries for home and organizations', () => {
    const menuItems = service.menuItems();
    const home = menuItems.find((item) => item.label === 'Home');

    expect(home?.items?.map((item) => item.label)).toEqual(['Home', 'Organizations']);
    expect(home?.items?.find((item) => item.label === 'Home')?.routerLink).toBe('/');
    expect(home?.items?.find((item) => item.label === 'Organizations')?.routerLink).toBe(
      '/organizations',
    );
  });

  it('should filter organization navigation items by granted permissions', () => {
    mockOrganizationMemberAccess.permissions.set([ORGANIZATION_PERMISSION.FACILITIES_READ]);

    const organization = service.menuItems().find((item) => item.label === 'Organization');

    expect(organization?.items?.map((item) => item.label)).toEqual(['Facilities']);
  });

  it('should support wildcard organization permissions', () => {
    mockOrganizationMemberAccess.permissions.set([ORGANIZATION_PERMISSION.ALL]);

    const organization = service.menuItems().find((item) => item.label === 'Organization');

    expect(organization?.items?.map((item) => item.label)).toEqual([
      'Dashboard',
      'Facilities',
      'Equipments',
      'Inspections',
    ]);
  });

  it('should hide the organization section when no active organization is selected', () => {
    mockOrganizationStore.selectedOrganization.set(null);

    expect(service.menuItems().map((item) => item.label)).toEqual(['Home', 'Account']);
  });

  it('should expose notification unread count as a badge', () => {
    mockNotificationCenterPort.unreadCount.set(4);
    mockNotificationCenterPort.hasUnread.set(true);

    const account = service.menuItems().find((item) => item.label === 'Account');
    const notifications = account?.items?.find((item) => item.label === 'Notifications');

    expect(notifications?.badge).toBe('4');
  });

  it('should filter menu items by query while keeping parent nodes', () => {
    service.setSearchQuery('Notifications');

    const menuItems = service.menuItems();
    const rootLabels = menuItems.map((item) => item.label);
    const account = menuItems.find((item) => item.label === 'Account');
    const notifItem = account?.items?.find((item) => item.label === 'Notifications');

    expect(rootLabels).toEqual(['Account']);
    expect(notifItem).toBeDefined();
  });

  it('should clear the query and restore full menu', () => {
    service.setSearchQuery('Notifications');
    expect(service.menuItems().map((item) => item.label)).toEqual(['Account']);

    service.clearSearchQuery();
    expect(service.menuItems().map((item) => item.label)).toEqual([
      'Home',
      'Organization',
      'Account',
    ]);
  });

  describe('primaryItems', () => {
    it('should contain only Home and Account sections', () => {
      const labels = service.primaryItems().map((item) => item.label);

      expect(labels).toEqual(['Home', 'Account']);
    });

    it('should never include the Organization section', () => {
      mockOrganizationStore.selectedOrganization.set(MOCK_ORG);

      const labels = service.primaryItems().map((item) => item.label);

      expect(labels).not.toContain('Organization');
    });

    it('should surface the notification badge', () => {
      mockNotificationCenterPort.unreadCount.set(7);

      const account = service.primaryItems().find((item) => item.label === 'Account');
      const notifications = account?.items?.find((item) => item.label === 'Notifications');

      expect(notifications?.badge).toBe('7');
    });

    it('should not be filtered by the search query', () => {
      service.setSearchQuery('zzz-no-match');

      const labels = service.primaryItems().map((item) => item.label);

      expect(labels).toEqual(['Home', 'Account']);
    });
  });
});
