import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  type Signal,
} from '@angular/core';
import {
  AccountPasswordChangeStore,
  AccountTotpEnrollmentStore,
  UserStore,
} from '@features/account/state';
import { AccountMfaPanel } from '@features/account/ui/components/account-mfa-panel';
import { AccountPasswordForm } from '@features/account/ui/forms';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountSecurityPage
 * @class AccountSecurityPage
 *
 * @description
 * The two things that protect the account: the second factor, and the
 * password.
 *
 * Both panels are presentational; this owns the stores and the wiring between
 * them. Neither shows an error surface of its own — a rejected code or a wrong
 * password is a whole-request failure, which the app-wide feedback listener
 * raises as a toast (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-security-page',
  imports: [AccountMfaPanel, AccountPasswordForm, ErrorState, HlmButton, HlmSkeleton],
  providers: [AccountPasswordChangeStore, AccountTotpEnrollmentStore],
  templateUrl: './account-security-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityPage implements OnInit {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Root-provided profile state. It is the only authority on whether two-factor
   * is active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Property totpStore
   * @readonly
   *
   * @description
   * Scoped enrollment workflow, so an abandoned enrollment does not follow the
   * reader around the application.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AccountTotpEnrollmentStore}
   */
  protected readonly totpStore: AccountTotpEnrollmentStore = inject<AccountTotpEnrollmentStore>(
    AccountTotpEnrollmentStore,
  );

  /**
   * Property passwordStore
   * @readonly
   *
   * @description
   * Scoped password change workflow, holding the challenge token that ties its
   * two steps together.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AccountPasswordChangeStore}
   */
  protected readonly passwordStore: AccountPasswordChangeStore = inject<AccountPasswordChangeStore>(
    AccountPasswordChangeStore,
  );

  /**
   * Property totpEnabled
   * @readonly
   *
   * @description
   * Whether an authenticator app is active, read from the profile rather than
   * from the enrollment store: the enrollment store only knows about the
   * attempt in progress, and `/api/me` is the authority on the outcome
   * (`FEATURE.md`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly totpEnabled: Signal<boolean> = computed(
    (): boolean => this.userStore.profile()?.totpEnabled ?? false,
  );

  /**
   * Property profileReady
   * @readonly
   *
   * @description
   * Whether the profile has landed. Nothing about two-factor is rendered until
   * it has: with no profile, {@link totpEnabled} falls back to `false`, and
   * showing "Off" to someone who has it on is a false statement about their own
   * security sitting next to a button offering to set up what already exists.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly profileReady: Signal<boolean> = computed(
    (): boolean => this.userStore.profile() !== null,
  );

  /**
   * Property hasProfileError
   * @readonly
   *
   * @description
   * Whether the profile could not be fetched at all. Distinct from "still
   * loading", because only one of the two is worth offering a retry for.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasProfileError: Signal<boolean> = computed(
    (): boolean => this.userStore.profile() === null && this.userStore.loadError() !== null,
  );

  /**
   * Property isChangingPassword
   * @readonly
   *
   * @description
   * Whether either password step is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isChangingPassword: Signal<boolean> = computed(
    (): boolean => this.passwordStore.isRequesting() || this.passwordStore.isConfirming(),
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Makes sure the profile this depends on is on its way. `load()` filters
   * itself out when the profile is already loaded or in flight, so this cannot
   * duplicate the fetch the account provider makes at bootstrap — it only
   * covers the case where that one failed (`ARCHITECTURE.md` §12.3).
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.userStore.load();
  }
  //#endregion

  //#region Methods
  /**
   * Method retryProfile
   * @method retryProfile
   *
   * @description
   * Fetches the profile again after a failure, resetting the call state so the
   * idempotence guard does not swallow the retry.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retryProfile(): void {
    this.userStore.reload();
  }

  /**
   * Method confirmTotp
   * @method confirmTotp
   *
   * @description
   * Activates the pending key with a code from the authenticator app.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} code - Six digits from the app.
   *
   * @returns {void}
   */
  protected confirmTotp(code: string): void {
    this.totpStore.confirm(code);
  }

  /**
   * Method disableTotp
   * @method disableTotp
   *
   * @description
   * Switches two-factor off, with a current code as proof of possession.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} code - Six digits from the app.
   *
   * @returns {void}
   */
  protected disableTotp(code: string): void {
    this.totpStore.disable(code);
  }

  /**
   * Method requestPasswordChange
   * @method requestPasswordChange
   *
   * @description
   * Verifies the current password, which sends the one-time code.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} currentPassword - The password to verify.
   *
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
   * Applies the new password. The backend revokes every other session as a
   * consequence.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {{ code: string; newPassword: string }} input - Emailed code and new password.
   *
   * @returns {void}
   */
  protected confirmPasswordChange(input: { code: string; newPassword: string }): void {
    this.passwordStore.confirm(input);
  }
  //#endregion
}
