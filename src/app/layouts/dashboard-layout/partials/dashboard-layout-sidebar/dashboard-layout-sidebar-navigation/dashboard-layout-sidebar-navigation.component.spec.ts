import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { OrganizationStore } from '@core/stores/organization';
import { DashboardLayoutSidebarNavigation } from './dashboard-layout-sidebar-navigation.component';

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
    selectedOrganization: signal(MOCK_ORG),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarNavigation],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        { provide: OrganizationStore, useValue: mockOrganizationStore },
        provideRouter([
          { path: 'organizations/:organizationId', component: DummyPage },
          { path: 'account/notifications', component: DummyPage },
        ]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render search input and panelmenu', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-search-input"]'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('p-panelmenu')).length).toBe(2);
    expect(fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length).toBe(1);
  });

  it('should filter menu items based on search query', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly onSearchInput: (value: string) => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    component.onSearchInput('Notifications');
    const labels = component.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Account']);
  });

  it('should clear search query and restore full menu', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly onSearchInput: (value: string) => void;
      readonly clearSearch: () => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    component.onSearchInput('Notifications');
    expect(component.menuItems().map((group) => group.label)).toEqual(['Account']);

    component.clearSearch();
    expect(component.menuItems().map((group) => group.label)).toEqual(['Home', 'Account']);
  });

  it('should show no results state when search does not match anything', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly onSearchInput: (value: string) => void;
    };

    component.onSearchInput('NoMatch');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results found.');
    expect(fixture.debugElement.query(By.css('p-panelmenu'))).toBeFalsy();
  });

  it('should close sidebar only for leaf items with routerLink', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const closeSpy = vi.spyOn(sidebarService, 'close');
    const component = fixture.componentInstance as unknown as {
      readonly onItemClick: (item: { readonly routerLink?: string; readonly items?: readonly unknown[] }) => void;
    };

    component.onItemClick({ routerLink: '/organizations/org-1' });
    component.onItemClick({ routerLink: '/organizations/org-1', items: [{}] });
    component.onItemClick({});

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should highlight the active route item', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account/notifications');

    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const activeLinks = fixture.debugElement.queryAll(By.css('a[aria-current="page"]'));
    const notificationsLink = fixture.debugElement.query(By.css('a[data-sidebar-item-id="notifications"]'));
    const dashboardLink = fixture.debugElement.query(By.css('a[data-sidebar-item-id="dashboard"]'));

    expect(activeLinks.length).toBe(1);
    expect(notificationsLink.nativeElement.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink.nativeElement.getAttribute('aria-current')).toBeNull();
  });
});
