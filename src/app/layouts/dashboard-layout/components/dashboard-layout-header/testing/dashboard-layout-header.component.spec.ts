import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/ports/theme';
import { BreadcrumbService } from '@core/services/breadcrumb';
import { NotificationBell } from '@features/account';
import { NotificationStore } from '@features/account/state';
import { OrganizationSwitcher } from '@features/organization';
import { OrganizationStore } from '@features/organization/state';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutHeaderUserMenu } from '../../dashboard-layout-header-user-menu/dashboard-layout-header-user-menu.component';
import { DashboardLayoutHeader } from '../dashboard-layout-header.component';

describe('DashboardLayoutHeader', () => {
  const currentTheme = signal<ThemeMode>('light');
  const mockThemePort: ThemePort = {
    theme: currentTheme,
    setTheme: vi.fn((mode: ThemeMode) => currentTheme.set(mode)),
  };
  const mockUserStore = {
    isLoading: signal(false),
    avatarUrl: signal<string | null>(null),
    initials: signal<string | null>('FG'),
    displayName: signal<string | null>('Fireguard User'),
    profile: signal<{ email?: string } | null>({ email: 'user@fireguard.local' }),
  };
  const mockAuthLogoutPort = {
    isLoggingOut: signal(false),
    logout: vi.fn(),
  };

  beforeEach(() => {
    const mockOrganizationStore = {
      organizations: signal([]),
      selectedOrganization: signal(null),
      isLoadingOrganizations: signal(false),
      isLoadingOrganization: signal(false),
      loadOrganizations: vi.fn(),
    };
    const mockNotificationStore = {
      hasUnread: signal(false),
      unreadCount: signal(0),
      notifications: signal([]),
      isLoading: signal(false),
      isLoadingMore: signal(false),
      hasMore: signal(false),
      load: vi.fn(),
      setFilter: vi.fn(),
      markAsRead: vi.fn(),
      loadMore: vi.fn(),
    };

    mockUserStore.isLoading.set(false);
    mockUserStore.avatarUrl.set(null);
    mockUserStore.initials.set('FG');
    mockAuthLogoutPort.isLoggingOut.set(false);
    mockAuthLogoutPort.logout.mockReset();

    TestBed.configureTestingModule({
      imports: [DashboardLayoutHeader],
      providers: [
        DashboardSidebarService,
        BreadcrumbService,
        provideRouter([]),
        { provide: THEME_PORT, useValue: mockThemePort },
      ],
    })
      .overrideComponent(OrganizationSwitcher, {
        set: { providers: [{ provide: OrganizationStore, useValue: mockOrganizationStore }] },
      })
      .overrideComponent(NotificationBell, {
        set: { providers: [{ provide: NotificationStore, useValue: mockNotificationStore }] },
      })
      .overrideComponent(DashboardLayoutHeaderUserMenu, {
        set: {
          providers: [
            { provide: USER_IDENTITY_PORT, useValue: mockUserStore },
            { provide: AUTH_LOGOUT_PORT, useValue: mockAuthLogoutPort },
          ],
        },
      });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open sidebar when menu button is clicked', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const openSpy = vi.spyOn(sidebarService, 'open');

    fixture.detectChanges();
    const menuButton = fixture.debugElement.query(By.css('p-button'));
    menuButton.triggerEventHandler('onClick', new MouseEvent('click'));

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('should render breadcrumb navigation', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-breadcrumb'))).toBeTruthy();
  });

  it('should render the user menu in the header', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('app-dashboard-layout-header-user-menu')),
    ).toBeTruthy();
  });

  it('should show the user avatar trigger when not loading', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="header-user-menu-trigger"]')),
    ).toBeTruthy();
  });

  it('should show a skeleton when user identity is loading', () => {
    mockUserStore.isLoading.set(true);

    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="header-user-menu-skeleton"]')),
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="header-user-menu-trigger"]')),
    ).toBeFalsy();
  });
});
