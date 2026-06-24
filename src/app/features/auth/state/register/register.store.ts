import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { RegistrationService } from '@features/auth/data-access';
import type {
  LoginOutput,
  RegisterInput,
  RegisterOutput,
  RegisterVerifyInput,
} from '@features/auth/models';
import { AuthStore } from '@features/auth/state';
import { registerStoreEvents } from './events';
import type { RegisterState } from './models';

/**
 * Type RegisterVerifyPayload
 *
 * @description
 * Verify payload without the challenge token (which the store already holds).
 */
type RegisterVerifyPayload = Omit<RegisterVerifyInput, 'token'>;

const INITIAL_STATE: RegisterState = {
  currentChallenge: null,
  challengeToken: null,
  maskedRecipient: null,
  requestCallState: idleCallState<RegisterOutput>(),
  verifyCallState: idleCallState<LoginOutput>(),
  resendCallState: idleCallState<RegisterOutput>(),
};

/**
 * Store RegisterStore
 * @const RegisterStore
 *
 * @description
 * NGRX SignalStore for the public self-service registration flow. Handles
 * account creation, email verification (which auto-logs the user in through the
 * {@link AuthStore}), and resending the verification code.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const registerStore = inject<RegisterStore>(RegisterStore);
 * registerStore.register({ firstName: 'Jane', lastName: 'Doe', email: 'j@d.com', password: '...' });
 * registerStore.verify({ code: '123456' });
 * ```
 */
export const RegisterStore = signalStore(
  { providedIn: 'root' },

  withState<RegisterState>(INITIAL_STATE),

  withComputed((store) => ({
    /**
     * Computed isRegistering
     *
     * @description
     * Whether a registration request is in progress.
     *
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isRegistering: computed<boolean>(() => store.requestCallState().status === 'pending'),

    /**
     * Computed registerError
     *
     * @description
     * Registration request error if any.
     *
     * @since 1.0.0
     *
     * @type {Signal<StoreError | null>}
     */
    registerError: computed<StoreError | null>(() => store.requestCallState().error),

    /**
     * Computed isVerifying
     *
     * @description
     * Whether email verification is in progress.
     *
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isVerifying: computed<boolean>(() => store.verifyCallState().status === 'pending'),

    /**
     * Computed verifyError
     *
     * @description
     * Email verification error if any.
     *
     * @since 1.0.0
     *
     * @type {Signal<StoreError | null>}
     */
    verifyError: computed<StoreError | null>(() => store.verifyCallState().error),

    /**
     * Computed isResending
     *
     * @description
     * Whether resending the verification code is in progress.
     *
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isResending: computed<boolean>(() => store.resendCallState().status === 'pending'),

    /**
     * Computed resendError
     *
     * @description
     * Resend error if any.
     *
     * @since 1.0.0
     *
     * @type {Signal<StoreError | null>}
     */
    resendError: computed<StoreError | null>(() => store.resendCallState().error),

    /**
     * Computed hasChallenge
     *
     * @description
     * Whether a verification challenge is currently pending (gates the verify page).
     *
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    hasChallenge: computed<boolean>(() => store.challengeToken() !== null),
  })),

  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      registrationService = inject<RegistrationService>(RegistrationService),
      authStore = inject<AuthStore>(AuthStore),
    ) => ({
      /**
       * Method register
       *
       * @description
       * Creates an account and triggers the email-verification challenge.
       *
       * @since 1.0.0
       *
       * @param {RegisterInput} input - Registration input.
       *
       * @returns {void}
       */
      register: rxMethod<RegisterInput>(
        pipe(
          tap(() => patchState(store, { requestCallState: pendingCallState() })),
          switchMap((input: RegisterInput) =>
            registrationService.register(input).pipe(
              tapResponse({
                next: (response: RegisterOutput) => {
                  patchState(store, {
                    currentChallenge: response,
                    challengeToken: response.challengeToken,
                    maskedRecipient: response.maskedRecipient,
                    requestCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { requestCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    registerStoreEvents.requestFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to create account'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method verify
       *
       * @description
       * Verifies the email with the OTP code. On success the returned session is
       * applied to the {@link AuthStore}, logging the user in automatically.
       *
       * @since 1.0.0
       *
       * @param {RegisterVerifyPayload} input - The verification code.
       *
       * @returns {void}
       */
      verify: rxMethod<RegisterVerifyPayload>(
        pipe(
          tap(() => patchState(store, { verifyCallState: pendingCallState() })),
          switchMap((input: RegisterVerifyPayload) => {
            const token: string | null = store.challengeToken();
            if (!token) {
              const storeError: StoreError = toStoreError('No registration in progress');
              patchState(store, { verifyCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                registerStoreEvents.verifyFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to verify email'),
                ),
              );
              return EMPTY;
            }

            return registrationService.verify({ token, ...input }).pipe(
              tapResponse({
                next: (response: LoginOutput) => {
                  patchState(store, { verifyCallState: successCallState(response) });
                  authStore.applySession(response);
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { verifyCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    registerStoreEvents.verifyFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to verify email'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method resend
       *
       * @description
       * Resends the verification code, replacing the challenge token.
       *
       * @since 1.0.0
       *
       * @returns {void}
       */
      resend: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { resendCallState: pendingCallState() })),
          switchMap(() => {
            const token: string | null = store.challengeToken();
            if (!token) {
              const storeError: StoreError = toStoreError('No registration in progress');
              patchState(store, { resendCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                registerStoreEvents.resendFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to resend code'),
                ),
              );
              return EMPTY;
            }

            return registrationService.resend({ token }).pipe(
              tapResponse({
                next: (response: RegisterOutput) => {
                  patchState(store, {
                    currentChallenge: response,
                    challengeToken: response.challengeToken ?? token,
                    maskedRecipient: response.maskedRecipient,
                    resendCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { resendCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    registerStoreEvents.resendFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to resend code'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method clear
       *
       * @description
       * Clears all registration state.
       *
       * @since 1.0.0
       *
       * @returns {void}
       */
      clear: (): void => {
        patchState(store, INITIAL_STATE);
      },
    }),
  ),
);

/**
 * Type RegisterStore
 * @type RegisterStore
 *
 * @description
 * Type of the RegisterStore instance.
 *
 * @since 1.0.0
 */
export type RegisterStore = InstanceType<typeof RegisterStore>;
