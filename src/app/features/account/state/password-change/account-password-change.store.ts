import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import { UserProfileService } from '@features/account/data-access';
import type {
  ConfirmPasswordChangeOutput,
  RequestPasswordChangeOutput,
} from '@features/account/models';
import type { AccountPasswordChangeState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state of the authenticated password change workflow.
 *
 * @since 1.0.0
 *
 * @type {AccountPasswordChangeState}
 */
const INITIAL_STATE: AccountPasswordChangeState = {
  step: 'request',
  challenge: null,
  requestCallState: idleCallState(),
  confirmCallState: idleCallState(),
} as const;

/**
 * Store AccountPasswordChangeStore
 * @const AccountPasswordChangeStore
 *
 * @description
 * Component-scoped workflow store for the authenticated password change
 * flow. Step one verifies the current password and sends a one-time code
 * by email (`POST /api/me/password/request`); step two confirms the code
 * and the new password (`POST /api/me/password/confirm`). On success the
 * backend revokes every active session and OAuth token.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AccountPasswordChangeStore = signalStore(
  //#region State
  withState<AccountPasswordChangeState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isRequesting
     *
     * @description
     * Whether the password change request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRequesting: computed<boolean>(() => store.requestCallState().status === 'pending'),

    /**
     * Computed isConfirming
     *
     * @description
     * Whether the password change confirmation is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isConfirming: computed<boolean>(() => store.confirmCallState().status === 'pending'),

    /**
     * Computed requestError
     *
     * @description
     * Error of the latest password change request, if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    requestError: computed<StoreError | null>(() => store.requestCallState().error),

    /**
     * Computed confirmError
     *
     * @description
     * Error of the latest password change confirmation, if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    confirmError: computed<StoreError | null>(() => store.confirmCallState().error),

    /**
     * Computed maskedRecipient
     *
     * @description
     * Masked email address the one-time code was sent to.
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    maskedRecipient: computed<string | null>(() => store.challenge()?.maskedRecipient ?? null),
  })),
  //#endregion

  //#region Methods
  withMethods((store, userProfileService = inject<UserProfileService>(UserProfileService)) => ({
    /**
     * Method request
     *
     * @description
     * Verifies the current password and sends the one-time code by email.
     * Moves the workflow to the verify step on success.
     *
     * @since 1.0.0
     *
     * @param {string} currentPassword - Current password to verify.
     */
    request: rxMethod<string>(
      pipe(
        tap((): void => patchState(store, { requestCallState: pendingCallState() })),
        exhaustMap((currentPassword: string) =>
          userProfileService.requestPasswordChange({ currentPassword }).pipe(
            tapResponse({
              next: (challenge: RequestPasswordChangeOutput) => {
                patchState(store, {
                  step: 'verify',
                  challenge,
                  requestCallState: successCallState(challenge),
                });
              },
              error: (error: unknown) =>
                patchState(store, { requestCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),

    /**
     * Method confirm
     *
     * @description
     * Confirms the password change with the one-time code and the new
     * password. Moves the workflow to the success step when done.
     *
     * @since 1.0.0
     *
     * @param {{ code: string; newPassword: string }} input - OTP code and new password.
     */
    confirm: rxMethod<{ code: string; newPassword: string }>(
      pipe(
        tap((): void => patchState(store, { confirmCallState: pendingCallState() })),
        exhaustMap(({ code, newPassword }) =>
          userProfileService
            .confirmPasswordChange({
              token: store.challenge()?.challengeToken ?? '',
              code,
              newPassword,
            })
            .pipe(
              tapResponse({
                next: (result: ConfirmPasswordChangeOutput) => {
                  patchState(store, {
                    step: 'success',
                    confirmCallState: successCallState(result),
                  });
                },
                error: (error: unknown) =>
                  patchState(store, { confirmCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
        ),
      ),
    ),

    /**
     * Method restart
     *
     * @description
     * Resets the workflow back to the request step, clearing any pending
     * challenge and errors.
     *
     * @since 1.0.0
     */
    restart(): void {
      patchState(store, INITIAL_STATE);
    },
  })),
  //#endregion
);

/**
 * Type AccountPasswordChangeStore
 * @type AccountPasswordChangeStore
 *
 * @description
 * Injectable instance type exposed by {@link AccountPasswordChangeStore}.
 *
 * @since 1.0.0
 */
export type AccountPasswordChangeStore = InstanceType<typeof AccountPasswordChangeStore>;
