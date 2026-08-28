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
import { EmailChangeService } from '@features/auth/data-access';
import type { ConfirmEmailChangeOutput } from '@features/auth/models';
import type { EmailChangeConfirmState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state of the email change confirmation.
 *
 * @since 1.0.0
 *
 * @type {EmailChangeConfirmState}
 */
const INITIAL_STATE: EmailChangeConfirmState = {
  confirmCallState: idleCallState(),
} as const;

/**
 * Store EmailChangeConfirmStore
 * @const EmailChangeConfirmStore
 *
 * @description
 * Component-scoped store for the public email change confirmation
 * (`POST /api/me/email-change/confirm`). One call, triggered by an explicit
 * click — never on page load, because a mail client or browser prefetching
 * the link must not consume the single-use token.
 *
 * No feedback events are dispatched: the outcome IS the page's content — the
 * success and failure states render inline where the visitor is looking, so
 * a toast would only repeat them. The failure message keeps the backend's
 * neutral RFC 7807 detail (invalid, expired and reused tokens all answer the
 * same 400).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const EmailChangeConfirmStore = signalStore(
  //#region State
  withState<EmailChangeConfirmState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isConfirming
     *
     * @description
     * Whether the confirmation is in flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isConfirming: computed<boolean>(() => store.confirmCallState().status === 'pending'),

    /**
     * Computed isConfirmed
     *
     * @description
     * Whether the change was applied — every session is now revoked and the
     * user signs in again with the new address.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isConfirmed: computed<boolean>(() => store.confirmCallState().status === 'success'),

    /**
     * Computed confirmError
     *
     * @description
     * Error of the latest confirmation attempt, if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    confirmError: computed<StoreError | null>(() => store.confirmCallState().error),
  })),
  //#endregion

  //#region Methods
  withMethods((store, emailChangeService = inject<EmailChangeService>(EmailChangeService)) => ({
    /**
     * Method confirm
     *
     * @description
     * Confirms the email change with the emailed token. `exhaustMap` gates a
     * double click while a call is in flight.
     *
     * @since 1.0.0
     *
     * @param {string} token - The emailed confirmation token.
     */
    confirm: rxMethod<string>(
      pipe(
        tap((): void => patchState(store, { confirmCallState: pendingCallState() })),
        exhaustMap((token: string) =>
          emailChangeService.confirm({ token }).pipe(
            tapResponse({
              next: (result: ConfirmEmailChangeOutput) => {
                patchState(store, { confirmCallState: successCallState(result) });
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { confirmCallState: errorCallState(storeError) });
              },
            }),
          ),
        ),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type EmailChangeConfirmStore
 * @type EmailChangeConfirmStore
 *
 * @description
 * Injectable instance type exposed by {@link EmailChangeConfirmStore}.
 *
 * @since 1.0.0
 */
export type EmailChangeConfirmStore = InstanceType<typeof EmailChangeConfirmStore>;
