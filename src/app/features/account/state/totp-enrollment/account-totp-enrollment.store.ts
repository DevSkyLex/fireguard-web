import { computed, inject, DestroyRef, effect, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { WriteOperationService } from '@core/request-state';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  isCallSuccess,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { TotpService } from '@features/account/data-access';
import type {
  DisableTotpInput,
  ConfirmTotpOutput,
  DisableTotpOutput,
  SetupTotpOutput,
} from '@features/account/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { UserStore } from '../user';
import { accountTotpEnrollmentStoreEvents } from './events';
import type { AccountTotpEnrollmentState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Initial state of the TOTP enrollment workflow.
 *
 * @since 1.0.0
 *
 * @type {AccountTotpEnrollmentState}
 *
 * @const INITIAL_STATE
 */
const INITIAL_STATE: AccountTotpEnrollmentState = {
  setupCallState: idleCallState(),
  confirmCallState: idleCallState(),
  disableCallState: idleCallState(),
} as const;

/**
 * Constant AccountTotpEnrollmentStore
 *
 * @description
 * Component-scoped workflow store driving the full authenticator app (TOTP)
 * enrollment lifecycle: generating a pending secret (`POST
 * /api/otp/totp/setup`), activating it with a verification code (`POST
 * /api/otp/totp/confirm`), and disabling an active enrollment with a
 * proof-of-possession code (`POST /api/otp/totp/disable`). `confirm` and
 * `disable` reload {@link UserStore} on success so `totpEnabled` — the
 * authoritative enrollment flag — reflects the new state across the shell.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const AccountTotpEnrollmentStore
 */
export const AccountTotpEnrollmentStore = signalStore(
  //#region State
  withState<AccountTotpEnrollmentState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * @description
     * Computed isSettingUp
     * Whether the setup call is in flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isSettingUp: computed<boolean>(() => isCallPending(store.setupCallState())),

    /**
     * @description
     * Computed isConfirming
     * Whether the confirm call is in flight.
     *
     * @since 2.0.0
     *
     * @returns {boolean}
     */
    isConfirming: computed<boolean>(() => isCallPending(store.confirmCallState())),

    /**
     * @description
     * Computed isDisabling
     * Whether the disable call is in flight.
     *
     * @since 2.0.0
     *
     * @returns {boolean}
     */
    isDisabling: computed<boolean>(() => isCallPending(store.disableCallState())),

    /**
     * @description
     * Computed setupResult
     * Latest generated secret and provisioning URI, if any.
     *
     * @since 1.0.0
     *
     * @returns {SetupTotpOutput | null}
     */
    setupResult: computed<SetupTotpOutput | null>(() => {
      const state = store.setupCallState();
      return isCallSuccess(state) ? state.data : null;
    }),

    /**
     * @description
     * Computed setupError
     * Error of the latest setup call, if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    setupError: computed<StoreError | null>(() => store.setupCallState().error),

    /**
     * @description
     * Computed confirmError
     * Error of the latest confirm call, if any.
     *
     * @since 2.0.0
     *
     * @returns {StoreError | null}
     */
    confirmError: computed<StoreError | null>(() => store.confirmCallState().error),

    /**
     * @description
     * Computed disableError
     * Error of the latest disable call, if any.
     *
     * @since 2.0.0
     *
     * @returns {StoreError | null}
     */
    disableError: computed<StoreError | null>(() => store.disableCallState().error),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      totpService = inject<TotpService>(TotpService),
      userStore = inject<UserStore>(UserStore),
      dispatcher = inject<Dispatcher>(Dispatcher),
      writeTracker = inject(WriteOperationService).createTracker(),
      intentSession = inject(AUTH_SESSION_PORT),
      _intentTrackingLifecycle = (() => {
        const reference = inject(DestroyRef);
        reference.onDestroy(() => writeTracker.clear());
        let observedRevision = intentSession.sessionRevision();
        effect(() => {
          const revision = intentSession.sessionRevision();
          if (revision !== observedRevision) {
            observedRevision = revision;
            untracked(() => writeTracker.clear());
          }
        });
        return undefined;
      })(),
    ) => ({
      /**
       * Method setup
       *
       * @description
       * Generates a new pending TOTP secret and provisioning URI. Safe to
       * call again to regenerate a fresh key (the previous pending secret is
       * replaced server-side).
       *
       * @since 1.0.0
       */
      setup: rxMethod<void>(
        pipe(
          tap((): void => patchState(store, { setupCallState: pendingCallState() })),
          switchMap(() =>
            totpService
              .setup(writeTracker.options('totpService.setup', [], intentSession.sessionRevision()))
              .pipe(
                tap({
                  next: (result): void => {
                    const outcome: unknown = result;
                    if (
                      outcome &&
                      typeof outcome === 'object' &&
                      'success' in outcome &&
                      outcome.success === false
                    )
                      return;
                    writeTracker.complete('totpService.setup');
                  },
                }),
                tapResponse({
                  next: (result: SetupTotpOutput) =>
                    patchState(store, { setupCallState: successCallState(result) }),
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { setupCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      accountTotpEnrollmentStoreEvents.setupFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          $localize`:@@account.mfa.setupError:A new authenticator key could not be generated.`,
                        ),
                      ),
                    );
                  },
                }),
              ),
          ),
        ),
      ),

      /**
       * Method confirm
       *
       * @description
       * Verifies a code from the authenticator app against the pending
       * secret and activates TOTP on success. Reloads {@link UserStore} so
       * `totpEnabled` flips across the shell without a page refresh.
       *
       * @since 2.0.0
       *
       * @param {string} code - 6-digit code generated by the authenticator app.
       */
      confirm: rxMethod<string>(
        pipe(
          tap((): void => patchState(store, { confirmCallState: pendingCallState() })),
          switchMap((code: string) =>
            totpService
              .confirm(
                code,
                writeTracker.options(
                  'totpService.confirm',
                  [code],
                  intentSession.sessionRevision(),
                ),
              )
              .pipe(
                tap({
                  next: (result): void => {
                    const outcome: unknown = result;
                    if (
                      outcome &&
                      typeof outcome === 'object' &&
                      'success' in outcome &&
                      outcome.success === false
                    )
                      return;
                    writeTracker.complete('totpService.confirm');
                  },
                }),
                tapResponse({
                  next: (result: ConfirmTotpOutput) => {
                    patchState(store, { confirmCallState: successCallState(result) });
                    userStore.reload();
                    dispatcher.dispatch(
                      accountTotpEnrollmentStoreEvents.confirmSucceeded(
                        successFeedback(
                          $localize`:@@account.mfa.enabled:Two-factor authentication is now on.`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { confirmCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      accountTotpEnrollmentStoreEvents.confirmFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          $localize`:@@account.mfa.confirmError:That code did not match. Check your authenticator app and try again.`,
                        ),
                      ),
                    );
                  },
                }),
              ),
          ),
        ),
      ),

      /**
       * Method disable
       *
       * @description
       * Disables TOTP using a valid current code as proof of possession.
       * Reloads {@link UserStore} so `totpEnabled` flips across the shell
       * without a page refresh.
       *
       * @since 2.0.0
       *
       * @param {string} code - Current 6-digit code from the authenticator app.
       */
      disable: rxMethod<string | DisableTotpInput>(
        pipe(
          tap((): void => patchState(store, { disableCallState: pendingCallState() })),
          switchMap((proof: string | DisableTotpInput) =>
            (typeof proof === 'string'
              ? totpService.disable(
                  proof,
                  'totp',
                  writeTracker.options(
                    'totpService.disable',
                    [proof],
                    intentSession.sessionRevision(),
                  ),
                )
              : totpService.disable(
                  proof.code,
                  proof.proofType,
                  writeTracker.options(
                    'totpService.disable',
                    [proof.code, proof.proofType],
                    intentSession.sessionRevision(),
                  ),
                )
            ).pipe(
              tapResponse({
                next: (result: DisableTotpOutput) => {
                  if (result.success) writeTracker.complete('totpService.disable');
                  patchState(store, { disableCallState: successCallState(result) });
                  userStore.reload();
                  dispatcher.dispatch(
                    accountTotpEnrollmentStoreEvents.disableSucceeded(
                      successFeedback(
                        $localize`:@@account.mfa.disabled:Two-factor authentication is now off.`,
                      ),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { disableCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    accountTotpEnrollmentStoreEvents.disableFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@account.mfa.disableError:That code did not match, so two-factor authentication is still on.`,
                      ),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method cancelSetup
       *
       * @description
       * Discards the previewed pending secret and any confirm error, resetting
       * the workflow back to its initial "not started" state.
       *
       * @since 2.0.0
       */
      cancelSetup(): void {
        patchState(store, {
          setupCallState: idleCallState(),
          confirmCallState: idleCallState(),
        });
      },
    }),
  ),
  //#endregion
);

/**
 * Type AccountTotpEnrollmentStore
 *
 * @description
 * Injectable instance type exposed by {@link AccountTotpEnrollmentStore}.
 *
 * @since 1.0.0
 *
 * @type AccountTotpEnrollmentStore
 */
export type AccountTotpEnrollmentStore = InstanceType<typeof AccountTotpEnrollmentStore>;
