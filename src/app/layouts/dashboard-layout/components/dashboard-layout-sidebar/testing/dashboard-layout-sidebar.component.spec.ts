import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { USER_IDENTITY_PORT, type ShellUserProfile } from '@features/account/ports';
import { AuthStore } from '@features/auth/state';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarNavigation } from '../components';
import { DashboardLayoutSidebar } from '../dashboard-layout-sidebar.component';

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
  const mockUserStore = {
    isLoading: signal(false),
    avatarUrl: signal<string | null>(null),
    initials: signal<string | null>('FG'),
    displayName: signal<string | null>('Fireguard User'),
    profile: signal<ShellUserProfile | null>({
      sub: 'user-id',
      name: 'Fireguard User',
      email: 'user@fireguard.local',
    }),
  };
  const mockAuthStore = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };
  const mockOrganizationStore = {
    selectedOrganization: signal(MOCK_ORG),
    organizations: signal([MOCK_ORG]),
    isLoadingOrganizations: signal(false),
    loadOrganizations: vi.fn(),
  };

  beforeEach(() => {
    mockAuthStore.isLoggingOut.set(false);
    mockAuthStore.logout.mockReset();
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationStore.loadOrganizations.mockReset();

    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebar],
      providers: [
        DashboardSidebarNavigationService,
        DashboardSidebarService,
        provideRouter([]),
        { provide: USER_IDENTITY_PORT, useValue: mockUserStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationStore },
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
    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-navigation')),
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-dashboard-layout-sidebar-footer'))).toBeTruthy();

    const panelMenus = fixture.debugElement.queryAll(By.css('p-panelmenu'));
    expect(panelMenus.length).toBe(2);
    expect(
      fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length,
    ).toBe(1);

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Fireguard');
    expect(textContent).toContain('Home');
    expect(textContent).toContain('Dashboard');
    expect(textContent).toContain('Account');
    expect(textContent).toContain('Notifications');
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

    const profileSection = fixture.debugElement.query(By.css('[data-testid="auth-user-profile"]'));
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

    navigation.onSearchInput('Notifications');

    const menuItems = navigation.menuItems();
    const rootLabels = menuItems.map((item) => item.label);
    const account = menuItems.find((item) => item.label === 'Account');
    const notifItem = account?.items?.find((item) => item.label === 'Notifications');

    expect(rootLabels).toEqual(['Account']);
    expect(notifItem).toBeDefined();
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

    navigation.onSearchInput('Notifications');
    expect(navigation.menuItems().map((group) => group.label)).toEqual(['Account']);

    navigation.clearSearch();
    expect(navigation.menuItems().map((group) => group.label)).toEqual(['Home', 'Account']);
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
    const homeItems = homeGroup?.items ?? [];
    const bookmarks = homeItems.find((item) => item.label === 'Bookmarks');
    const messages = homeItems.find((item) => item.label === 'Messages');

    expect(bookmarks?.badge).toBe('3');
    expect(messages?.badge).toBe('1');
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

  it('should expose route as panelmenu routerLink with organization prefix', () => {
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

    expect(dashboard?.routerLink).toBe('/organizations/org-1');
  });

  it('should keep stable top-level ordering', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const navigation = fixture.debugElement.query(By.directive(DashboardLayoutSidebarNavigation))
      .componentInstance as unknown as {
      readonly menuItems: () => readonly MenuItem[];
    };

    const labels = navigation.menuItems().map((group) => group.label);

    expect(labels).toEqual(['Home', 'Account']);
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
