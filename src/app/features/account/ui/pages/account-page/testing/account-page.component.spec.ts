import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationStore, UserStore } from '@features/account/state';
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

  it('should expose the three account sections in order for the vertical navigation', () => {
    const { component } = setup();

    const navItems = (component as unknown as { navItems: ReadonlyArray<{ id: string }> }).navItems;

    expect(navItems.map((item) => item.id)).toEqual(['profile', 'security', 'notifications']);
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
});
