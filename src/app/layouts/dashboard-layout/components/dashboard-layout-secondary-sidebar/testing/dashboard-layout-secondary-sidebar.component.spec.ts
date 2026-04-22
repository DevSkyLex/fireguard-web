import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NOTIFICATION_CENTER_PORT } from '@features/account/ports';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT, ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutSecondarySidebar } from '../dashboard-layout-secondary-sidebar.component';

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

describe('DashboardLayoutSecondarySidebar', () => {
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

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSecondarySidebar],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
        provideRouter([
          { path: '', component: class {} },
          { path: 'organizations/:organizationId', component: class {} },
          { path: 'organizations/:organizationId/facilities', component: class {} },
          { path: 'organizations/:organizationId/equipments', component: class {} },
          { path: 'organizations/:organizationId/inspections', component: class {} },
        ]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the navigation component', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-navigation')),
    ).toBeTruthy();
  });

  it('should display organization-scoped navigation items', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent as string;

    expect(textContent).toContain('Organization');
    expect(textContent).toContain('Dashboard');
    expect(textContent).toContain('Facilities');
    expect(textContent).toContain('Equipments');
    expect(textContent).toContain('Inspections');
  });

  it('should not display global navigation items', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent as string;

    expect(textContent).not.toContain('Home');
    expect(textContent).not.toContain('Notifications');
  });

  it('should show a search input', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="sidebar-search-input"]')),
    ).toBeTruthy();
  });

  it('should display no results when the org has no matching permissions', () => {
    mockOrganizationMemberAccess.permissions.set([]);

    const fixture = TestBed.createComponent(DashboardLayoutSecondarySidebar);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results found.');
  });
});
