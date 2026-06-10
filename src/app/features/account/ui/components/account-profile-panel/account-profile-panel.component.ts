import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { UpdateCurrentUserProfileInput } from '@features/account/models';
import { AccountProfileEditStore, UserStore } from '@features/account/state';
import { AccountProfileForm } from '../../forms';

/**
 * Component AccountProfilePanel
 * @class AccountProfilePanel
 *
 * @description
 * Container for the editable profile section. Connects the presentational
 * {@link AccountProfileForm} to the account-owned profile and edit stores.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-panel',
  imports: [AccountProfileForm],
  providers: [AccountProfileEditStore],
  templateUrl: './account-profile-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePanel {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Authenticated-user profile store exposed to the template as form input.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Property editStore
   * @readonly
   *
   * @description
   * Component-scoped workflow store responsible for profile-field saves and
   * avatar uploads.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {AccountProfileEditStore}
   */
  protected readonly editStore: AccountProfileEditStore =
    inject<AccountProfileEditStore>(AccountProfileEditStore);
  //#endregion

  //#region Methods
  /**
   * Method save
   * @method save
   *
   * @description
   * Delegates valid profile-field values emitted by the form to the edit
   * workflow store.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {UpdateCurrentUserProfileInput} input - Profile fields to persist.
   * @returns {void}
   */
  protected save(input: UpdateCurrentUserProfileInput): void {
    this.editStore.save(input);
  }

  /**
   * Method uploadAvatar
   * @method uploadAvatar
   *
   * @description
   * Delegates an avatar selected by the form to the edit workflow store.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {File} file - Avatar file selected by the user.
   * @returns {void}
   */
  protected uploadAvatar(file: File): void {
    this.editStore.uploadAvatar(file);
  }
  //#endregion
}
