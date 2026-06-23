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
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      userProfileService = inject<UserProfileService>(UserProfileService),
      userStore = inject<UserStore>(UserStore),
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
