import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { withAccountNavigation } from '@features/account';
import { NOTIFICATION_CENTER_PORT } from '@features/account/ports';
import { withMainNavigation } from '@features/main';
import { withOrganizationNavigation } from '@features/organization';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarNavigation } from '../components';
import { DashboardLayoutSidebar } from '../dashboard-layout-sidebar.component';

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

describe('DashboardLayoutSidebar', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal<typeof MOCK_ORG | null>(MOCK_ORG),
    organizations: signal([MOCK_ORG]),
    isLoadingOrganizations: signal(false),
    loadOrganizations: vi.fn(),
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
    mockOrganizationStore.loadOrganizations.mockReset();
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    mockNotificationCenterPort.unreadCount.set(0);
    mockNotificationCenterPort.hasUnread.set(false);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebar],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideRouter([]),
        ...withMainNavigation().providers,
        ...withOrganizationNavigation().providers,
        ...withAccountNavigation().providers,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render branding and section labels', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-header'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-navigation')),
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-footer'))).toBeFalsy();

    const panelMenus = fixture.debugElement.queryAll(By.css('p-panelmenu'));
    expect(panelMenus.length).toBe(3);
    expect(
      fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length,
    ).toBe(2);

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Fireguard');
    expect(textContent).toContain('Home');
    expect(textContent).toContain('Organizations');
    expect(textContent).toContain('Organization');
    expect(textContent).toContain('Dashboard');
    expect(textContent).toContain('Facilities');
    expect(textContent).toContain('Equipments');
    expect(textContent).toContain('Inspections');
    expect(textContent).toContain('Account');
    expect(textContent).toContain('Notifications');
  });

  it('should render a search input in the sidebar', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const searchInput = fixture.debugElement.query(By.css('[data-testid="sidebar-search-input"]'));

    expect(searchInput).toBeTruthy();
  });

  it('should filter groups and items based on search query', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly onSearchQueryChange: (value: string) => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    navigation.onSearchQueryChange('Notifications');

    const menuItems = navigation.menuItems();
    const rootLabels = menuItems.map((item) => item.label);
    const account = menuItems.find((item) => item.label === 'Account');
    const notifItem = account?.items?.find((item) => item.label === 'Notifications');

    expect(rootLabels).toEqual(['Account']);
    expect(notifItem).toBeDefined();
  });

  it('should clear search query and restore full menu', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly onSearchQueryChange: (value: string) => void;
      readonly onClearSearch: () => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    navigation.onSearchQueryChange('Notifications');
    expect(navigation.menuItems().map((group) => group.label)).toEqual(['Account']);

    navigation.onClearSearch();
    expect(navigation.menuItems().map((group) => group.label)).toEqual([
      'Home',
      'Organization',
      'Account',
    ]);
  });

  it('should configure notification badge from notification center state', () => {
    mockNotificationCenterPort.unreadCount.set(5);
    mockNotificationCenterPort.hasUnread.set(true);

    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const groups = navigation.menuItems();
    const accountGroup = groups.find((group) => group.label === 'Account');
    const notifications = accountGroup?.items?.find((item) => item.label === 'Notifications');

    expect(notifications?.badge).toBe('5');
  });

  it('should close sidebar only for routerLink leaf items', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const sidebarService = TestBed.inject(DashboardSidebarService);
    const closeSpy = vi.spyOn(sidebarService, 'close');
    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly onItemClick: (item: {
        readonly routerLink?: string;
        readonly items?: readonly unknown[];
      }) => void;
    };

    navigation.onItemClick({ routerLink: '/organizations/org-1' });
    navigation.onItemClick({ routerLink: '/organizations/org-1', items: [{}] });
    navigation.onItemClick({});

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should expose route as panelmenu routerLink with organization prefix', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly {
        readonly items?: readonly MenuItem[];
        readonly label?: string;
      }[];
    };

    const organizationPanel = navigation
      .menuItems()
      .find((group) => group.label === 'Organization');
    const dashboard = organizationPanel?.items?.find((item) => item.label === 'Dashboard');

    expect(dashboard?.routerLink).toBe('/organizations/org-1');
  });

  it('should keep stable top-level ordering', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const labels = navigation.menuItems().map((group) => group.label);

    expect(labels).toEqual(['Home', 'Organization', 'Account']);
  });

  it('should not render collapsed flyout ui', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="collapsed-flyout"]'))).toBeFalsy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="collapsed-flyout-backdrop"]')),
    ).toBeFalsy();
    expect(fixture.debugElement.query(By.css('p-menu'))).toBeFalsy();
  });
});
