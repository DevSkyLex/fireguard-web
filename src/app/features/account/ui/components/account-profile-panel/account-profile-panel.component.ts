import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DividerModule } from 'primeng/divider';
import type { UpdateCurrentUserProfileInput } from '@features/account/models';
import {
  AccountPasswordChangeStore,
  AccountProfileEditStore,
  UserStore,
} from '@features/account/state';
import {
  AccountAvatarForm,
  AccountPasswordForm,
  AccountProfileForm,
  type PasswordChangeConfirmation,
} from '../../forms';

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
  imports: [DividerModule, AccountAvatarForm, AccountPasswordForm, AccountProfileForm],
  providers: [AccountProfileEditStore, AccountPasswordChangeStore],
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

  /**
   * Property passwordStore
   * @readonly
   *
   * @description
   * Component-scoped workflow store driving the two-step authenticated
   * password change flow.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {AccountPasswordChangeStore}
   */
  protected readonly passwordStore: AccountPasswordChangeStore = inject<AccountPasswordChangeStore>(
    AccountPasswordChangeStore,
  );
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

  /**
   * Method requestPasswordChange
   * @method requestPasswordChange
   *
   * @description
   * Starts the password change workflow with the verified current password.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} currentPassword - Current password to verify.
   * @returns {void}
   */
  protected requestPasswordChange(currentPassword: string): void {
    this.passwordStore.request(currentPassword);
  }

  /**
   * Method confirmPasswordChange
   * @method confirmPasswordChange
   *
   * @description
   * Completes the password change workflow with the one-time code and the
   * new password.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {PasswordChangeConfirmation} confirmation - OTP code and new password.
   * @returns {void}
   */
  protected confirmPasswordChange(confirmation: PasswordChangeConfirmation): void {
    this.passwordStore.confirm(confirmation);
  }

  /**
   * Method restartPasswordChange
   * @method restartPasswordChange
   *
   * @description
   * Resets the password change workflow back to its first step.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected restartPasswordChange(): void {
    this.passwordStore.restart();
  }
  //#endregion
}
