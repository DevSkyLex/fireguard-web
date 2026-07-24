import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import {
  AccountPasswordChangeStore,
  AccountProfileEditStore,
  NotificationStore,
  UserStore,
} from '@features/account/state';
import { AccountProfilePanel } from '../../../components/account-profile-panel/account-profile-panel.component';
import { AccountPage } from '../account-page.component';

describe('AccountPage', () => {
  const setup = (queryParams: Record<string, string> = {}) => {
    const mockRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    const mockNotificationStore = {
      hasUnread: signal(false),
      unreadCount: signal(0),
    };
    const mockUserStore = {
      profile: signal(null),
      displayName: signal<string | null>(null),
      initials: signal<string | null>(null),
      avatarUrlMedium: signal<string | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationStore, useValue: mockNotificationStore },
        { provide: UserStore, useValue: mockUserStore },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AccountPage());
    return { component, mockRoute, mockRouter };
  };

  it('should default to the profile tab when no tab query parameter is present', () => {
    const { component } = setup();

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('profile');
  });

  it('should derive the active tab from the tab query parameter', () => {
    const { component } = setup({ tab: 'security' });

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('security');
  });

  it('should fall back to profile for an unknown tab value', () => {
    const { component } = setup({ tab: 'unknown' });

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('profile');
  });

  it('should expose the account sections in order for the vertical navigation', () => {
    const { component } = setup();

    const navItems = (component as unknown as { navItems: ReadonlyArray<{ id: string }> }).navItems;

    expect(navItems.map((item) => item.id)).toEqual([
      'profile',
      'settings',
      'security',
      'notifications',
    ]);
  });

  it('should resolve the active section entry for the section card header', () => {
    const { component } = setup({ tab: 'settings' });

    const activeSection = (
      component as unknown as { activeSection: () => { id: string } }
    ).activeSection();

    expect(activeSection.id).toBe('settings');
  });

  it('should persist the selected tab in the tab query parameter', () => {
    const { component, mockRouter, mockRoute } = setup();

    (component as unknown as { onTabChange: (value: string) => void }).onTabChange('notifications');

    expect(mockRouter.navigate).toHaveBeenCalledWith([], {
      relativeTo: mockRoute,
      queryParams: { tab: 'notifications' },
      queryParamsHandling: 'merge',
    });
  });

  it('should render the header and the profile panel for the default tab', () => {
    const mockRoute = {
      queryParamMap: of(convertToParamMap({})),
    };
    const mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    const mockNotificationStore = {
      hasUnread: signal(false),
      unreadCount: signal(0),
    };
    const mockUserStore = {
      profile: signal(null),
      displayName: signal<string | null>('Ada Lovelace'),
      initials: signal<string | null>('AL'),
      avatarUrlMedium: signal<string | null>(null),
    };

    const mockEditStore = {
      save: vi.fn(),
      uploadAvatar: vi.fn(),
      isUploadingAvatar: signal(false),
      avatarError: signal(null),
      isSaving: signal(false),
      saveError: signal(null),
    };
    const mockPasswordStore = {
      request: vi.fn(),
      confirm: vi.fn(),
      restart: vi.fn(),
      step: signal('request'),
      isRequesting: signal(false),
      isConfirming: signal(false),
      requestError: signal(null),
      confirmError: signal(null),
      maskedRecipient: signal<string | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationStore, useValue: mockNotificationStore },
        { provide: UserStore, useValue: mockUserStore },
      ],
    });
    TestBed.overrideComponent(AccountProfilePanel, {
      set: {
        providers: [
          { provide: AccountProfileEditStore, useValue: mockEditStore },
          { provide: AccountPasswordChangeStore, useValue: mockPasswordStore },
        ],
      },
    });

    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="account-page-header"]')).toBeTruthy();
    expect(host.textContent).toContain('Ada Lovelace');
    expect(host.querySelector('app-account-profile-panel')).toBeTruthy();
  });
});
