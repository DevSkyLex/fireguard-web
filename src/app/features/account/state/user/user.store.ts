import { isPlatformBrowser } from '@angular/common';
import { computed, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
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
import { UserProfileService } from '@features/account/data-access';
import type { UserProfileOutput } from '@features/account/models';
import { userStoreEvents } from './events';
import type { UserState } from './models';

/**
 * Constant USER_TRANSFER_KEY
 *
 * @description
 * TransferState key used to pass the user profile obtained during SSR
 * to the browser, avoiding a duplicate current-profile call after hydration.
 *
 * @since 1.0.0
 */
const USER_TRANSFER_KEY = makeStateKey<UserProfileOutput | null>('user-profile');

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
 * Handles loading user information from the account-owned current-profile endpoint.
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
     * Returns the user's display name derived from the most explicit
     * profile fields available.
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    displayName: computed<string | null>(() => {
      const profile: UserProfileOutput | null = store.profile();
      if (!profile) return null;

      const firstName: string = profile.firstName?.trim() ?? '';
      const lastName: string = profile.lastName?.trim() ?? '';
      const fullName: string = `${firstName} ${lastName}`.trim();

      if (fullName) {
        return fullName;
      }

      return (
        profile.name ?? profile.username ?? profile.preferred_username ?? profile.email ?? null
      );
    }),

    /**
     * Computed initials
     *
     * @description
     * Returns the user's initials (first letter of first and last name).
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    initials: computed<string | null>(() => {
      const profile: UserProfileOutput | null = store.profile();
      if (!profile) return null;

      const givenInitial: string = (profile.firstName ?? profile.given_name ?? '')
        .charAt(0)
        .toUpperCase();
      const familyInitial: string = (profile.lastName ?? profile.family_name ?? '')
        .charAt(0)
        .toUpperCase();

      if (givenInitial || familyInitial) {
        return `${givenInitial}${familyInitial}`;
      }

      const fallback: string | null | undefined =
        profile.username ?? profile.name ?? profile.preferred_username ?? profile.email;
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
    avatarUrl: computed<string | null>(() => {
      const profile: UserProfileOutput | null = store.profile();
      return profile?.avatarUrl ?? profile?.picture ?? null;
    }),

    /**
     * Computed roles
     *
     * @description
     * Returns the resolved global roles of the authenticated user.
     *
     * @returns {ReadonlyArray<string>}
     */
    roles: computed<ReadonlyArray<string>>(() => store.profile()?.roles ?? []),

    /**
     * Computed permissions
     *
     * @description
     * Returns the resolved global permissions of the authenticated user.
     *
     * @returns {ReadonlyArray<string>}
     */
    permissions: computed<ReadonlyArray<string>>(() => store.profile()?.permissions ?? []),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      userProfileService = inject<UserProfileService>(UserProfileService),
      platformId = inject<object>(PLATFORM_ID),
      transferState = inject(TransferState),
    ) => ({
      //#region Reactive Methods
      /**
       * Method load
       *
       * @description
       * Loads the current user profile from the account-owned `/api/me` endpoint.
       * Idempotent: skips loading if already loading or successfully loaded.
       * Uses switchMap to cancel previous requests if called multiple times.
       *
       * @since 1.0.0
       */
      load: rxMethod<void>(
        pipe(
          filter(() => {
            const callState: CallState<UserProfileOutput> = store.loadCallState();
            return callState.status !== 'pending' && callState.status !== 'success';
          }),
          tap(() => {
            patchState(store, { loadCallState: pendingCallState() });
          }),
          switchMap(() =>
            userProfileService.getCurrentProfile().pipe(
              tapResponse({
                next: (response: UserProfileOutput) => {
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
       * after SSR hydration) to avoid a duplicate current-profile request.
       * Falls back to a regular load() call if no transferred state is found.
       *
       * @since 1.0.0
       *
       * @returns {Promise<void>} Resolves when initialization is complete.
       */
      async initialize(): Promise<void> {
        // Browser: consume the profile transferred from SSR to avoid a duplicate request.
        if (isPlatformBrowser(platformId) && transferState.hasKey(USER_TRANSFER_KEY)) {
          const transferred: UserProfileOutput | null = transferState.get(USER_TRANSFER_KEY, null);
          transferState.remove(USER_TRANSFER_KEY);

          if (transferred) {
            patchState(store, {
              profile: transferred,
              loadCallState: successCallState(transferred),
            });
            return;
          }

          // Retry once in the browser when SSR could not load the profile.
        }

        // SSR or browser without transfer: fetch current profile and store result for hydration.
        await firstValueFrom(
          userProfileService.getCurrentProfile().pipe(
            tapResponse({
              next: (response: UserProfileOutput) => {
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
    }),
  ),
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
