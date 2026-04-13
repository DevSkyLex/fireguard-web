import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { DashboardSidebarNavigationService } from './dashboard-sidebar-navigation.service';

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
    selectedOrganization: signal(MOCK_ORG),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);

    TestBed.configureTestingModule({
      providers: [
        DashboardSidebarNavigationService,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
      ],
    });

    service = TestBed.inject(DashboardSidebarNavigationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the full menu by default', () => {
    const labels = service.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Home', 'Account']);
  });

  it('should prefix routerLinks with the organization path', () => {
    const menuItems = service.menuItems();
    const home = menuItems.find((item) => item.label === 'Home');
    const dashboardItem = home?.items?.find((item) => item.label === 'Dashboard');

    expect(dashboardItem?.routerLink).toBe('/organizations/org-1');
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
    expect(service.menuItems().map((item) => item.label)).toEqual(['Home', 'Account']);
  });
});
