import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import type { MenuItem } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { NOTIFICATION_CENTER_PORT, USER_IDENTITY_PORT } from '@features/account/ports';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { AccountUserMenu } from '../account-user-menu.component';

describe('AccountUserMenu', () => {
  const setup = (unread = 0) => {
    const mockUserIdentityPort = {
      isLoading: signal(false),
      avatarUrl: signal<string | null>(null),
      avatarUrlSmall: signal<string | null>(null),
      displayName: signal('Valentin'),
      initials: signal('VF'),
      profile: signal({ email: 'valentin@example.com' }),
    };
    const mockAuthLogoutPort = {
      isLoggingOut: signal(false),
      logout: vi.fn(),
    };
    const mockNotificationCenterPort = {
      hasUnread: signal(unread > 0),
      unreadCount: signal(unread),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: USER_IDENTITY_PORT, useValue: mockUserIdentityPort },
        { provide: AUTH_LOGOUT_PORT, useValue: mockAuthLogoutPort },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: Events, useValue: { on: () => EMPTY } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AccountUserMenu());
    const items = (component as unknown as { menuItems: () => MenuItem[] }).menuItems();
    return { items };
  };

  it('should expose the account sections deep-linking into the account page', () => {
    const { items } = setup();

    const labels = items.filter((item) => !item.separator).map((item) => item.label);
    expect(labels).toEqual(['Profile', 'Security', 'Notifications', 'Logout']);

    const profile = items.find((item) => item.label === 'Profile');
    expect(profile?.routerLink).toBe('/account');
    expect(profile?.queryParams).toEqual({ tab: 'profile' });

    const security = items.find((item) => item.label === 'Security');
    expect(security?.queryParams).toEqual({ tab: 'security' });

    const notifications = items.find((item) => item.label === 'Notifications');
    expect(notifications?.queryParams).toEqual({ tab: 'notifications' });
  });

  it('should surface unread notifications as a badge on the notifications entry', () => {
    const { items } = setup(4);

    const notifications = items.find((item) => item.label === 'Notifications');
    expect(notifications?.badge).toBe('4');
  });

  it('should not set a badge when there are no unread notifications', () => {
    const { items } = setup(0);

    const notifications = items.find((item) => item.label === 'Notifications');
    expect(notifications?.badge).toBeUndefined();
  });
});
