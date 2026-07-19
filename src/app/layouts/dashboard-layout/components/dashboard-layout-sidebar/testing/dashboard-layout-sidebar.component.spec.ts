import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { NOTIFICATION_CENTER_PORT } from '@features/account';
import { withOrganizationNavigation } from '@features/organization';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import { provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarNavigation } from '../components';
import { DashboardLayoutSidebar } from '../dashboard-layout-sidebar.component';

@Component({ template: '<div data-testid="lead-widget-stub"></div>' })
class LeadWidgetStub {}

@Component({ template: '<div data-testid="footer-widget-stub"></div>' })
class FooterWidgetStub {}

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

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationStore.loadOrganizations.mockReset();
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebar],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideRouter([]),
        provideDashboardLayoutSlots({
          navigation: [...withOrganizationNavigation()],
          sidebar: [
            {
              useFactory: () => ({
                id: 'lead-stub',
                order: 10,
                region: 'lead',
                component: LeadWidgetStub,
              }),
            },
            {
              useFactory: () => ({
                id: 'footer-stub',
                order: 10,
                region: 'footer',
                component: FooterWidgetStub,
              }),
            },
          ],
        }),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: NOTIFICATION_CENTER_PORT, useValue: { unreadCount: signal(0) } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render branding, slot widgets and section labels', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-header'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-navigation')),
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-footer'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="lead-widget-stub"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="footer-widget-stub"]'))).toBeTruthy();

    // Workspace cluster: dashboard, facilities, map (also facilities.read),
    // equipments, inspections — plus the permissionless inbox utility.
    expect(fixture.debugElement.queryAll(By.css('a[data-sidebar-item-id]')).length).toBe(6);
    expect(fixture.debugElement.query(By.css('p-panelmenu'))).toBeFalsy();

    const textContent = fixture.nativeElement.textContent;
    // The header shows the workspace name inside an organization.
    expect(textContent).toContain('Acme Corp');
    expect(textContent).toContain('Overview');
    expect(textContent).toContain('Facilities');
    expect(textContent).toContain('Equipments');
    expect(textContent).toContain('Inspections');
    expect(textContent).toContain('Inbox');
    // The flat prototype sidebar has no section headers.
    expect(textContent).not.toContain('Assets');
    expect(textContent).not.toContain('Administration');
  });

  it('should hide the slot widgets in primary icon-only mode', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.componentRef.setInput('variant', 'primary');
    fixture.componentRef.setInput('iconOnly', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-footer'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('[data-testid="lead-widget-stub"]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('[data-testid="footer-widget-stub"]'))).toBeFalsy();
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

  it('should expose route as sidebar routerLink with organization prefix', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly {
        readonly items?: readonly MenuItem[];
        readonly label?: string;
      }[];
    };

    const workspace = navigation
      .menuItems()
      .find((group) => (group as { readonly id?: string }).id === 'workspace');
    const overview = workspace?.items?.find((item) => item.label === 'Overview');

    expect(overview?.routerLink).toBe('/organizations/org-1');
  });

  it('should keep stable top-level ordering', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const ids = navigation.menuItems().map((group) => group.id);

    expect(ids).toEqual(['workspace', 'utilities']);
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
