import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideBuilding2,
  lucideEllipsisVertical,
  lucideLogOut,
  lucideShieldCheck,
  lucideUserRound,
} from '@ng-icons/lucide';
import {
  formatShortcut as formatPlatformShortcut,
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
  type ShortcutModifier,
} from '@core/interaction-capabilities';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawerImports } from '@shared/ui/drawer';
import {
  HlmDropdownMenu,
  HlmDropdownMenuGroup,
  HlmDropdownMenuItem,
  HlmDropdownMenuLabel,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuShortcut,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
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
 * Hover highlights only the circular avatar; the full row remains the click
 * and keyboard target, with a circular focus shape when the sidebar is collapsed.
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
    RouterLink,
    HlmButton,
    HlmItemImports,
    HlmDrawerImports,
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmDropdownMenu,
    HlmDropdownMenuGroup,
    HlmDropdownMenuItem,
    HlmDropdownMenuLabel,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuShortcut,
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
      lucideShieldCheck,
      lucideUserRound,
    }),
  ],
  templateUrl: './account-menu.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  /**
   * Property interactionCapabilities
   * @readonly
   * @description Shared interaction mode and platform shortcut convention.
   * @access private
   * @since 4.0.0
   * @type {InteractionCapabilitiesPort}
   */
  private readonly interactionCapabilities: InteractionCapabilitiesPort = inject(
    INTERACTION_CAPABILITIES_PORT,
  );

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Central interaction mode; viewport width only controls geometry.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> =
    this.interactionCapabilities.isMobileInteractionMode;

  /**
   * Property shortcutModifier
   * @readonly
   * @description Modifier displayed by the account dropdown shortcut hints.
   * @access protected
   * @since 4.0.0
   * @type {Signal<ShortcutModifier>}
   */
  protected readonly shortcutModifier: Signal<ShortcutModifier> =
    this.interactionCapabilities.shortcutModifier;

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
   * Property isLoggingOut
   * @readonly
   * @description Prevents duplicate sign-out commands while Auth is ending the session.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isLoggingOut: Signal<boolean> = this.logoutPort.isLoggingOut;

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
   * Method formatShortcut
   * @method formatShortcut
   * @description Formats one menu shortcut with the detected platform modifier.
   * @access protected
   * @since 4.0.0
   * @param {string} key - Shortcut key to display.
   * @returns {string} Platform-appropriate shortcut hint.
   */
  protected formatShortcut(key: string): string {
    return formatPlatformShortcut(this.shortcutModifier(), key);
  }

  /**
   * Method logout
   * @method logout
   *
   * @description
   * Ends the session. The auth feature owns navigation for both logout outcomes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {boolean} Whether a logout command was started.
   */
  protected logout(): boolean {
    if (this.isLoggingOut()) return false;
    this.logoutPort.logout();
    return true;
  }

  //#endregion
}
