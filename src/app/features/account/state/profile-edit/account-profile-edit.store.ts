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
  UpdateCurrentUserProfileInput,
  UserOutput,
  UserProfileOutput,
} from '@features/account/models';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth';
import { UserStore } from '../user';
import type { AccountProfileEditState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial request states for the component-scoped profile edit workflow.
 *
 * @since 1.0.0
 *
 * @type {AccountProfileEditState}
 */
const INITIAL_STATE: AccountProfileEditState = {
  saveCallState: idleCallState(),
  avatarCallState: idleCallState(),
  deactivateCallState: idleCallState(),
} as const;

/**
 * Store AccountProfileEditStore
 * @const AccountProfileEditStore
 *
 * @description
 * Component-scoped workflow store that persists edits to the authenticated
 * user's profile through the authenticated-user endpoints and uploads a new
 * avatar, then synchronizes {@link UserStore} so changes propagate across the
 * shell.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AccountProfileEditStore = signalStore(
  //#region State
  withState<AccountProfileEditState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isSaving
     *
     * @description
     * Returns whether profile fields are currently being persisted.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isSaving: computed<boolean>(() => store.saveCallState().status === 'pending'),

    /**
     * Computed isUploadingAvatar
     *
     * @description
     * Returns whether an avatar is currently being uploaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isUploadingAvatar: computed<boolean>(() => store.avatarCallState().status === 'pending'),

    /**
     * Computed saveError
     *
     * @description
     * Returns the error from the latest profile-field save operation.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    saveError: computed<StoreError | null>(() => store.saveCallState().error),

    /**
     * Computed saveSucceeded
     *
     * @description
     * Whether the latest profile-field save completed. Saving reported nothing
     * back before — the call reached success and no consumer read it, so a
     * successful save looked identical to a click that did nothing.
     *
     * @since 1.1.0
     *
     * @returns {boolean}
     */
    saveSucceeded: computed<boolean>(() => store.saveCallState().status === 'success'),

    /**
     * Computed avatarError
     *
     * @description
     * Returns the error from the latest avatar upload operation.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    avatarError: computed<StoreError | null>(() => store.avatarCallState().error),

    /**
     * Computed isDeactivating
     *
     * @description
     * Whether the account deactivation request is in flight.
     *
     * @since 1.2.0
     *
     * @returns {boolean}
     */
    isDeactivating: computed<boolean>(() => store.deactivateCallState().status === 'pending'),

    /**
     * Computed deactivateError
     *
     * @description
     * Error from the latest deactivation attempt.
     *
     * @since 1.2.0
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
      userStore = inject<UserStore>(UserStore),
      authLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT),
    ) => ({
      /**
       * Method save
       *
       * @description
       * Persists profile field changes for the current user and stores the
       * authoritative response without issuing another profile request.
       *
       * @since 1.0.0
       *
       * @param {UpdateCurrentUserProfileInput} input - Profile fields to persist.
       */
      save: rxMethod<UpdateCurrentUserProfileInput>(
        pipe(
          tap((): void => patchState(store, { saveCallState: pendingCallState() })),
          exhaustMap((input: UpdateCurrentUserProfileInput) =>
            userProfileService.updateCurrentProfile(input).pipe(
              tapResponse({
                next: (profile: UserProfileOutput) => {
                  patchState(store, { saveCallState: successCallState(profile) });
                  userStore.setProfile(profile);
                },
                error: (error: unknown) =>
                  patchState(store, { saveCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method uploadAvatar
       *
       * @description
       * Uploads a new avatar for the current user. The avatar endpoint returns
       * the updated user, so the new avatar fields are merged into
       * {@link UserStore} without issuing another `/api/me` request.
       *
       * @since 1.0.0
       *
       * @param {File} file - Avatar file to upload.
       */
      uploadAvatar: rxMethod<File>(
        pipe(
          tap((): void => patchState(store, { avatarCallState: pendingCallState() })),
          exhaustMap((file: File) =>
            userProfileService.uploadCurrentAvatar(file, file.name).pipe(
              tapResponse({
                next: (user: UserOutput) => {
                  patchState(store, { avatarCallState: successCallState(user) });

                  const profile: UserProfileOutput | null = userStore.profile();
                  if (profile) {
                    userStore.setProfile({
                      ...profile,
                      avatarUrl: user.avatarUrl ?? null,
                      avatarUrls: user.avatarUrls ?? null,
                    });
                  } else {
                    userStore.reload();
                  }
                },
                error: (error: unknown) =>
                  patchState(store, { avatarCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method deactivate
       *
       * @description
       * Deactivates the current user's own account. The backend revokes every
       * session as part of the call, so the local session is already dead when
       * the response arrives — logging out is what turns that into a clean
       * sign-out instead of the next request failing with a 401.
       *
       * `exhaustMap` matches the other two: a second click while the first is
       * in flight would be a second irreversible request.
       *
       * @since 1.2.0
       */
      deactivate: rxMethod<void>(
        pipe(
          tap((): void => patchState(store, { deactivateCallState: pendingCallState() })),
          exhaustMap(() =>
            userProfileService.deactivateCurrentAccount().pipe(
              tapResponse({
                next: (profile: UserProfileOutput) => {
                  patchState(store, { deactivateCallState: successCallState(profile) });
                  authLogoutPort.logout();
                },
                error: (error: unknown) =>
                  patchState(store, { deactivateCallState: errorCallState(toStoreError(error)) }),
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
 * Type AccountProfileEditStore
 * @type AccountProfileEditStore
 *
 * @description
 * Injectable instance type exposed by {@link AccountProfileEditStore}.
 *
 * @since 1.0.0
 */
export type AccountProfileEditStore = InstanceType<typeof AccountProfileEditStore>;
