import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';
import type { MotionOptions } from '@primeuix/motion';
import { AvatarModule } from 'primeng/avatar';
import { PanelModule, PanelPassThroughOptions } from 'primeng/panel';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Component DashboardLayoutUserProfile
 * @class DashboardLayoutUserProfile
 *
 * @description
 * Displays the current user profile summary at the bottom
 * of the dashboard sidebar.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-user-profile />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-user-profile',
  imports: [AvatarModule, SkeletonModule, RouterLink, PanelModule],
  templateUrl: './dashboard-layout-user-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutUserProfile {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Store exposing the authenticated user profile data.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore =
    inject<UserStore>(UserStore);

  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Store exposing authentication actions and state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  protected readonly authStore: AuthStore =
    inject<AuthStore>(AuthStore);

  /**
   * Property panelPt
   * @readonly
   *
   * @description
   * Pass-through options to style the PrimeNG Panel as an upward accordion.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PanelPassThroughOptions}
   */
  protected readonly panelPt: PanelPassThroughOptions = {
    root: { class: 'flex flex-col-reverse' },
    header: { class: 'border-0 p-0 bg-transparent text-inherit' },
    title: { class: 'w-full' },
    headerActions: { class: 'hidden' },
    pcToggleButton: { root: { class: 'hidden' } },
    contentContainer: {
      class: 'overflow-hidden rounded-xl bg-surface-0 p-3',
    },
    contentWrapper: { class: 'p-0' },
    content: { class: 'p-0' },
  };

  /**
   * Property panelMotionOptions
   * @readonly
   *
   * @description
   * Motion options used to animate the user menu expansion/collapse.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MotionOptions}
   */
  protected readonly panelMotionOptions: MotionOptions = {
    type: 'transition',
    autoHeight: true,
    duration: { enter: 220, leave: 180 },
    enterClass: {
      from: 'h-0 opacity-0 translate-y-1',
      active: 'overflow-hidden transition-[height,opacity,transform] duration-220 ease-in-out',
      to: 'h-[var(--pui-motion-height)] opacity-100 translate-y-0',
    },
    leaveClass: {
      from: 'h-[var(--pui-motion-height)] opacity-100 translate-y-0',
      active: 'overflow-hidden transition-[height,opacity,transform] duration-180 ease-in-out',
      to: 'h-0 opacity-0 translate-y-1',
    },
  };
  //#endregion

  //#region Methods
  /**
   * Method onLogout
   * @method onLogout
   *
   * @description
   * Triggers logout action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onLogout(): void {
    if (this.authStore.isLoggingOut()) return;
    this.authStore.logout();
  }
  //#endregion
}
