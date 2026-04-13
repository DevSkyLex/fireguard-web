import { computed, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { OAuth2Service } from '@features/auth/data-access';
import type { UserInfoOutput } from '@features/auth/models';
import type { UserState } from './user-state.interface';
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
import { userStoreEvents } from './user.events';

/**
 * Constant USER_TRANSFER_KEY
 *
 * @description
 * TransferState key used to pass the user profile obtained during SSR
 * to the browser, avoiding a duplicate userinfo call after hydration.
 *
 * @since 1.0.0
 */
const USER_TRANSFER_KEY = makeStateKey<UserInfoOutput | null>('user-profile');

/**
 * Constant INITIAL_USER_STATE
 *
 * @description
 * Initial state for the user store.
 *
 * @since 1.0.0
 *
 * @type {UserState}
 */
const INITIAL_USER_STATE: UserState = {
  profile: null,
  loadCallState: idleCallState(),
} as const;

/**
 * Store UserStore
 * @const UserStore
 *
 * @description
 * NGRX SignalStore for current user profile management.
 * Handles loading user information from the OIDC userinfo endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const userStore = inject(UserStore);
 *
 * // Load user profile
 * userStore.load();
 *
 * // Access user info
 * if (userStore.profile()) {
 *   console.log('User:', userStore.displayName());
 * }
 * ```
 */
export const UserStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<UserState>(INITIAL_USER_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isLoading
     *
     * @description
     * Returns true if the user profile is being loaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoading: computed<boolean>(() => store.loadCallState().status === 'pending'),

    /**
     * Computed isLoaded
     *
     * @description
     * Returns true if the user profile has been successfully loaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoaded: computed<boolean>(() => store.loadCallState().status === 'success'),

    /**
     * Computed loadError
     *
     * @description
     * Returns the load call state error if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    loadError: computed<StoreError | null>(() => store.loadCallState().error),

    /**
     * Computed displayName
     *
     * @description
     * Returns the user's display name (name, preferred_username, or email).
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    displayName: computed<string | null>(() => {
      const profile: UserInfoOutput | null = store.profile();
      if (!profile) return null;
      return profile.name ?? profile.preferred_username ?? profile.email ?? null;
    }),

    /**
     * Computed initials
     *
     * @description
     * Returns the user's initials (first letter of given
     * name and family name).
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    initials: computed<string | null>(() => {
      const profile: UserInfoOutput | null = store.profile();
      if (!profile) return null;

      const givenInitial: string = profile.given_name?.charAt(0).toUpperCase() ?? '';
      const familyInitial: string = profile.family_name?.charAt(0).toUpperCase() ?? '';

      if (givenInitial || familyInitial) {
        return `${givenInitial}${familyInitial}`;
      }

      // Fallback to first letter of name or email
      const fallback: string | null | undefined = profile.name ?? profile.email;
      return fallback?.charAt(0).toUpperCase() ?? null;
    }),

    /**
     * Computed avatarUrl
     *
     * @description
     * Returns the user's avatar URL if available.
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    avatarUrl: computed<string | null>(() => store.profile()?.picture ?? null),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    oauth2Service = inject<OAuth2Service>(OAuth2Service),
    platformId = inject<object>(PLATFORM_ID),
    transferState = inject(TransferState),
  ) => ({
    //#region Reactive Methods
    /**
     * Method load
     *
     * @description
     * Loads the current user profile from the OIDC userinfo endpoint.
     * Idempotent: skips loading if already loading or successfully loaded.
     * Uses switchMap to cancel previous requests if called multiple times.
     *
     * @since 1.0.0
     */
    load: rxMethod<void>(
      pipe(
        filter(() => {
          const callState: CallState<UserInfoOutput> = store.loadCallState();
          return callState.status !== 'pending' && callState.status !== 'success';
        }),
        tap(() => {
          patchState(store, { loadCallState: pendingCallState() });
        }),
        switchMap(() =>
          oauth2Service.userinfo().pipe(
            tapResponse({
              next: (response: UserInfoOutput) => {
                patchState(store, {
                  profile: response,
                  loadCallState: successCallState(response),
                });
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { loadCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  userStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to load user profile'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),
    //#endregion

    //#region Synchronous Methods
    /**
     * Method reload
     *
     * @description
     * Forces a reload of the user profile by resetting the operation state
     * and triggering a new load.
     *
     * @since 1.0.0
     */
    reload(): void {
      patchState(store, { loadCallState: idleCallState() });
      this.load();
    },

    /**
     * Method clear
     *
     * @description
     * Clears the user profile.
     * Should be called on logout.
     *
     * @since 1.0.0
     */
    clear(): void {
      patchState(store, INITIAL_USER_STATE);
    },

    /**
     * Method resetLoadOperation
     *
     * @description
     * Resets the load operation state to idle.
     *
     * @since 1.0.0
     */
    resetLoadOperation(): void {
      patchState(store, { loadCallState: idleCallState() });
    },

    /**
     * Method initialize
     *
     * @description
     * Initializes the user profile using TransferState when available (browser
     * after SSR hydration) to avoid a duplicate userinfo request.
     * Falls back to a regular load() call if no transferred state is found.
     *
     * @since 1.0.0
     *
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    async initialize(): Promise<void> {
      // Browser: consume the profile transferred from SSR to avoid a duplicate request.
      if (isPlatformBrowser(platformId) && transferState.hasKey(USER_TRANSFER_KEY)) {
        const transferred: UserInfoOutput | null = transferState.get(USER_TRANSFER_KEY, null);
        transferState.remove(USER_TRANSFER_KEY);

        if (transferred) {
          patchState(store, {
            profile: transferred,
            loadCallState: successCallState(transferred),
          });
        }
        // null means SSR userinfo failed — leave state as-is (idle), no retry.
        return;
      }

      // SSR or browser without transfer: fetch userinfo and store result for hydration.
      await firstValueFrom(
        oauth2Service.userinfo().pipe(
          tapResponse({
            next: (response: UserInfoOutput) => {
              patchState(store, {
                profile: response,
                loadCallState: successCallState(response),
              });
              // Store result for browser hydration (SSR only, no-op in browser).
              transferState.set(USER_TRANSFER_KEY, response);
            },
            error: (error: unknown) => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { loadCallState: errorCallState(storeError) });
              // Signal SSR failure to the browser.
              transferState.set(USER_TRANSFER_KEY, null);
              dispatcher.dispatch(
                userStoreEvents.loadFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load user profile'),
                ),
              );
            },
          }),
        ),
        { defaultValue: undefined },
      );
    },
    //#endregion
  })),
  //#endregion
);

/**
 * Type UserStoreType
 * @type UserStoreType
 *
 * @description
 * Type alias for the UserStore instance.
 *
 * @since 1.0.0
 */
export type UserStore = InstanceType<typeof UserStore>;
