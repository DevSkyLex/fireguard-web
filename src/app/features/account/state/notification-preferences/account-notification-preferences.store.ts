import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { NotificationService } from '@features/account/data-access';
import type {
  NotificationPreferenceOutput,
  NotificationPreferencesOutput,
  UpdateNotificationPreferencesInput,
} from '@features/account/models';
import { accountNotificationPreferencesStoreEvents } from './events';
import type { AccountNotificationPreferencesState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial request states for the component-scoped notification preferences
 * screen.
 *
 * @since 1.0.0
 *
 * @type {AccountNotificationPreferencesState}
 */
const INITIAL_STATE: AccountNotificationPreferencesState = {
  loadCallState: idleCallState(),
  saveCallState: idleCallState(),
} as const;

/**
 * Store AccountNotificationPreferencesStore
 * @const AccountNotificationPreferencesStore
 *
 * @description
 * Component-scoped store for the notification preferences screen. Loads the
 * authenticated user's customized per-category delivery preferences and
 * upserts one row per toggle — each switch is its own commit, there is no
 * separate save step.
 *
 * The canonical set lives in `loadCallState`: the `PATCH` answers with the
 * full customized set, so a successful save refreshes it without another
 * `GET`. A category absent from the set is enabled on every channel — the
 * absence of a row is the server's "everything enabled" default.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AccountNotificationPreferencesStore = signalStore(
  //#region State
  withState<AccountNotificationPreferencesState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isLoading
     *
     * @description
     * Returns whether the customized preference set is being loaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /**
     * Computed isSaving
     *
     * @description
     * Returns whether an upsert is in flight, which locks every switch so a
     * second toggle cannot race the first.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isSaving: computed<boolean>(() => isCallPending(store.saveCallState())),

    /**
     * Computed loadError
     *
     * @description
     * Returns the error from the initial load, or `null`.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();
      return isCallError(state) ? state.error : null;
    }),

    /**
     * Computed preferences
     *
     * @description
     * The customized preference rows, empty until loaded — and legitimately
     * empty afterwards for a user who never customized anything.
     *
     * @since 1.0.0
     *
     * @returns {ReadonlyArray<NotificationPreferenceOutput>}
     */
    preferences: computed<ReadonlyArray<NotificationPreferenceOutput>>(
      () => store.loadCallState().data ?? [],
    ),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      notificationService = inject<NotificationService>(NotificationService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method load
       *
       * @description
       * Loads the customized preference set. Keeps whatever rows are already
       * on screen while refreshing.
       *
       * @since 1.0.0
       */
      load: rxMethod<void>(
        pipe(
          tap((): void =>
            patchState(store, {
              loadCallState: pendingCallState(store.loadCallState().data ?? []),
            }),
          ),
          switchMap(() =>
            notificationService.getPreferences().pipe(
              tapResponse({
                next: (response: NotificationPreferencesOutput) =>
                  patchState(store, {
                    loadCallState: successCallState(response.preferences),
                  }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    loadCallState: errorCallState(storeError, store.loadCallState().data ?? []),
                  });
                  dispatcher.dispatch(
                    accountNotificationPreferencesStoreEvents.loadFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@account.notificationPreferences.loadError:Your notification preferences could not be loaded.`,
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
       * Method save
       *
       * @description
       * Upserts one or more category rows. The response carries the full
       * customized set, which replaces the canonical one — no follow-up
       * `GET`. While the call is in flight `isSaving` locks the matrix, so a
       * second toggle cannot race the first (`exhaustMap` drops it outright
       * as the belt to that suspender). On failure the canonical rows are
       * left untouched, so the matrix settles back to what the server holds.
       *
       * @since 1.0.0
       *
       * @param {UpdateNotificationPreferencesInput} input - The category rows to upsert (at least one).
       */
      save: rxMethod<UpdateNotificationPreferencesInput>(
        pipe(
          tap((): void =>
            patchState(store, {
              saveCallState: pendingCallState(store.saveCallState().data ?? []),
            }),
          ),
          exhaustMap((input: UpdateNotificationPreferencesInput) =>
            notificationService.updatePreferences(input).pipe(
              tapResponse({
                next: (response: NotificationPreferencesOutput) =>
                  patchState(store, {
                    saveCallState: successCallState(response.preferences),
                    loadCallState: successCallState(response.preferences),
                  }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    saveCallState: errorCallState(storeError, store.saveCallState().data ?? []),
                  });
                  dispatcher.dispatch(
                    accountNotificationPreferencesStoreEvents.saveFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@account.notificationPreferences.saveError:Your notification preferences could not be saved.`,
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
 * Type AccountNotificationPreferencesStore
 *
 * @description
 * Instance type of {@link AccountNotificationPreferencesStore}, merged with
 * the store constant so the name works in both value and type positions.
 *
 * @since 1.0.0
 */
export type AccountNotificationPreferencesStore = InstanceType<
  typeof AccountNotificationPreferencesStore
>;
