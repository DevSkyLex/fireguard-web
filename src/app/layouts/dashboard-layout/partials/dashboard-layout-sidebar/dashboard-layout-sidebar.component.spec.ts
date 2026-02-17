import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@core/stores/auth';
import type { UserInfoOutput } from '@core/models/oauth2';
import { UserStore } from '@core/stores/user';
import type { MenuItem } from 'primeng/api';
import { DashboardSidebarNavigationService, DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebar } from './dashboard-layout-sidebar.component';
import { DashboardLayoutSidebarNavigation } from './dashboard-layout-sidebar-navigation/dashboard-layout-sidebar-navigation.component';

describe('DashboardLayoutSidebar', () => {
  const mockUserStore = {
    isLoading: signal(false),
    avatarUrl: signal<string | null>(null),
    initials: signal<string | null>('FG'),
    displayName: signal<string | null>('Fireguard User'),
    profile: signal<UserInfoOutput | null>({
      '@id': '/api/oauth2/userinfo',
      '@type': 'UserInfo',
      sub: 'user-id',
      name: 'Fireguard User',
      given_name: 'Fireguard',
      family_name: 'Guardian',
      email: 'user@fireguard.local',
    }),
  };
  const mockAuthStore = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };

  beforeEach(() => {
    mockAuthStore.isLoggingOut.set(false);
    mockAuthStore.logout.mockReset();

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebar],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideRouter([]),
        { provide: UserStore, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render branding and section labels', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-header'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-navigation'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-footer'))).toBeTruthy();

    const panelMenus = fixture.debugElement.queryAll(By.css('p-panelmenu'));
    expect(panelMenus.length).toBe(2);
    expect(fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length).toBe(1);

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Fireguard');
    expect(textContent).toContain('Home');
    expect(textContent).toContain('Dashboard');
    expect(textContent).toContain('Organization');
    expect(textContent).toContain('Members');
  });

  it('should render a search input in the sidebar', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const searchInput = fixture.debugElement.query(By.css('[data-testid="sidebar-search-input"]'));

    expect(searchInput).toBeTruthy();
  });

  it('should render user profile section at the bottom', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const profileSection = fixture.debugElement.query(By.css('[data-testid="dashboard-user-profile"]'));
    const textContent = fixture.nativeElement.textContent;

    expect(profileSection).toBeTruthy();
    expect(textContent).toContain('Fireguard User');
    expect(textContent).toContain('user@fireguard.local');
  });

  it('should filter groups and items based on search query', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly onSearchInput: (value: string) => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    navigation.onSearchInput('Reports');

    const menuItems = navigation.menuItems();
    const rootLabels = menuItems.map((item) => item.label);
    const organization = menuItems.find((item) => item.label === 'Organization');
    const reportItem = organization?.items?.find((item) => item.label === 'Reports');

    expect(rootLabels).toEqual(['Organization']);
    expect(reportItem).toBeDefined();
  });

  it('should clear search query and restore full menu', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly onSearchInput: (value: string) => void;
      readonly clearSearch: () => void;
      readonly menuItems: () => readonly MenuItem[];
    };

    navigation.onSearchInput('Reports');
    expect(navigation.menuItems().map((group) => group.label)).toEqual(['Organization']);

    navigation.clearSearch();
    expect(navigation.menuItems().map((group) => group.label)).toEqual(['Home', 'Organization']);
  });

  it('should configure notification badges in menu model', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const groups = navigation.menuItems();
    const homeGroup = groups.find((group) => group.label === 'Home');
    const organizationGroup = groups.find((group) => group.label === 'Organization');
    const homeItems = homeGroup?.items ?? [];
    const organizationItems = organizationGroup?.items ?? [];
    const bookmarks = homeItems.find((item) => item.label === 'Bookmarks');
    const messages = homeItems.find((item) => item.label === 'Messages');
    const reports = organizationItems.find((item) => item.label === 'Reports');

    expect(bookmarks?.badge).toBe('3');
    expect(messages?.badge).toBe('1');
    expect(reports?.badge).toBeUndefined();
  });

  it('should close sidebar only for routerLink leaf items', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const sidebarService = TestBed.inject(DashboardSidebarService);
    const closeSpy = vi.spyOn(sidebarService, 'close');
    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly onItemClick: (item: { readonly routerLink?: string; readonly items?: readonly unknown[] }) => void;
    };

    navigation.onItemClick({ routerLink: '/' });
    navigation.onItemClick({ routerLink: '/', items: [{}] });
    navigation.onItemClick({});

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should expose route as panelmenu routerLink', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly {
        readonly items?: readonly MenuItem[];
        readonly label?: string;
      }[];
    };

    const homePanel = navigation.menuItems().find((group) => group.label === 'Home');
    const dashboard = homePanel?.items?.find((item) => item.label === 'Dashboard');

    expect(dashboard?.routerLink).toBe('/');
  });

  it('should keep stable top-level ordering', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const labels = navigation.menuItems().map((group) => group.label);

    expect(labels).toEqual(['Home', 'Organization']);
  });

  it('should not render collapsed flyout ui', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="collapsed-flyout"]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('[data-testid="collapsed-flyout-backdrop"]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('p-menu'))).toBeFalsy();
  });
});
