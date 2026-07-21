import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
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
  imports: [
    ButtonModule,
    DividerModule,
    AccountAvatarForm,
    AccountPasswordForm,
    AccountProfileForm,
  ],
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

  /**
   * Property confirmationService
   * @readonly
   *
   * @description
   * Drives the app-level confirm dialog guarding account deactivation.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);
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

  /**
   * Method deactivateAccount
   * @method deactivateAccount
   *
   * @description
   * Confirms, then deactivates the current user's own account. The
   * consequences are spelled out in the prompt rather than in the card alone,
   * because there is no self-service way back: reactivation is an
   * administrator action.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected deactivateAccount(): void {
    this.confirmationService.confirm({
      header: $localize`:@@account.deactivate.header:Deactivate account`,
      message: $localize`:@@account.deactivate.confirm:You will be signed out everywhere and will not be able to sign back in. Only an administrator can reactivate your account. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@account.deactivate.accept:Deactivate`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => {
        void this.editStore.deactivate();
      },
    });
  }
  //#endregion
}
