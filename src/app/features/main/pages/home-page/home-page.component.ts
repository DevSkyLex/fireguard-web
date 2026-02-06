import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

/**
 * Component HomePage
 * @class HomePage
 *
 * @description
 * Home page component displayed after successful authentication.
 * Displays user profile information.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-home-page',
  imports: [ButtonModule, CardModule, AvatarModule, SkeletonModule],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  //#region Properties
  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Authentication store for logout action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  protected readonly authStore: AuthStore = inject(AuthStore);

  /**
   * Property userStore
   * @readonly
   *
   * @description
   * User store for accessing user profile.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject(UserStore);
  //#endregion

  //#region Methods
  /**
   * Method onLogout
   *
   * @description
   * Handles logout button click.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onLogout(): void {
    this.authStore.logout();
  }
  //#endregion
}
