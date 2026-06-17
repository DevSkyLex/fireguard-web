import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { withMainNavigation } from '@features/main';
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

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarNavigation],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideDashboardLayoutSlots({
          navigation: [withMainNavigation(), ...withOrganizationNavigation()],
        }),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        provideRouter([
          { path: '', component: DummyPage },
          { path: 'organizations', component: DummyPage },
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

  it('should render navigation links and section dividers', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();

    // Home + Overview + Assets + Compliance sections are visible for the
    // granted permissions, so three dividers separate the four sections.
    expect(fixture.debugElement.queryAll(By.css('a[data-sidebar-item-id]')).length).toBe(7);
    expect(
      fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length,
    ).toBe(3);
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

    expect(labels).toEqual(['Home']);
    expect(labels).not.toContain('Organization');
  });

  it('should highlight the active route item', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const activeLinks = fixture.debugElement.queryAll(By.css('a[aria-current="page"]'));
    const homeLink = fixture.debugElement.query(By.css('a[data-sidebar-item-id="home"]'));
    const dashboardLink = fixture.debugElement.query(By.css('a[data-sidebar-item-id="dashboard"]'));

    expect(activeLinks.length).toBe(1);
    expect(homeLink.nativeElement.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink.nativeElement.getAttribute('aria-current')).toBeNull();
  });
});
