import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarHeader } from '../dashboard-layout-sidebar-header.component';

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

describe('DashboardLayoutSidebarHeader', () => {
  const selectedOrganization = signal<typeof MOCK_ORG | null>(null);
  const permissions = signal<ReadonlyArray<string>>([]);

  beforeEach(() => {
    selectedOrganization.set(null);
    permissions.set([]);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarHeader],
      providers: [
        DashboardSidebarService,
        provideRouter([]),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization } },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should fall back to product branding outside an organization', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fireguard');
    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-settings-link"]'))).toBeNull();
  });

  it('should show the workspace name inside an organization', () => {
    selectedOrganization.set(MOCK_ORG);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
    expect(fixture.nativeElement.textContent).not.toContain('Fireguard');
  });

  it('should offer the settings cog only when a settings tab is reachable', () => {
    selectedOrganization.set(MOCK_ORG);
    permissions.set([ORGANIZATION_PERMISSION.MEMBERS_READ]);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('[data-testid="sidebar-settings-link"]'));
    expect(link).toBeTruthy();
    expect(link.nativeElement.getAttribute('href')).toBe('/organizations/org-1/settings');
  });

  it('should hide the settings cog without any settings grant', () => {
    // dashboard.read reaches no settings tab — the cog would only bounce off
    // the settings landing guard.
    selectedOrganization.set(MOCK_ORG);
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);

    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-settings-link"]'))).toBeNull();
  });
});
