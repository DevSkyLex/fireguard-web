import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import {
  resolveAccountStatusTag,
  type AccountStatusTagDescriptor,
  type UpdateCurrentUserProfileInput,
} from '@features/account/models';
import {
  AccountPasswordChangeStore,
  AccountProfileEditStore,
  UserStore,
} from '@features/account/state';
import { Tag } from '@shared/components';
import {
  AccountAvatarForm,
  AccountPasswordForm,
  AccountProfileForm,
  type PasswordChangeConfirmation,
} from '../../forms';
import { AccountSettingsPanel } from '../account-settings-panel/account-settings-panel.component';

/**
 * Component AccountProfilePanel
 * @class AccountProfilePanel
 *
 * @description
 * Container for the Profile tab: an identity card (avatar, name, status,
 * verification and membership facts), the editable {@link AccountProfileForm},
 * the password-change workflow, the folded-in language preference and account
 * deactivation. Connects presentational children to the account-owned profile
 * and edit stores.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-panel',
  imports: [
    DatePipe,
    AvatarModule,
    ButtonModule,
    MessageModule,
    Tag,
    AccountAvatarForm,
    AccountPasswordForm,
    AccountProfileForm,
    AccountSettingsPanel,
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
   * Property statusDescriptor
   * @readonly
   *
   * @description
   * Presentation descriptor for the account status, or null while the profile
   * has not loaded or the backend sent no status. Resolved through the account
   * tag registry so the label, colour and icon are not restated here.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<AccountStatusTagDescriptor | null>}
   */
  protected readonly statusDescriptor: Signal<AccountStatusTagDescriptor | null> = computed(
    (): AccountStatusTagDescriptor | null => {
      const status: string | null | undefined = this.userStore.profile()?.status;

      return status ? resolveAccountStatusTag('accountStatus', status) : null;
    },
  );

  /**
   * Property identityAvatarPt
   * @readonly
   *
   * @description
   * Pass-through options of the identity card avatar: a compact 44px surface
   * matching the mockup's ringed identity tile.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {AvatarPassThroughOptions}
   */
  protected readonly identityAvatarPt: AvatarPassThroughOptions = {
    root: { class: 'h-11 w-11 text-base' },
  };

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
        label: $localize`:@@account.deactivate.accept:Deactivate account`,
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
