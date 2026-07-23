import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { EMPTY } from 'rxjs';
import { NOTIFICATION_CENTER_PORT, USER_IDENTITY_PORT } from '@features/account/ports';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { AccountUserMenu } from '../account-user-menu.component';

const query = <T extends HTMLElement>(
  fixture: ComponentFixture<AccountUserMenu>,
  testid: string,
): T | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);

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
      imports: [AccountUserMenu],
      providers: [
        provideRouter([]),
        { provide: USER_IDENTITY_PORT, useValue: mockUserIdentityPort },
        { provide: AUTH_LOGOUT_PORT, useValue: mockAuthLogoutPort },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
        { provide: Events, useValue: { on: () => EMPTY } },
      ],
    });

    // Clicking a routerLink anchor triggers a real router navigation that
    // resolves asynchronously, after TestBed has torn down the injector —
    // raising NG0205 as an unhandled rejection. Stub the navigation so link
    // clicks resolve synchronously without hitting the router.
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const fixture: ComponentFixture<AccountUserMenu> = TestBed.createComponent(AccountUserMenu);
    fixture.detectChanges();

    return { fixture, mockAuthLogoutPort };
  };

  it('should render the collapsed panel with the trigger row', () => {
    const { fixture } = setup();

    const trigger = query<HTMLButtonElement>(fixture, 'header-user-menu-trigger');
    const panel = query<HTMLElement>(fixture, 'header-user-menu-panel');

    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(panel?.className).toContain('grid-rows-[0fr]');
    expect(panel?.inert).toBe(true);
  });

  it('should expand the inline panel upward when the trigger is clicked', () => {
    const { fixture } = setup();

    query<HTMLButtonElement>(fixture, 'header-user-menu-trigger')?.click();
    fixture.detectChanges();

    const trigger = query<HTMLButtonElement>(fixture, 'header-user-menu-trigger');
    const panel = query<HTMLElement>(fixture, 'header-user-menu-panel');

    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.className).toContain('grid-rows-[1fr]');
    expect(panel?.inert).toBe(false);
  });

  it('should expose the account sections deep-linking into the account page', () => {
    const { fixture } = setup();

    query<HTMLButtonElement>(fixture, 'header-user-menu-trigger')?.click();
    fixture.detectChanges();

    const profile = query<HTMLAnchorElement>(fixture, 'header-user-menu-profile-link');
    const security = query<HTMLAnchorElement>(fixture, 'header-user-menu-security');
    const notifications = query<HTMLAnchorElement>(fixture, 'header-user-menu-notifications');

    expect(profile?.getAttribute('href')).toBe('/account?tab=profile');
    expect(security?.getAttribute('href')).toBe('/account?tab=security');
    expect(notifications?.getAttribute('href')).toBe('/account?tab=notifications');
  });

  it('should collapse the panel after activating an entry', () => {
    const { fixture } = setup();

    query<HTMLButtonElement>(fixture, 'header-user-menu-trigger')?.click();
    fixture.detectChanges();

    query<HTMLAnchorElement>(fixture, 'header-user-menu-profile-link')?.click();
    fixture.detectChanges();

    const panel = query<HTMLElement>(fixture, 'header-user-menu-panel');
    expect(panel?.className).toContain('grid-rows-[0fr]');
  });

  it('should surface unread notifications as a badge on the notifications entry', () => {
    const { fixture } = setup(4);

    const badge = query<HTMLElement>(fixture, 'header-user-menu-notifications-badge');
    expect(badge?.textContent?.trim()).toBe('4');
  });

  it('should not render a badge when there are no unread notifications', () => {
    const { fixture } = setup(0);

    expect(query(fixture, 'header-user-menu-notifications-badge')).toBeNull();
  });

  it('should trigger logout from the panel action', () => {
    const { fixture, mockAuthLogoutPort } = setup();

    query<HTMLButtonElement>(fixture, 'header-user-menu-trigger')?.click();
    fixture.detectChanges();

    query<HTMLButtonElement>(fixture, 'header-user-menu-logout')?.click();

    expect(mockAuthLogoutPort.logout).toHaveBeenCalledTimes(1);
  });
});
