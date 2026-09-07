import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  PLATFORM_ID,
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
import {
  AUTH_SESSION_PORT,
  FederatedConnectionsPanel,
  FederatedPasswordSetupDialog,
  resolveFederatedAuthErrorMessage,
  type AuthSessionPort,
  type FederatedProvider,
  type PasswordSetupConfirmInput,
} from '@features/auth';
import { FederatedAuthStore, SessionStore, TrustedDeviceStore } from '@features/auth/state';
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
 * @version 1.4.0
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
    FederatedConnectionsPanel,
    FederatedPasswordSetupDialog,
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
   * Property federatedStore
   * @readonly
   *
   * @description
   * Owns connected provider and first-password request state.
   *
   * @access private
   * @since 1.4.0
   * @type {FederatedAuthStore}
   */
  private readonly federatedStore = inject(FederatedAuthStore);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Browser document used for authenticated provider redirects.
   *
   * @access private
   * @since 1.4.0
   * @type {Document}
   */
  private readonly document = inject(DOCUMENT);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Runtime platform discriminator guarding browser navigation.
   *
   * @access private
   * @since 1.4.0
   * @type {object}
   */
  private readonly platformId = inject(PLATFORM_ID);

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
   * Property settingPassword
   * @readonly
   *
   * @description
   * Whether the first-password setup dialog is visible.
   *
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly settingPassword: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property signInMethods
   * @readonly
   *
   * @description
   * External sign-in state exposed to the template through the Auth public API.
   *
   * @access protected
   * @since 1.4.0
   * @type {FederatedAuthStore}
   */
  protected readonly signInMethods = this.federatedStore;

  /**
   * Property signInMethodsError
   * @readonly
   *
   * @description Localized error from the first failed sign-in-method operation.
   * @access protected
   * @since 1.4.0
   * @type {Signal<string | null>}
   */
  protected readonly signInMethodsError: Signal<string | null> = computed<string | null>(() => {
    const error =
      this.federatedStore.providersCallState().error ??
      this.federatedStore.connectionsError() ??
      this.federatedStore.startCallState().error ??
      this.federatedStore.disconnectCallState().error;

    return error ? resolveFederatedAuthErrorMessage(error.message) : null;
  });

  /**
   * Property passwordSetupError
   * @readonly
   *
   * @description Localized first-password failure without exposing raw API details.
   * @access protected
   * @since 1.4.0
   * @type {Signal<string | null>}
   */
  protected readonly passwordSetupError: Signal<string | null> = computed<string | null>(() => {
    const requestError = this.federatedStore.passwordSetupRequestCallState().error;
    if (requestError) return resolveFederatedAuthErrorMessage(requestError.message);

    const confirmState = this.federatedStore.passwordSetupConfirmCallState();
    if (confirmState.error) return resolveFederatedAuthErrorMessage(confirmState.error.message);
    if (confirmState.data?.success === false) {
      return resolveFederatedAuthErrorMessage(confirmState.data.errorCode);
    }

    return null;
  });

  /**
   * Property federatedRedirectEffect
   * @readonly
   *
   * @description
   * Sends the browser to the provider after the API persists state and PKCE.
   *
   * @access private
   * @since 1.4.0
   * @type {EffectRef}
   */
  private readonly federatedRedirectEffect: EffectRef = effect((): void => {
    const url = this.federatedStore.startUrl();
    if (!url || !isPlatformBrowser(this.platformId)) return;

    untracked((): void => {
      this.federatedStore.resetStart();
      this.document.defaultView?.location.assign(url);
    });
  });

  /**
   * Property passwordSetupOutcomeEffect
   * @readonly
   *
   * @description
   * Closes first-password setup once the confirmed password is persisted.
   *
   * @access private
   * @since 1.4.0
   * @type {EffectRef}
   */
  private readonly passwordSetupOutcomeEffect: EffectRef = effect((): void => {
    if (!this.federatedStore.passwordSetupConfirmCallState().data?.success) return;

    untracked((): void => this.settingPassword.set(false));
  });

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
    this.federatedStore.loadProviders();
    this.federatedStore.loadConnections();
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
   * Method connectProvider
   * @method connectProvider
   *
   * @description
   * Starts an authenticated full-page provider linking flow.
   *
   * @access protected
   * @since 1.4.0
   * @param {FederatedProvider} provider - Provider selected for connection.
   * @returns {void}
   */
  protected connectProvider(provider: FederatedProvider): void {
    this.federatedStore.startLink(provider);
  }

  /**
   * Method disconnectProvider
   * @method disconnectProvider
   *
   * @description
   * Removes a provider after the presentational confirmation dialog.
   *
   * @access protected
   * @since 1.4.0
   * @param {FederatedProvider} provider - Provider selected for removal.
   * @returns {void}
   */
  protected disconnectProvider(provider: FederatedProvider): void {
    this.federatedStore.disconnect(provider);
  }

  /**
   * Method openPasswordSetup
   * @method openPasswordSetup
   *
   * @description
   * Opens the OTP-protected first-password dialog.
   *
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected openPasswordSetup(): void {
    this.settingPassword.set(true);
  }

  /**
   * Method onPasswordSetupVisibilityChanged
   * @method onPasswordSetupVisibilityChanged
   *
   * @description
   * Mirrors the Spartan dialog state and discards one-time setup data when the
   * dialog closes.
   *
   * @access protected
   * @since 1.4.0
   * @param {boolean} visible - Latest dialog visibility.
   * @returns {void}
   */
  protected onPasswordSetupVisibilityChanged(visible: boolean): void {
    this.settingPassword.set(visible);
    if (!visible) this.federatedStore.resetPasswordSetup();
  }

  /**
   * Method requestPasswordSetup
   * @method requestPasswordSetup
   *
   * @description
   * Requests the email code required for first-password setup.
   *
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected requestPasswordSetup(): void {
    this.federatedStore.requestPasswordSetup();
  }

  /**
   * Method restartPasswordSetup
   * @method restartPasswordSetup
   *
   * @description Replaces an expired or exhausted OTP with a fresh challenge.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected restartPasswordSetup(): void {
    this.federatedStore.resetPasswordSetup();
    this.federatedStore.requestPasswordSetup();
  }

  /**
   * Method confirmPasswordSetup
   * @method confirmPasswordSetup
   *
   * @description
   * Submits the verified first-password payload.
   *
   * @access protected
   * @since 1.4.0
   * @param {PasswordSetupConfirmInput} input - Verified challenge and new password.
   * @returns {void}
   */
  protected confirmPasswordSetup(input: PasswordSetupConfirmInput): void {
    this.federatedStore.confirmPasswordSetup(input);
  }

  /**
   * Method retrySignInMethods
   * @method retrySignInMethods
   *
   * @description
   * Reloads provider availability and the user's connected methods after a
   * partial or complete failure of the sign-in methods section.
   *
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected retrySignInMethods(): void {
    this.federatedStore.resetStart();
    this.federatedStore.resetDisconnect();
    this.federatedStore.loadProviders();
    this.federatedStore.loadConnections();
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
