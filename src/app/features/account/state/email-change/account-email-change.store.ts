import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { UserProfileService } from '@features/account/data-access';
import type { RequestEmailChangeInput, RequestEmailChangeOutput } from '@features/account/models';
import { accountEmailChangeStoreEvents } from './events';
import type { AccountEmailChangeState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state of the sign-in email change workflow.
 *
 * @since 1.0.0
 *
 * @type {AccountEmailChangeState}
 */
const INITIAL_STATE: AccountEmailChangeState = {
  pendingEmail: null,
  expiresAt: null,
  requestCallState: idleCallState(),
  cancelCallState: idleCallState(),
} as const;

/**
 * Store AccountEmailChangeStore
 * @const AccountEmailChangeStore
 *
 * @description
 * Component-scoped workflow store for the sign-in email change. The request
 * (`POST /api/me/email-change`, 202) verifies the current password and emails
 * a confirmation link to the NEW address; the cancellation
 * (`DELETE /api/me/email-change`, 204, idempotent) withdraws the pending
 * request. Confirmation happens on a public page owned by `features/auth` —
 * the link lands in the new mailbox, where no session may exist.
 *
 * The backend exposes no `GET` for a pending request, so `pendingEmail` is
 * page-lifetime state only: after a reload the section shows the plain form
 * again, which is safe because a new request replaces the pending one
 * server-side (`FEATURE.md`).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AccountEmailChangeStore = signalStore(
  //#region State
  withState<AccountEmailChangeState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isRequesting
     *
     * @description
     * Whether an email change request (or re-request) is in flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRequesting: computed<boolean>(() => store.requestCallState().status === 'pending'),

    /**
     * Computed isCancelling
     *
     * @description
     * Whether the cancellation is in flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isCancelling: computed<boolean>(() => store.cancelCallState().status === 'pending'),

    /**
     * Computed requestError
     *
     * @description
     * Error of the latest email change request, if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    requestError: computed<StoreError | null>(() => store.requestCallState().error),

    /**
     * Computed hasPendingRequest
     *
     * @description
     * Whether a confirmation link was sent during this page's lifetime and
     * has been neither cancelled nor superseded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasPendingRequest: computed<boolean>(() => store.pendingEmail() !== null),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      userProfileService = inject<UserProfileService>(UserProfileService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method request
       *
       * @description
       * Requests the email change (also used to resend the link — the
       * backend replaces the pending request). On acceptance (202) records
       * the address the confirmation link went to; on failure raises the
       * toast with the backend's neutral message. `exhaustMap` gates a
       * double submit.
       *
       * @since 1.0.0
       *
       * @param {RequestEmailChangeInput} input - New address and current password.
       */
      request: rxMethod<RequestEmailChangeInput>(
        pipe(
          tap((): void => patchState(store, { requestCallState: pendingCallState() })),
          exhaustMap((input: RequestEmailChangeInput) =>
            userProfileService.requestEmailChange(input).pipe(
              tapResponse({
                next: (result: RequestEmailChangeOutput) => {
                  patchState(store, {
                    pendingEmail: input.newEmail,
                    expiresAt: result.expiresAt ?? null,
                    requestCallState: successCallState(result),
                    cancelCallState: idleCallState(),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { requestCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    accountEmailChangeStoreEvents.requestFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@account.email.requestFailed:The email change could not be requested.`,
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
       * Method cancel
       *
       * @description
       * Cancels the pending request (`DELETE`, idempotent). On success the
       * section falls back to the plain form; the toast stays silent because
       * that swap is the visible outcome.
       *
       * @since 1.0.0
       */
      cancel: rxMethod<void>(
        pipe(
          tap((): void => patchState(store, { cancelCallState: pendingCallState() })),
          exhaustMap(() =>
            userProfileService.cancelEmailChange().pipe(
              tapResponse({
                next: () => {
                  patchState(store, {
                    pendingEmail: null,
                    expiresAt: null,
                    cancelCallState: successCallState(null),
                    requestCallState: idleCallState(),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { cancelCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    accountEmailChangeStoreEvents.cancelFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@account.email.cancelFailed:The pending email change could not be cancelled.`,
                      ),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
    }),
  ),
  //#endregion
);

/**
 * Type AccountEmailChangeStore
 * @type AccountEmailChangeStore
 *
 * @description
 * Injectable instance type exposed by {@link AccountEmailChangeStore}.
 *
 * @since 1.0.0
 */
export type AccountEmailChangeStore = InstanceType<typeof AccountEmailChangeStore>;
