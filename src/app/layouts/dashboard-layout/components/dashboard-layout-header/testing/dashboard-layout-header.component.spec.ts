import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/ports/theme';
import { NotificationStore } from '@features/account/state';
import { NotificationBell } from '@features/account';
import { BreadcrumbService } from '@core/services/breadcrumb';
import { OrganizationStore } from '@features/organization/state';
import { OrganizationSwitcher } from '@features/organization';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutHeader } from '../dashboard-layout-header.component';

describe('DashboardLayoutHeader', () => {
  const currentTheme = signal<ThemeMode>('light');
  const mockThemePort: ThemePort = {
    theme: currentTheme,
    setTheme: vi.fn((mode: ThemeMode) => currentTheme.set(mode)),
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

    TestBed.configureTestingModule({
      imports: [DashboardLayoutHeader],
      providers: [
        DashboardSidebarService,
        BreadcrumbService,
        provideRouter([]),
        { provide: THEME_PORT, useValue: mockThemePort },
      ],
    }).overrideComponent(OrganizationSwitcher, {
      set: { providers: [{ provide: OrganizationStore, useValue: mockOrganizationStore }] },
    }).overrideComponent(NotificationBell, {
      set: { providers: [{ provide: NotificationStore, useValue: mockNotificationStore }] },
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
});

