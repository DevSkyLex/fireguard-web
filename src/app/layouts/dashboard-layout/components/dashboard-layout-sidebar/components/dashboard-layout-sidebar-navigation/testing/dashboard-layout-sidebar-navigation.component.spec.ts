import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
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
  const unreadCount = signal(0);
  const mockNotificationCenter = { unreadCount };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    unreadCount.set(0);

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
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenter },
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

  it('should render the flat clusters without section headers', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();

    // Workspace cluster: dashboard, facilities, map (also facilities.read),
    // equipments, inspections. Utilities cluster: the permissionless inbox.
    expect(fixture.debugElement.queryAll(By.css('a[data-sidebar-item-id]')).length).toBe(6);
    expect(fixture.debugElement.query(By.css('p-panelmenu'))).toBeFalsy();

    // Both clusters are headerless — the prototype separates them by spacing.
    const textContent: string = fixture.nativeElement.textContent;
    expect(textContent).not.toContain('Assets');
    expect(textContent).not.toContain('Administration');
  });

  it('should expose organization links using the active organization id', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const workspace = component.menuItems().find((group) => group.id === 'workspace');
    const facilities = workspace?.items?.find((item) => item.label === 'Facilities');

    expect(facilities?.routerLink).toBe('/organizations/org-1/facilities');
  });

  it('should keep members, settings and the audit log out of the sidebar', () => {
    // Administration destinations are settings child routes now; even a member
    // holding their permissions gets no sidebar entry for them.
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.SETTINGS_WRITE,
    ]);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const ids = component
      .menuItems()
      .flatMap((group) => group.items ?? [])
      .map((item) => item.id);

    expect(ids).not.toContain('members');
    expect(ids).not.toContain('team');
    expect(ids).not.toContain('settings');
    expect(ids).not.toContain('audit');
    // SETTINGS_WRITE still surfaces billing, which is a real prototype entry.
    expect(ids).toContain('billing');
  });

  it('should link the inbox to the account surface with a live unread badge', () => {
    unreadCount.set(8);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const utilities = component.menuItems().find((group) => group.id === 'utilities');
    const inbox = utilities?.items?.find((item) => item.id === 'inbox');

    expect(inbox?.routerLink).toBe('/account/inbox');
    expect(inbox?.badge).toBe('8');
  });

  it('should not badge the inbox when nothing is unread', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const utilities = component.menuItems().find((group) => group.id === 'utilities');
    const inbox = utilities?.items?.find((item) => item.id === 'inbox');

    expect(inbox?.badge).toBeUndefined();
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

    const ids = component.menuItems().map((item) => item.id);

    // The single sidebar carries the two organization clusters only; the
    // former "Home" group was removed together with the organizations list.
    expect(ids).toEqual(['workspace', 'utilities']);
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
