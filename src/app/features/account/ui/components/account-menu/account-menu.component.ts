import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideBuilding2,
  lucideEllipsisVertical,
  lucideLogOut,
  lucideSettings2,
  lucideShieldCheck,
  lucideUserRound,
} from '@ng-icons/lucide';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import {
  HlmDropdownMenu,
  HlmDropdownMenuGroup,
  HlmDropdownMenuItem,
  HlmDropdownMenuLabel,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import {
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarService,
} from '@shared/ui/sidebar';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountMenu
 * @class AccountMenu
 *
 * @description
 * The sidebar footer: who is signed in, and the menu onto their own account.
 * The trailing ellipsis marks it as a control rather than a caption.
 *
 * It is the **only** way into the account: the account is not a destination of
 * the sidebar's navigation, which lists the work rather than the reader, so the
 * menu carries every one of its sections.
 *
 * Account-owned rather than layout-owned because it reads user identity; the
 * shell only lends it a slot (`ARCHITECTURE.md` §2.7). It is contributed
 * through `withAccountMenu()`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-menu />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-menu',
  imports: [
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmDropdownMenu,
    HlmDropdownMenuGroup,
    HlmDropdownMenuItem,
    HlmDropdownMenuLabel,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuTrigger,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSkeleton,
  ],
  providers: [
    provideIcons({
      lucideBell,
      lucideBuilding2,
      lucideEllipsisVertical,
      lucideLogOut,
      lucideSettings2,
      lucideShieldCheck,
      lucideUserRound,
    }),
  ],
  templateUrl: './account-menu.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  //#region Properties
  /**
   * Property identity
   * @readonly
   *
   * @description
   * The signed-in user, read through the account port.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject<UserIdentityPort>(USER_IDENTITY_PORT);

  /**
   * Property logoutPort
   * @readonly
   *
   * @description
   * Auth-owned logout, consumed as a port so this feature never reaches into
   * auth state (`ARCHITECTURE.md` §5.2).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthLogoutPort}
   */
  private readonly logoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Navigates to an account section's own route. The account is a page of the
   * shell, not a panel beside one (`account/FEATURE.md`), and this menu is its
   * only entry point — the sidebar lists no account destination.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * Shell state, read only to place the menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {HlmSidebarService}
   */
  private readonly sidebar: HlmSidebarService = inject<HlmSidebarService>(HlmSidebarService);

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Name to show, falling back to the email so the row is never blank for a
   * user who never set one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly displayName: Signal<string> = computed(
    (): string => this.identity.displayName() ?? this.identity.profile()?.email ?? '',
  );

  /**
   * Property email
   * @readonly
   *
   * @description
   * Secondary line of the row. Falls back to an empty string through `??`
   * because API Platform omits null fields, so a missing email arrives
   * `undefined` rather than null.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly email: Signal<string> = computed(
    (): string => this.identity.profile()?.email ?? '',
  );

  /**
   * Property initials
   * @readonly
   *
   * @description
   * Avatar fallback, shown whenever no picture resolves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly initials: Signal<string> = computed(
    (): string => this.identity.initials() ?? '',
  );

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * The menu-sized avatar variant, or `null` to fall back to the initials.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly avatarUrl: Signal<string | null> = computed((): string | null =>
    this.identity.avatarUrlSmall(),
  );

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the row has nothing to show yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed(
    (): boolean => this.identity.profile() === null && this.identity.isLoading(),
  );

  /**
   * Property menuSide
   * @readonly
   *
   * @description
   * Where the menu opens: beside the column on desktop, above it once the
   * sidebar is a bottom-anchored sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'top' | 'right'>}
   */
  protected readonly menuSide: Signal<'top' | 'right'> = computed((): 'top' | 'right' =>
    this.sidebar.isMobile() ? 'top' : 'right',
  );
  //#endregion

  //#region Methods
  /**
   * Method goToProfile
   * @method goToProfile
   *
   * @description
   * Opens the account workspace on the profile.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected goToProfile(): void {
    this.goToSection('profile');
  }

  /**
   * Method goToSecurity
   * @method goToSecurity
   *
   * @description
   * Opens the account workspace on the security settings.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected goToSecurity(): void {
    this.goToSection('security');
  }

  /**
   * Method goToOrganizations
   * @method goToOrganizations
   *
   * @description
   * Opens the account workspace on the caller's own organization list.
   *
   * @access protected
   * @since 3.1.0
   *
   * @returns {void}
   */
  protected goToOrganizations(): void {
    this.goToSection('organizations');
  }

  /**
   * Method goToNotifications
   * @method goToNotifications
   *
   * @description
   * Opens the account workspace on the notification feed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected goToNotifications(): void {
    this.goToSection('notifications');
  }

  /**
   * Method goToNotificationPreferences
   * @method goToNotificationPreferences
   *
   * @description
   * Opens the account workspace on the notification preferences matrix.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected goToNotificationPreferences(): void {
    void this.router.navigate(['/account', 'notifications', 'preferences']);
  }

  /**
   * Method logout
   * @method logout
   *
   * @description
   * Ends the session. Navigation away is the auth feature's own consequence of
   * the logout, not this menu's to perform.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected logout(): void {
    this.logoutPort.logout();
  }

  /**
   * Method goToSection
   * @method goToSection
   *
   * @description
   * Navigates to a section of the account, which is a page of the same shell:
   * the sidebar does not change, only the content column does.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string} section - The account section to open.
   *
   * @returns {void}
   */
  private goToSection(section: string): void {
    void this.router.navigate(['/account', section]);
  }
  //#endregion
}
