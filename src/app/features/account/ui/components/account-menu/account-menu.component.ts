import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideChevronsUpDown, lucideLogOut, lucideUserRound } from '@ng-icons/lucide';
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
 * The paired chevrons mark it as a control rather than a caption, mirroring the
 * organization switcher at the other end of the column.
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
  providers: [provideIcons({ lucideBell, lucideChevronsUpDown, lucideLogOut, lucideUserRound })],
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
   * Used to reach the account pages from the menu.
   *
   * @access private
   * @since 1.0.0
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
   * Secondary line of the row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly email: Signal<string> = computed(
    // API Platform omits null fields, so this arrives `undefined` rather than
    // null — a `=== null` guard would let it through.
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
   * Method openProfile
   * @method openProfile
   *
   * @description
   * Opens the account profile page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openProfile(): void {
    void this.router.navigate(['/account']);
  }

  /**
   * Method openNotifications
   * @method openNotifications
   *
   * @description
   * Opens the account notification preferences.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openNotifications(): void {
    void this.router.navigate(['/account/notifications']);
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
  //#endregion
}
