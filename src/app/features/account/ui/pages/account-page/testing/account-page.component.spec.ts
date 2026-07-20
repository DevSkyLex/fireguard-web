import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationStore, UserStore } from '@features/account/state';
import { AccountPage } from '../account-page.component';

describe('AccountPage', () => {
  const setup = (queryParams: Record<string, string> = {}, profile: unknown = null) => {
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
      profile: signal(profile),
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

  /**
   * A locked or unverified account changes how the rest of the page should be
   * read, so the header has to say so rather than leaving it to be inferred.
   */
  describe('account status', () => {
    const descriptorOf = (profile: unknown): { label: string; severity: string } | null =>
      (
        setup({}, profile).component as unknown as {
          statusDescriptor: () => { label: string; severity: string } | null;
        }
      ).statusDescriptor();

    it('resolves the status through the tag registry', () => {
      expect(descriptorOf({ status: 'locked' })).toEqual({
        label: 'Locked',
        severity: 'danger',
        icon: 'pi pi-lock',
      });
    });

    it('shows nothing while the profile has not loaded', () => {
      expect(descriptorOf(null)).toBeNull();
    });

    it('shows nothing when the backend sent no status', () => {
      expect(descriptorOf({ status: null })).toBeNull();
    });

    it('humanises a status the frontend does not know yet', () => {
      expect(descriptorOf({ status: 'pending_deletion' })?.label).toBe('pending deletion');
    });
  });

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
});
