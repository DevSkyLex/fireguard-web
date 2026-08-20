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
import { AccountSessionsPanel } from '@features/account/ui/components/account-sessions-panel';
import { AccountTrustedDevicesPanel } from '@features/account/ui/components/account-trusted-devices-panel';
import { AccountPasswordForm } from '@features/account/ui/forms';
import { SessionStore, TrustedDeviceStore } from '@features/auth/state';
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
  imports: [
    AccountMfaPanel,
    AccountPasswordForm,
    AccountSessionsPanel,
    AccountTrustedDevicesPanel,
    ErrorState,
    HlmButton,
    HlmSkeleton,
  ],
  providers: [
    AccountPasswordChangeStore,
    AccountTotpEnrollmentStore,
    SessionStore,
    TrustedDeviceStore,
  ],
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
   * Property sessionStore
   * @readonly
   *
   * @description
   * Scoped active-session listing and revocation, owned by `features/auth`
   * (`FEATURE.md` "Cross-Feature Dependencies"). Scoped to this page so a
   * revoked entity does not linger if the reader navigates away and back.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {SessionStore}
   */
  protected readonly sessionStore: SessionStore = inject<SessionStore>(SessionStore);

  /**
   * Property trustedDeviceStore
   * @readonly
   *
   * @description
   * Scoped trusted-device listing and revocation, owned by `features/auth`
   * (`FEATURE.md` "Cross-Feature Dependencies").
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {TrustedDeviceStore}
   */
  protected readonly trustedDeviceStore: TrustedDeviceStore =
    inject<TrustedDeviceStore>(TrustedDeviceStore);

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

  /**
   * Property sessionsLoading
   * @readonly
   *
   * @description
   * Whether the active-sessions list is being fetched.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly sessionsLoading: Signal<boolean> = computed(
    (): boolean => this.sessionStore.listCallState().status === 'pending',
  );

  /**
   * Property sessionsLoadError
   * @readonly
   *
   * @description
   * Whether the active-sessions list failed to load.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly sessionsLoadError: Signal<boolean> = computed(
    (): boolean => this.sessionStore.listCallState().status === 'error',
  );

  /**
   * Property devicesLoading
   * @readonly
   *
   * @description
   * Whether the trusted-devices list is being fetched.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly devicesLoading: Signal<boolean> = computed(
    (): boolean => this.trustedDeviceStore.listCallState().status === 'pending',
  );

  /**
   * Property devicesLoadError
   * @readonly
   *
   * @description
   * Whether the trusted-devices list failed to load.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly devicesLoadError: Signal<boolean> = computed(
    (): boolean => this.trustedDeviceStore.listCallState().status === 'error',
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
   * covers the case where that one failed (`ARCHITECTURE.md` §12.3). Also
   * starts the active-sessions and trusted-devices fetches: both are
   * secondary UI, so they load on this page's own initialization rather than
   * a route resolver (`ARCHITECTURE.md`, routing rules).
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.userStore.load();
    this.sessionStore.load();
    this.trustedDeviceStore.load();
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

  /**
   * Method revokeSession
   * @method revokeSession
   *
   * @description
   * Revokes one active session.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} sessionId - The session to revoke.
   *
   * @returns {void}
   */
  protected revokeSession(sessionId: string): void {
    this.sessionStore.revoke(sessionId);
  }

  /**
   * Method revokeOtherSessions
   * @method revokeOtherSessions
   *
   * @description
   * Signs out every session but the current one.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected revokeOtherSessions(): void {
    this.sessionStore.revokeOthers();
  }

  /**
   * Method retrySessions
   * @method retrySessions
   *
   * @description
   * Fetches the active-sessions list again after a failure.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected retrySessions(): void {
    this.sessionStore.load();
  }

  /**
   * Method revokeDevice
   * @method revokeDevice
   *
   * @description
   * Revokes trust for one device.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} deviceId - The device to revoke.
   *
   * @returns {void}
   */
  protected revokeDevice(deviceId: string): void {
    this.trustedDeviceStore.revokeDevice(deviceId);
  }

  /**
   * Method revokeAllDevices
   * @method revokeAllDevices
   *
   * @description
   * Revokes trust for every device at once.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected revokeAllDevices(): void {
    this.trustedDeviceStore.revokeAllDevices();
  }

  /**
   * Method retryDevices
   * @method retryDevices
   *
   * @description
   * Fetches the trusted-devices list again after a failure.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected retryDevices(): void {
    this.trustedDeviceStore.load();
  }
  //#endregion
}
