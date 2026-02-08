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
import { PasswordResetService } from '@core/services/api/password-reset';
import {
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createErrorOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import type {
  PasswordResetRequestInput,
  PasswordResetRequestOutput,
  PasswordResetResendInput,
  PasswordResetResendOutput,
  PasswordResetVerifyInput,
  PasswordResetVerifyOutput,
} from '@core/models/password-reset';
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
    requestOperation: createIdleOperation<PasswordResetRequestOutput, unknown>(),
    confirmOperation: createIdleOperation<PasswordResetVerifyOutput, unknown>(),
    resendOperation: createIdleOperation<PasswordResetResendOutput, unknown>(),
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
    isRequesting: computed<boolean>(() => store.requestOperation().status === 'loading'),

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
     * @type {Signal<OperationError<unknown> | null>}
     */
    requestError: computed(() => store.requestOperation().error),

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
    isConfirming: computed<boolean>(() => store.confirmOperation().status === 'loading'),

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
     * @type {Signal<OperationError<unknown> | null>}
     */
    confirmError: computed(() => store.confirmOperation().error),

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
    isResending: computed<boolean>(() => store.resendOperation().status === 'loading'),

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
     * @type {Signal<OperationError<unknown> | null>}
     */
    resendError: computed(() => store.resendOperation().error),
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
          patchState(store, {
            requestOperation: createLoadingOperation(store.requestOperation().data),
          })
        ),
        switchMap((input: PasswordResetRequestInput) =>
          passwordResetService.request(input).pipe(
            tapResponse({
              next: (response: PasswordResetRequestOutput) => {
                patchState(store, {
                  currentRequest: response,
                  challengeToken: response.challengeToken ?? null,
                  verificationCode: null,
                  requestOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> = createOperationErrorFromUnknown(error);
                patchState(store, {
                  requestOperation: createErrorOperation(
                    operationError,
                    store.requestOperation().data,
                  ),
                });

                dispatcher.dispatch(
                  passwordResetStoreEvents.requestFailed(
                    toOperationFailureEventPayload(
                      operationError,
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
          patchState(store, {
            confirmOperation: createLoadingOperation(store.confirmOperation().data),
          })
        ),
        switchMap((input: PasswordResetConfirmPayload) => {
          const token = store.challengeToken();
          if (!token) {
            const operationError: OperationError<unknown> =
              createOperationErrorFromUnknown('No password reset request found');
            patchState(store, {
              confirmOperation: createErrorOperation(
                operationError,
                store.confirmOperation().data,
              ),
            });
            dispatcher.dispatch(
              passwordResetStoreEvents.confirmFailed(
                toOperationFailureEventPayload(
                  operationError,
                  'Failed to reset password'
                ),
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
                patchState(store, {
                  confirmOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  confirmOperation: createErrorOperation(
                    operationError,
                    store.confirmOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  passwordResetStoreEvents.confirmFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to reset password'
                    ),
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
        requestOperation: createIdleOperation<PasswordResetRequestOutput, unknown>(),
        confirmOperation: createIdleOperation<PasswordResetVerifyOutput, unknown>(),
        resendOperation: createIdleOperation<PasswordResetResendOutput, unknown>(),
      });
    },

    /**
     * Method resend
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
          patchState(store, {
            resendOperation: createLoadingOperation(store.resendOperation().data),
          })
        ),
        switchMap(() => {
          const token = store.challengeToken();
          if (!token) {
            const operationError: OperationError<unknown> =
              createOperationErrorFromUnknown('No challenge token found');
            patchState(store, {
              resendOperation: createErrorOperation(
                operationError,
                store.resendOperation().data,
              ),
            });
            dispatcher.dispatch(
              passwordResetStoreEvents.resendFailed(
                toOperationFailureEventPayload(operationError, 'Failed to resend code'),
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
                  resendOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  resendOperation: createErrorOperation(
                    operationError,
                    store.resendOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  passwordResetStoreEvents.resendFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to resend code'),
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
