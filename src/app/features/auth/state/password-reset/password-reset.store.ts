import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { PasswordResetService } from '@features/auth/data-access';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
  type StoreError,
} from '@core/state/request-state';
import type {
  PasswordResetRequestInput,
  PasswordResetRequestOutput,
  PasswordResetResendInput,
  PasswordResetResendOutput,
  PasswordResetVerifyInput,
  PasswordResetVerifyOutput,
} from '@features/auth/models';
import type { PasswordResetState } from './password-reset-state.interface';
import { passwordResetStoreEvents } from './password-reset.events';

type PasswordResetConfirmPayload = Omit<PasswordResetVerifyInput, 'token'>;

/**
 * Store PasswordResetStore
 *
 * @description
 * NGRX SignalStore for password reset state management.
 * Handles password reset request and verification flow.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // In component
 * protected readonly passwordResetStore = inject(PasswordResetStore);
 *
 * // Request password reset
 * this.passwordResetStore.request({ email: 'user@example.com' });
 *
 * // Store code then confirm with new password
 * this.passwordResetStore.setVerificationCode('123456');
 * this.passwordResetStore.confirm({ code: '123456', newPassword: 'SecureP@ssw0rd!' });
 * ```
 */
export const PasswordResetStore = signalStore(
  { providedIn: 'root' },

  withState<PasswordResetState>({
    currentRequest: null,
    challengeToken: null,
    verificationCode: null,
    requestCallState: idleCallState<PasswordResetRequestOutput>(),
    confirmCallState: idleCallState<PasswordResetVerifyOutput>(),
    resendCallState: idleCallState<PasswordResetResendOutput>(),
  }),

  withComputed((store) => ({
    /**
     * Computed isRequesting
     * @readonly
     *
     * @description
     * Whether a password reset request is in progress.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isRequesting: computed<boolean>(() => store.requestCallState().status === 'pending'),

    /**
     * Computed requestError
     * @readonly
     *
     * @description
     * Password reset request error if any.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<StoreError | null>}
     */
    requestError: computed(() => store.requestCallState().error),

    /**
     * Computed isConfirming
     * @readonly
     *
     * @description
     * Whether password reset confirmation is in progress.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isConfirming: computed<boolean>(() => store.confirmCallState().status === 'pending'),

    /**
     * Computed confirmError
     * @readonly
     *
     * @description
     * Confirmation error if any.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<StoreError | null>}
     */
    confirmError: computed(() => store.confirmCallState().error),

    /**
     * Computed isResending
     * @readonly
     *
     * @description
     * Whether password reset code resend is in progress.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isResending: computed<boolean>(() => store.resendCallState().status === 'pending'),

    /**
     * Computed resendError
     * @readonly
     *
     * @description
     * Resend error if any.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<StoreError | null>}
     */
    resendError: computed(() => store.resendCallState().error),
  })),
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    passwordResetService = inject(PasswordResetService),
  ) => ({
    /**
     * Method request
     *
     * @description
     * Requests a password reset by email.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {PasswordResetRequestInput} input - Request input.
     *
     * @returns {void}
     */
    request: rxMethod<PasswordResetRequestInput>(
      pipe(
        tap(() =>
          patchState(store, { requestCallState: pendingCallState() })
        ),
        switchMap((input: PasswordResetRequestInput) =>
          passwordResetService.request(input).pipe(
            tapResponse({
              next: (response: PasswordResetRequestOutput) => {
                patchState(store, {
                  currentRequest: response,
                  challengeToken: response.challengeToken ?? null,
                  verificationCode: null,
                  requestCallState: successCallState(response),
                });
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { requestCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  passwordResetStoreEvents.requestFailed(
                    toStoreFailureEventPayload(
                      storeError,
                      'Failed to send verification code',
                    ),
                  ),
                );
              },
            })
          )
        )
      )
    ),

    /**
     * Method setVerificationCode
     *
     * @description
     * Stores the verification code entered by the user.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {string} code - Verification code.
     *
     * @returns {void}
     */
    setVerificationCode: (code: string): void => {
      patchState(store, {
        verificationCode: code,
      });
    },

    /**
     * Method setChallengeToken
     *
     * @description
     * Stores the challenge token for confirmation.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {string} token - Challenge token.
     *
     * @returns {void}
     */
    setChallengeToken: (token: string): void => {
      patchState(store, {
        challengeToken: token,
      });
    },

    /**
     * Method confirm
     *
     * @description
     * Confirms the password reset and sets the new password.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {PasswordResetConfirmPayload} input - Confirmation input.
     *
     * @returns {void}
     */
    confirm: rxMethod<PasswordResetConfirmPayload>(
      pipe(
        tap(() =>
          patchState(store, { confirmCallState: pendingCallState() })
        ),
        switchMap((input: PasswordResetConfirmPayload) => {
          const token = store.challengeToken();
          if (!token) {
            const storeError: StoreError = toStoreError('No password reset request found');
            patchState(store, { confirmCallState: errorCallState(storeError) });
            dispatcher.dispatch(
              passwordResetStoreEvents.confirmFailed(
                toStoreFailureEventPayload(storeError, 'Failed to reset password'),
              ),
            );
            return EMPTY;
          }

          return passwordResetService.confirm({
            token,
            ...input,
          }).pipe(
            tapResponse({
              next: (response: PasswordResetVerifyOutput) => {
                patchState(store, { confirmCallState: successCallState(response) });
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { confirmCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  passwordResetStoreEvents.confirmFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to reset password'),
                  ),
                );
              },
            })
          );
        })
      )
    ),

    /**
     * Method clear
     *
     * @description
     * Clears all password reset state.
     *
     * @access public
     * @since 1.0.0
     *
     * @returns {void}
     */
    clear: (): void => {
      patchState(store, {
        currentRequest: null,
        challengeToken: null,
        verificationCode: null,
        requestCallState: idleCallState<PasswordResetRequestOutput>(),
        confirmCallState: idleCallState<PasswordResetVerifyOutput>(),
        resendCallState: idleCallState<PasswordResetResendOutput>(),
      });
    },

    /**
     * Method resend
     * @method resend
     *
     * @description
     * Resends the password reset code.
     * Updates the challenge token with the new one received.
     *
     * @access public
     * @since 1.0.0
     *
     * @returns {void}
     */
    resend: rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, { resendCallState: pendingCallState() })
        ),
        switchMap(() => {
          const token = store.challengeToken();
          if (!token) {
            const storeError: StoreError = toStoreError('No challenge token found');
            patchState(store, { resendCallState: errorCallState(storeError) });
            dispatcher.dispatch(
              passwordResetStoreEvents.resendFailed(
                toStoreFailureEventPayload(storeError, 'Failed to resend code'),
              ),
            );
            return EMPTY;
          }

          return passwordResetService.resend({ token }).pipe(
            tapResponse({
              next: (response: PasswordResetResendOutput) => {
                patchState(store, {
                  currentRequest: response,
                  challengeToken: response.challengeToken ?? null,
                  resendCallState: successCallState(response),
                });
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { resendCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  passwordResetStoreEvents.resendFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to resend code'),
                  ),
                );
              },
            })
          );
        })
      )
    ),
  }))
);

/**
 * Type PasswordResetStore
 * @type PasswordResetStore
 *
 * @description
 * Type of the PasswordResetStore instance.
 *
 * @since 1.0.0
 */
export type PasswordResetStore = InstanceType<typeof PasswordResetStore>;
