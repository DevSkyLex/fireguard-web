import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import { OAuth2Service } from '@core/services/api/oauth2';
import type { UserInfoOutput } from '@core/models/oauth2';
import type { UserState } from './user-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  type Operation,
  type OperationError,
} from '../operations';

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
  loadOperation: createIdleOperation(),
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
    isLoading: computed<boolean>(() => store.loadOperation().status === 'loading'),

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
    isLoaded: computed<boolean>(() => store.loadOperation().status === 'success'),

    /**
     * Computed loadError
     *
     * @description
     * Returns the load operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    loadError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<UserInfoOutput, unknown> = store.loadOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

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
  withMethods((store, oauth2Service = inject<OAuth2Service>(OAuth2Service)) => ({
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
        // Skip if already loading or loaded
        filter(() => {
          const operation = store.loadOperation();
          return operation.status !== 'loading' && operation.status !== 'success';
        }),
        tap(() => {
          patchState(store, {
            loadOperation: createLoadingOperation(store.loadOperation().data),
          });
        }),
        switchMap(() =>
          oauth2Service.userinfo().pipe(
            tapResponse({
              next: (response: UserInfoOutput) => {
                patchState(store, {
                  profile: response,
                  loadOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                patchState(store, {
                  loadOperation: createErrorOperation(
                    createOperationErrorFromUnknown(error),
                    store.loadOperation().data,
                  ),
                });
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
      patchState(store, {
        loadOperation: createIdleOperation(),
      });
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
      patchState(store, {
        loadOperation: createIdleOperation(),
      });
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
