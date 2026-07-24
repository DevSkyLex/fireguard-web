import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { EMPTY } from 'rxjs';
import { AUTH_LOGOUT_PORT } from '@features/auth';
import { NOTIFICATION_CENTER_PORT, USER_IDENTITY_PORT } from '@features/account/ports';
import type { OrganizationOutput } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { AccountRailMenu } from '../account-rail-menu.component';

const query = <T extends HTMLElement>(
  fixture: ComponentFixture<AccountRailMenu>,
  testid: string,
): T | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);

/**
 * Queries the popover panel content, which PrimeNG appends to `document.body`
 * (`appendTo="body"`) rather than rendering inline under the fixture root.
 */
const queryInPopover = <T extends HTMLElement>(testid: string): T | null =>
  document.body.querySelector(`[data-testid="${testid}"]`);

describe('AccountRailMenu', () => {
  const buildOrganization = (overrides: Partial<OrganizationOutput> = {}): OrganizationOutput =>
    ({
      id: 'org-1',
      name: 'FireGuard Org',
      ...overrides,
    }) as OrganizationOutput;

  const setup = (
    options: {
      unread?: number;
      isLoading?: boolean;
      organization?: OrganizationOutput | null;
      isLoggingOut?: boolean;
    } = {},
  ) => {
    const { unread = 0, isLoading = false, organization = null, isLoggingOut = false } = options;

    const mockUserIdentityPort = {
      isLoading: signal(isLoading),
      avatarUrl: signal<string | null>(null),
      avatarUrlSmall: signal<string | null>(null),
      displayName: signal('Valentin'),
      initials: signal('VF'),
      profile: signal({ email: 'valentin@example.com' }),
    };
    const mockAuthLogoutPort = {
      isLoggingOut: signal(isLoggingOut),
      logout: vi.fn(),
    };
    const mockNotificationCenterPort = {
      hasUnread: signal(unread > 0),
      unreadCount: signal(unread),
    };
    const mockOrganizationContextPort = {
      selectedOrganization: signal<OrganizationOutput | null>(organization),
      isLoadingOrganization: signal(false),
      setOrganization: vi.fn(),
      clearSelectedOrganization: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AccountRailMenu],
      providers: [
        provideRouter([]),
        { provide: USER_IDENTITY_PORT, useValue: mockUserIdentityPort },
        { provide: AUTH_LOGOUT_PORT, useValue: mockAuthLogoutPort },
        { provide: NOTIFICATION_CENTER_PORT, useValue: mockNotificationCenterPort },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockOrganizationContextPort },
        { provide: Events, useValue: { on: () => EMPTY } },
      ],
    });

    // Following anchors trigger real async navigation resolving after
    // TestBed teardown and raise NG0205 as an unhandled rejection; stub it.
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const fixture: ComponentFixture<AccountRailMenu> = TestBed.createComponent(AccountRailMenu);
    fixture.detectChanges();

    return { fixture, mockAuthLogoutPort, mockOrganizationContextPort };
  };

  describe('loading', () => {
    it('should render a skeleton while the identity is loading', () => {
      const { fixture } = setup({ isLoading: true });

      expect(fixture.nativeElement.querySelector('p-skeleton')).toBeTruthy();
      expect(query(fixture, 'account-rail-menu-trigger')).toBeNull();
    });
  });

  describe('loaded — trigger', () => {
    it('should render the trigger button once loaded', () => {
      const { fixture } = setup();

      expect(query(fixture, 'account-rail-menu-trigger')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    });

    it('should not render the unread dot when there are no unread notifications', () => {
      const { fixture } = setup({ unread: 0 });

      expect(query(fixture, 'account-rail-menu-unread')).toBeNull();
    });

    it('should render the unread dot when there are unread notifications', () => {
      const { fixture } = setup({ unread: 3 });

      expect(query(fixture, 'account-rail-menu-unread')).toBeTruthy();
    });

    it('should expose an accessible label carrying the unread state', () => {
      const { fixture } = setup({ unread: 2 });

      expect(query(fixture, 'account-rail-menu-trigger')?.getAttribute('aria-label')).toBe(
        'Open account menu, unread notifications',
      );
    });

    it('should expose a plain accessible label with no unread notifications', () => {
      const { fixture } = setup({ unread: 0 });

      expect(query(fixture, 'account-rail-menu-trigger')?.getAttribute('aria-label')).toBe(
        'Open account menu',
      );
    });

    it('should reflect the popover open state on aria-expanded', () => {
      const { fixture } = setup();

      expect(query(fixture, 'account-rail-menu-trigger')?.getAttribute('aria-expanded')).toBe(
        'false',
      );

      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      expect(query(fixture, 'account-rail-menu-trigger')?.getAttribute('aria-expanded')).toBe(
        'true',
      );
    });
  });

  describe('popover destinations', () => {
    it('should link the account destinations to /account when no organization is selected', () => {
      const { fixture } = setup();
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      const profile = queryInPopover<HTMLAnchorElement>('account-rail-menu-profile');
      const notifications = queryInPopover<HTMLAnchorElement>('account-rail-menu-notifications');

      expect(profile?.getAttribute('href')).toBe('/account?tab=profile');
      expect(notifications?.getAttribute('href')).toBe('/account?tab=notifications');
    });

    it('should link the account destinations into the workspace shell when an organization is selected', () => {
      const { fixture } = setup({ organization: buildOrganization() });
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      const profile = queryInPopover<HTMLAnchorElement>('account-rail-menu-profile');

      expect(profile?.getAttribute('href')).toBe(
        '/organizations/org-1/workspace/account?tab=profile',
      );
    });

    it('should render the display name and email in the popover header', () => {
      const { fixture } = setup();
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      expect(document.body.textContent).toContain('Valentin');
      expect(document.body.textContent).toContain('valentin@example.com');
    });

    it('should render the unread count badge on the notifications entry', () => {
      const { fixture } = setup({ unread: 5 });
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      const notifications = queryInPopover<HTMLAnchorElement>('account-rail-menu-notifications');
      expect(notifications?.textContent).toContain('5');
    });

    it('should close the popover after activating a destination link', () => {
      const { fixture } = setup();
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      queryInPopover<HTMLAnchorElement>('account-rail-menu-profile')?.click();
      fixture.detectChanges();

      expect(query(fixture, 'account-rail-menu-trigger')?.getAttribute('aria-expanded')).toBe(
        'false',
      );
    });
  });

  describe('logout', () => {
    it('should trigger logout from the popover action', () => {
      const { fixture, mockAuthLogoutPort } = setup();
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      queryInPopover<HTMLButtonElement>('account-rail-menu-logout')?.click();

      expect(mockAuthLogoutPort.logout).toHaveBeenCalledTimes(1);
    });

    it('should render "Logging out..." and disable the logout button while logging out', () => {
      const { fixture, mockAuthLogoutPort } = setup({ isLoggingOut: true });
      query<HTMLButtonElement>(fixture, 'account-rail-menu-trigger')?.click();
      fixture.detectChanges();

      const logoutButton = queryInPopover<HTMLButtonElement>('account-rail-menu-logout');
      expect(logoutButton?.disabled).toBe(true);
      expect(logoutButton?.textContent).toContain('Logging out');

      logoutButton?.click();
      expect(mockAuthLogoutPort.logout).not.toHaveBeenCalled();
    });
  });
});
