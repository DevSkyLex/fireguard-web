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
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { UserProfileService } from '@features/account/data-access';
import type { UserProfileOutput } from '@features/account/models';
import { accountDeactivationStoreEvents } from './events';
import type { AccountDeactivationState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state of the account deactivation workflow.
 *
 * @since 1.0.0
 *
 * @type {AccountDeactivationState}
 */
const INITIAL_STATE: AccountDeactivationState = {
  deactivateCallState: idleCallState(),
} as const;

/**
 * Store AccountDeactivationStore
 * @const AccountDeactivationStore
 *
 * @description
 * Component-scoped workflow store for self-service account deactivation
 * (`POST /api/me/deactivate`). The endpoint takes no body; on success the
 * backend deactivates the account and revokes every active session, so the
 * owning page's only follow-up is to purge the local session and leave for
 * the login screen. Reactivation is admin-only — signing in again does not
 * restore the account.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AccountDeactivationStore = signalStore(
  //#region State
  withState<AccountDeactivationState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isDeactivating
     *
     * @description
     * Whether the deactivation request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isDeactivating: computed<boolean>(() => store.deactivateCallState().status === 'pending'),

    /**
     * Computed deactivateError
     *
     * @description
     * Error of the latest deactivation attempt, if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    deactivateError: computed<StoreError | null>(() => store.deactivateCallState().error),
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
       * Method deactivate
       *
       * @description
       * Deactivates the authenticated user's own account. `exhaustMap` gates a
       * double activation while a request is already in flight.
       *
       * @since 1.0.0
       */
      deactivate: rxMethod<void>(
        pipe(
          tap((): void => patchState(store, { deactivateCallState: pendingCallState() })),
          exhaustMap(() =>
            userProfileService.deactivateCurrentAccount().pipe(
              tapResponse({
                next: (profile: UserProfileOutput) => {
                  patchState(store, { deactivateCallState: successCallState(profile) });
                  dispatcher.dispatch(
                    accountDeactivationStoreEvents.deactivateSucceeded(
                      successFeedback(
                        $localize`:@@account.deactivate.succeeded:Your account has been deactivated and every session signed out. An administrator can reactivate it.`,
                      ),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { deactivateCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    accountDeactivationStoreEvents.deactivateFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@account.deactivate.failed:Your account could not be deactivated.`,
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
