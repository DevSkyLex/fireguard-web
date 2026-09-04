import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
  type EffectRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert } from '@ng-icons/lucide';
import {
  AccountDeactivationStore,
  AccountEmailChangeStore,
  AccountPasswordChangeStore,
  AccountTotpEnrollmentStore,
  UserStore,
} from '@features/account/state';
import { AccountMfaPanel } from '@features/account/ui/components/account-mfa-panel';
import { AccountSessionsPanel } from '@features/account/ui/components/account-sessions-panel';
import { AccountTrustedDevicesPanel } from '@features/account/ui/components/account-trusted-devices-panel';
import { AccountDeactivateDialog } from '@features/account/ui/dialogs/account-deactivate-dialog';
import { AccountEmailChangeDialog } from '@features/account/ui/dialogs/account-email-change-dialog';
import { AccountPasswordForm, type AccountEmailChangeFormValues } from '@features/account/ui/forms';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth';
import { SessionStore, TrustedDeviceStore } from '@features/auth/state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
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
 * The danger zone at the foot of the page carries self-service account
 * deactivation: a destructive card opening a confirmation dialog, and on
 * success the local session is purged and the reader lands on the login page.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-security-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    AccountDeactivateDialog,
    AccountEmailChangeDialog,
    AccountMfaPanel,
    AccountPasswordForm,
    AccountSessionsPanel,
    AccountTrustedDevicesPanel,
    HlmButton,
    ...HlmCardImports,
    HlmSkeleton,
  ],
  providers: [
    AccountDeactivationStore,
    AccountEmailChangeStore,
    AccountPasswordChangeStore,
    AccountTotpEnrollmentStore,
    SessionStore,
    TrustedDeviceStore,
    provideIcons({ lucideTriangleAlert }),
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
   * Property emailChangeStore
   * @readonly
   *
   * @description
   * Scoped sign-in email change workflow. The backend keeps no readable
   * pending state, so the "link sent" panel this drives lives exactly as
   * long as this page does — a reload shows the plain form again, which is
   * safe because a new request replaces the pending one server-side.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {AccountEmailChangeStore}
   */
  protected readonly emailChangeStore: AccountEmailChangeStore =
    inject<AccountEmailChangeStore>(AccountEmailChangeStore);

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
   * Property deactivationStore
   * @readonly
   *
   * @description
   * Scoped account deactivation workflow. The endpoint takes no confirmation
   * body, so the store carries nothing but the single call state.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {AccountDeactivationStore}
   */
  protected readonly deactivationStore = inject(AccountDeactivationStore);

  /**
   * Property authSession
   * @readonly
   *
   * @description
   * Auth-owned session surface, consumed as a port so this feature never
   * reaches into auth state. `clearSession()` is the same local purge the 401
   * path uses: it drops the token, clears the profile and fires `sessionEnded`.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {AuthSessionPort}
   */
  private readonly authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to leave for the login page once the account has been deactivated.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property confirmingDeactivation
   * @readonly
   *
   * @description
   * Whether the deactivation confirmation dialog is open.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingDeactivation: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property changingEmail
   * @readonly
   *
   * @description
   * Whether the email change dialog is open. The resend path reopens it with
   * the pending address prefilled — the password is asked again because it is
   * never retained client-side.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly changingEmail: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property previousEmailRequestStatus
   *
   * @description
   * The email change request call state as of the last time
   * {@link closeDialogOnEmailRequest} ran, so it can spot the transition into
   * success rather than the state of being in it.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {string}
   */
  private previousEmailRequestStatus: string = 'idle';

  /**
   * Property closeDialogOnEmailRequest
   * @readonly
   *
   * @description
   * Closes the email change dialog the moment a request is accepted (202) —
   * the section swaps to its "link sent" panel naming the address, which is
   * the confirmation. Keyed on the transition into success, matching
   * {@link leaveForLoginOnDeactivate}.
   *
   * @access private
   * @since 1.4.0
   */
  private readonly closeDialogOnEmailRequest: EffectRef = effect((): void => {
    const status: string = this.emailChangeStore.requestCallState().status;
    const previous: string = this.previousEmailRequestStatus;
    this.previousEmailRequestStatus = status;

    if (previous === status || status !== 'success') return;

    untracked((): void => {
      this.changingEmail.set(false);
    });
  });

  /**
   * Property currentEmail
   * @readonly
   *
   * @description
   * The address the user signs in with today, read from the profile.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly currentEmail: Signal<string | null> = computed(
    (): string | null => this.userStore.profile()?.email ?? null,
  );

  /**
   * Property previousDeactivateStatus
   *
   * @description
   * The deactivation call state as of the last time
   * {@link leaveForLoginOnDeactivate} ran, so it can spot the transition into
   * success rather than the state of being in it.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {string}
   */
  private previousDeactivateStatus: string = 'idle';

  /**
   * Property leaveForLoginOnDeactivate
   * @readonly
   *
   * @description
   * Once the deactivation succeeds, purges the local session and leaves for
   * the login page. The backend has already revoked every server-side session,
   * so this is the logout flow's local half — `clearSession()` (token, profile,
   * `sessionEnded`) followed by the navigation the interceptor's 401 path also
   * performs. Keyed on the transition into success, matching
   * `OrganizationSettingsPage`'s `navigateAwayOnDelete`.
   *
   * @access private
   * @since 1.3.0
   */
  private readonly leaveForLoginOnDeactivate: EffectRef = effect((): void => {
    const status: string = this.deactivationStore.deactivateCallState().status;
    const previous: string = this.previousDeactivateStatus;
    this.previousDeactivateStatus = status;

    if (previous !== 'pending' || status !== 'success') return;

    untracked((): void => {
      this.confirmingDeactivation.set(false);
      this.authSession.clearSession();
      void this.router.navigate(['/auth/login']);
    });
  });

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

  /**
   * Method openEmailChangeDialog
   * @method openEmailChangeDialog
   *
   * @description
   * Opens the email change dialog. Also the resend path: with a request
   * pending, the form prefills the pending address and asks only for the
   * password again — submitting re-POSTs, and the backend replaces the
   * pending request.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected openEmailChangeDialog(): void {
    this.changingEmail.set(true);
  }

  /**
   * Method requestEmailChange
   * @method requestEmailChange
   *
   * @description
   * Requests the sign-in email change (or resends the link) once the dialog
   * form validates.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {AccountEmailChangeFormValues} values - New address and current password.
   *
   * @returns {void}
   */
  protected requestEmailChange(values: AccountEmailChangeFormValues): void {
    this.emailChangeStore.request(values);
  }

  /**
   * Method cancelEmailChange
   * @method cancelEmailChange
   *
   * @description
   * Withdraws the pending email change request (idempotent server-side).
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected cancelEmailChange(): void {
    this.emailChangeStore.cancel();
  }

  /**
   * Method openDeactivateDialog
   * @method openDeactivateDialog
   *
   * @description
   * Opens the deactivation confirmation dialog.
   *
   * @access protected
   * @since 1.3.0
   *
   * @returns {void}
   */
  protected openDeactivateDialog(): void {
    this.confirmingDeactivation.set(true);
  }

  /**
   * Method deactivateAccount
   * @method deactivateAccount
   *
   * @description
   * Deactivates the account once the dialog confirms it.
   *
   * @access protected
   * @since 1.3.0
   *
   * @returns {void}
   */
  protected deactivateAccount(): void {
    this.deactivationStore.deactivate();
  }
  //#endregion
}
