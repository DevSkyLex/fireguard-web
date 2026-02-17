import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarNavigation } from './dashboard-layout-sidebar-navigation.component';

describe('DashboardLayoutSidebarNavigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarNavigation],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideRouter([]),
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

    component.onSearchInput('Reports');
    const labels = component.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Organization']);
  });

  it('should clear search query and restore full menu', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarNavigation);
    const component = fixture.componentInstance as unknown as {
      readonly onSearchInput: (value: string) => void;
      readonly clearSearch: () => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    component.onSearchInput('Reports');
    expect(component.menuItems().map((group) => group.label)).toEqual(['Organization']);

    component.clearSearch();
    expect(component.menuItems().map((group) => group.label)).toEqual(['Home', 'Organization']);
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

    component.onItemClick({ routerLink: '/' });
    component.onItemClick({ routerLink: '/', items: [{}] });
    component.onItemClick({});

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
