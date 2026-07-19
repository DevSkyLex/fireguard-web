import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import { withOrganizationNavigation } from '@features/organization';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import { provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
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
  const auditReadGranted = signal(false);
  const mockUserPermissions = {
    hasPermission: (permission: string): boolean =>
      permission === ACCOUNT_PERMISSION.AUDIT_READ && auditReadGranted(),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    auditReadGranted.set(false);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarNavigation],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideDashboardLayoutSlots({
          navigation: [...withOrganizationNavigation()],
        }),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: UserPermissionService, useValue: mockUserPermissions },
        provideRouter([
          { path: '', component: DummyPage },
          { path: 'organizations/:organizationId', component: DummyPage },
          { path: 'organizations/:organizationId/facilities', component: DummyPage },
          { path: 'organizations/:organizationId/equipments', component: DummyPage },
          { path: 'organizations/:organizationId/inspections', component: DummyPage },
        ]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render navigation links grouped in labelled sections', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();

    // Overview + Assets + Compliance sections are visible for the granted
    // permissions: dashboard, facilities, map (also facilities.read),
    // equipments, inspections.
    expect(fixture.debugElement.queryAll(By.css('a[data-sidebar-item-id]')).length).toBe(5);
    expect(fixture.debugElement.query(By.css('p-panelmenu'))).toBeFalsy();
  });

  it('should expose organization links using the active organization id', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const assets = component.menuItems().find((group) => group.label === 'Assets');
    const facilities = assets?.items?.find((item) => item.label === 'Facilities');

    expect(facilities?.routerLink).toBe('/organizations/org-1/facilities');
  });

  it('should append the audit log entry to Administration when audit.read is granted', () => {
    auditReadGranted.set(true);
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.MEMBERS_READ,
    ]);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const administration = component.menuItems().find((group) => group.id === 'administration');
    const audit = administration?.items?.find((item) => item.id === 'audit');

    expect(administration?.items?.map((item) => item.label)).toEqual(['Members', 'Audit log']);
    expect(audit?.routerLink).toBe('/organizations/org-1/audit');
  });

  it('should create the Administration section for audit.read alone', () => {
    // No org administration member permission is granted: the section only
    // exists because the global audit.read account permission demands it.
    auditReadGranted.set(true);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const administration = component.menuItems().find((group) => group.id === 'administration');

    expect(administration?.label).toBe('Administration');
    expect(administration?.items?.map((item) => item.id)).toEqual(['audit']);
  });

  it('should hide the audit log entry without the global audit.read permission', () => {
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.MEMBERS_READ,
    ]);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const administration = component.menuItems().find((group) => group.id === 'administration');

    expect(administration?.items?.map((item) => item.id)).toEqual(['members']);
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

    // The single sidebar carries the organization sections only; the former
    // "Home" group was removed together with the organizations list page.
    expect(labels).toEqual(['Overview', 'Assets', 'Compliance']);
    expect(labels).not.toContain('Home');
    expect(labels).not.toContain('Organization');
  });

  it('should highlight the active route item', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/organizations/org-1');

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const activeLinks = fixture.debugElement.queryAll(By.css('a[aria-current="page"]'));
    const dashboardLink = fixture.debugElement.query(By.css('a[data-sidebar-item-id="dashboard"]'));
    const facilitiesLink = fixture.debugElement.query(
      By.css('a[data-sidebar-item-id="facilities"]'),
    );

    expect(activeLinks.length).toBe(1);
    expect(dashboardLink.nativeElement.getAttribute('aria-current')).toBe('page');
    expect(facilitiesLink.nativeElement.getAttribute('aria-current')).toBeNull();
  });
});
