import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { AvatarModule } from 'primeng/avatar';
import { Popover, PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { AUTH_LOGOUT_PORT, authStoreEvents, type AuthLogoutPort } from '@features/auth';
import {
  NOTIFICATION_CENTER_PORT,
  USER_IDENTITY_PORT,
  type NotificationCenterPort,
  type UserIdentityPort,
} from '../../../ports';

/**
 * Component AccountRailMenu
 * @class AccountRailMenu
 *
 * @description
 * Seat avatar pinned to the foot of the workspace rail, opening the member's
 * account destinations in a popover anchored beside the rail.
 *
 * A 60px rail has no room for a name and email, so the menu is anchored
 * outside the rail rather than expanded inline within it.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-rail-menu />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-rail-menu',
  imports: [AvatarModule, PopoverModule, RouterLink, SkeletonModule, TooltipModule],
  templateUrl: './account-rail-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRailMenu {
  //#region Properties
  /**
   * Property userIdentityPort
   * @readonly
   *
   * @description
   * Identity contract published by the account feature: display name,
   * initials and avatar for the seat.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserIdentityPort}
   */
  protected readonly userIdentityPort: UserIdentityPort =
    inject<UserIdentityPort>(USER_IDENTITY_PORT);

  /**
   * Property authLogoutPort
   * @readonly
   *
   * @description
   * Logout contract, kept as a port so the account feature never couples to
   * the auth store directly.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthLogoutPort}
   */
  protected readonly authLogoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);

  /**
   * Property notificationCenter
   * @readonly
   *
   * @description
   * Unread notification state surfaced as a dot on the seat avatar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationCenterPort}
   */
  protected readonly notificationCenter: NotificationCenterPort =
    inject<NotificationCenterPort>(NOTIFICATION_CENTER_PORT);

  /**
   * Property popover
   * @readonly
   *
   * @description
   * Popover hosting the account destinations. PrimeNG owns its positioning,
   * focus trapping, Escape handling and outside-click dismissal — the source
   * prototype hand-rolled all four with a fixed-position div and a scrim.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Popover>}
   */
  private readonly popover: Signal<Popover> = viewChild.required<Popover>('popover');

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * The seat button, so focus can be handed back when the menu is dismissed
   * without a destination. Optional because it is inside an `@if`.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to reach the login page once logout resolves.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property events
   * @readonly
   *
   * @description
   * Store event bus listened to for the logout outcome.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Redirects to the login page once logout settles, either way — a failed
   * logout still invalidates the local session.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.events
      .on(authStoreEvents.logoutSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        void this.router.navigate(['/auth/login']);
      });

    this.events
      .on(authStoreEvents.logoutFailed)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        void this.router.navigate(['/auth/login']);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Property menuOpen
   * @readonly
   *
   * @description
   * Whether the popover is showing, mirrored from its own events.
   *
   * The trigger used to hard-code `aria-expanded="false"`, so the menu was
   * announced as permanently collapsed however many times it had been opened.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly menuOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property triggerLabel
   * @readonly
   *
   * @description
   * The trigger's accessible name, which carries the unread state.
   *
   * Better than labelling the dot: an `aria-label` on a bare `<span>` has no
   * role to attach to and most screen readers drop it, so the badge was
   * colour-only in practice.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly triggerLabel: Signal<string> = computed((): string =>
    this.notificationCenter.hasUnread()
      ? $localize`:@@workspace.rail.account.ariaUnread:Open account menu, unread notifications`
      : $localize`:@@workspace.rail.account.aria:Open account menu`,
  );

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Opens or closes the account popover from the seat avatar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Click event carrying the anchor element.
   *
   * @return {void}
   */
  protected toggle(event: Event): void {
    this.popover().toggle(event);
  }

  /**
   * Method onPopoverHide
   * @method onPopoverHide
   *
   * @description
   * Records that the menu closed and, when the dismissal left focus nowhere,
   * hands it back to the trigger.
   *
   * The guard matters: PrimeNG emits `onHide` asynchronously, well after a
   * followed link has moved focus, so restoring unconditionally would yank
   * focus back from wherever the member actually went.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected onPopoverHide(): void {
    this.menuOpen.set(false);

    if (typeof document === 'undefined') return;

    // PrimeNG emits `onHide` *before* it detaches the overlay, so focus is
    // still on the autofocused link inside it — testing for `document.body`
    // (as this first did) never matched, and Escape left focus nowhere.
    // Restore only when focus has not deliberately moved elsewhere.
    const active: Element | null = document.activeElement;
    const container: HTMLElement | null | undefined = this.popover().container;

    if (active !== document.body && !(container?.contains(active) ?? false)) return;

    this.trigger()?.nativeElement.focus();
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Dismisses the popover, used when a destination is followed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected close(): void {
    this.popover().hide();
  }

  /**
   * Method onLogout
   * @method onLogout
   *
   * @description
   * Triggers logout, guarded against double submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected onLogout(): void {
    if (this.authLogoutPort.isLoggingOut()) return;

    this.close();
    this.authLogoutPort.logout();
  }
  //#endregion
}
