import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { installMatchMediaMock } from '@shared/testing/match-media.mock';
import { OrganizationNavPanel } from '../organization-nav-panel.component';

@Component({
  template: '',
})
class DummyRouteComponent {}

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

describe('OrganizationNavPanel', () => {
  const mockOrganizationContext = {
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
    installMatchMediaMock();
    mockOrganizationContext.selectedOrganization.set(MOCK_ORG);
    mockOrganizationMemberAccess.permissions.set([
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);

    TestBed.configureTestingModule({
      imports: [OrganizationNavPanel],
      providers: [
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationContext },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: mockOrganizationMemberAccess },
        provideRouter([
          { path: '', component: DummyRouteComponent },
          { path: 'organizations/:organizationId', component: DummyRouteComponent },
          { path: 'organizations/:organizationId/facilities', component: DummyRouteComponent },
          { path: 'organizations/:organizationId/equipments', component: DummyRouteComponent },
          { path: 'organizations/:organizationId/inspections', component: DummyRouteComponent },
        ]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationNavPanel);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display all navigation items when all permissions are granted', () => {
    const fixture = TestBed.createComponent(OrganizationNavPanel);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dashboard');
    expect(text).toContain('Facilities');
    expect(text).toContain('Equipments');
    expect(text).toContain('Inspections');
  });

  it('should only display items for which the member has permissions', () => {
    mockOrganizationMemberAccess.permissions.set([ORGANIZATION_PERMISSION.FACILITIES_READ]);

    const fixture = TestBed.createComponent(OrganizationNavPanel);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Facilities');
    expect(text).not.toContain('Dashboard');
    expect(text).not.toContain('Equipments');
    expect(text).not.toContain('Inspections');
  });

  it('should display all items when the wildcard permission is granted', () => {
    mockOrganizationMemberAccess.permissions.set([ORGANIZATION_PERMISSION.ALL]);

    const fixture = TestBed.createComponent(OrganizationNavPanel);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dashboard');
    expect(text).toContain('Facilities');
    expect(text).toContain('Equipments');
    expect(text).toContain('Inspections');
  });

  it('should display Team when a role read permission is granted', () => {
    mockOrganizationMemberAccess.permissions.set([ORGANIZATION_PERMISSION.ROLES_READ]);

    const fixture = TestBed.createComponent(OrganizationNavPanel);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Team');
  });

  it('should show no items when no organization is selected', () => {
    mockOrganizationContext.selectedOrganization.set(null);

    const fixture = TestBed.createComponent(OrganizationNavPanel);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No organization navigation available.');
  });

  it('should use the active organization id in navigation routerLinks', () => {
    const fixture = TestBed.createComponent(OrganizationNavPanel);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      navigationItems: () => readonly MenuItem[];
    };

    const section = component.navigationItems()[0];
    const facilities = section?.items?.find((i: MenuItem) => i.label === 'Facilities');
    expect(facilities?.routerLink).toBe('/organizations/org-1/facilities');
  });
});
