import { computed, effect, inject, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, finalize, mergeMap, pipe } from 'rxjs';
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
import type {
  UpdateCurrentUserProfileInput,
  UserOutput,
  UserProfileOutput,
} from '@features/account/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { UserStore } from '../user';
import { accountProfileEditStoreEvents } from './events';
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
 * shell. Accepted writes finish independently per session revision; obsolete
 * results cannot change the current profile, locale, command state or feedback.
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
      dispatcher = inject<Dispatcher>(Dispatcher),
      session = inject(AUTH_SESSION_PORT),
    ) => {
      let visibleRevision = session.sessionRevision();
      const saving = new Set<number>();
      const uploading = new Set<number>();

      /**
       * Function syncSession
       * @description Clears visible command states when a new session replaces their owner.
       * @since 1.0.0
       * @returns {number} Current owning session revision.
       */
      function syncSession(): number {
        const current = session.sessionRevision();
        if (current !== visibleRevision) {
          visibleRevision = current;
          patchState(store, INITIAL_STATE);
        }
        return current;
      }

      return {
        syncSession: syncSession,
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
            mergeMap((input: UpdateCurrentUserProfileInput) => {
              const revision = syncSession();
              if (saving.has(revision)) return EMPTY;
              saving.add(revision);
              patchState(store, { saveCallState: pendingCallState() });
              return userProfileService.updateCurrentProfile(input).pipe(
                tapResponse({
                  next: (profile: UserProfileOutput) => {
                    if (revision !== session.sessionRevision()) return;
                    patchState(store, { saveCallState: successCallState(profile) });
                    userStore.setProfile(profile);
                    dispatcher.dispatch(
                      accountProfileEditStoreEvents.saveSucceeded(
                        successFeedback(
                          $localize`:@@account.profile.saved:Your profile has been updated.`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown) => {
                    if (revision !== session.sessionRevision()) return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { saveCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      accountProfileEditStoreEvents.saveFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          $localize`:@@account.profile.saveError:Your profile could not be updated.`,
                        ),
                      ),
                    );
                  },
                }),
                finalize(() => saving.delete(revision)),
              );
            }),
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
            mergeMap((file: File) => {
              const revision = syncSession();
              if (uploading.has(revision)) return EMPTY;
              uploading.add(revision);
              patchState(store, { avatarCallState: pendingCallState() });
              return userProfileService.uploadCurrentAvatar(file, file.name).pipe(
                tapResponse({
                  next: (user: UserOutput) => {
                    if (revision !== session.sessionRevision()) return;
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

                    dispatcher.dispatch(
                      accountProfileEditStoreEvents.avatarUploadSucceeded(
                        successFeedback(
                          $localize`:@@account.avatar.uploaded:Your picture has been updated.`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown) => {
                    if (revision !== session.sessionRevision()) return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { avatarCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      accountProfileEditStoreEvents.avatarUploadFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          $localize`:@@account.avatar.uploadError:Your picture could not be uploaded.`,
                        ),
                      ),
                    );
                  },
                }),
                finalize(() => uploading.delete(revision)),
              );
            }),
          ),
        ),
      };
    },
  ),
  withHooks({
    onInit(store, session = inject(AUTH_SESSION_PORT)): void {
      effect(() => {
        session.sessionRevision();
        untracked(() => store.syncSession());
      });
    },
  }),
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
