import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UserStore } from '@features/account/state';

/**
 * Component AccountAccessPanel
 * @class AccountAccessPanel
 *
 * @description
 * The account's platform-wide access: the global roles carried by the signed-in
 * user, and the permissions those roles resolve to.
 *
 * `/api/me` has always returned both — `UserProfileOutput.roles` and
 * `.permissions` — and `UserStore` has always exposed them. Nothing rendered
 * them, so a user had no way to see what they are allowed to do.
 *
 * Read-only by design: global roles are granted by an administrator, never
 * edited from one's own account.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-access-panel />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-access-panel',
  imports: [],
  templateUrl: './account-access-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAccessPanel {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Authenticated-user store, read directly for `roles` and `permissions`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);
  //#endregion
}
