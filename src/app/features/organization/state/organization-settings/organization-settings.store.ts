import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { map, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  StoreError,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import { organizationSettingsStoreEvents } from './events';
import type {
  OrganizationSettingsDeleteParams,
  OrganizationSettingsLogoParams,
  OrganizationSettingsSaveParams,
  OrganizationSettingsState,
  OrganizationSettingsStatusParams,
  OrganizationSettingsTransferOwnershipParams,
} from './models';

//#region Initial State
const INITIAL_STATE: OrganizationSettingsState = {
  saveCallState: idleCallState(),
  uploadLogoCallState: idleCallState(),
  removeLogoCallState: idleCallState(),
  deleteCallState: idleCallState(),
  transferOwnershipCallState: idleCallState(),
  statusCallState: idleCallState(),
  leaveCallState: idleCallState(),
};
//#endregion

/**
 * Store OrganizationSettingsStore
 * @const OrganizationSettingsStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the organization settings page.
 * Owns the general & branding mutations — saving the settings form and
 * uploading the logo — and refreshes the {@link ActiveOrganizationStore} on
 * success so the switcher, breadcrumb and navigation reflect the change.
 *
 * Designed to be provided at **component level** (no `providedIn: 'root'`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationSettingsStore = signalStore(
  withState<OrganizationSettingsState>(INITIAL_STATE),

  withComputed((store) => ({
    isSaving: computed<boolean>(() => store.saveCallState().status === 'pending'),
    saveError: computed<StoreError | null>(() => store.saveCallState().error),
    saveSucceeded: computed<boolean>(() => store.saveCallState().status === 'success'),
    isUploadingLogo: computed<boolean>(() => store.uploadLogoCallState().status === 'pending'),
    uploadLogoError: computed<StoreError | null>(() => store.uploadLogoCallState().error),
    uploadLogoSucceeded: computed<boolean>(() => store.uploadLogoCallState().status === 'success'),
    isRemovingLogo: computed<boolean>(() => store.removeLogoCallState().status === 'pending'),
    removeLogoError: computed<StoreError | null>(() => store.removeLogoCallState().error),
    isDeleting: computed<boolean>(() => store.deleteCallState().status === 'pending'),
    deleteError: computed<StoreError | null>(() => store.deleteCallState().error),
    deleteSucceeded: computed<boolean>(() => store.deleteCallState().status === 'success'),
    isTransferringOwnership: computed<boolean>(
      () => store.transferOwnershipCallState().status === 'pending',
    ),
    transferOwnershipError: computed<StoreError | null>(
      () => store.transferOwnershipCallState().error,
    ),
    transferOwnershipSucceeded: computed<boolean>(
      () => store.transferOwnershipCallState().status === 'success',
    ),
    isChangingStatus: computed<boolean>(() => store.statusCallState().status === 'pending'),
    statusError: computed<StoreError | null>(() => store.statusCallState().error),
    isLeaving: computed<boolean>(() => store.leaveCallState().status === 'pending'),
    leaveError: computed<StoreError | null>(() => store.leaveCallState().error),
    leaveSucceeded: computed<boolean>(() => store.leaveCallState().status === 'success'),
  })),

  withMethods(
    (
      store,
      organizationService = inject<OrganizationService>(OrganizationService),
      memberService = inject<OrganizationMemberService>(OrganizationMemberService),
      activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method save
       * @method save
       *
       * @description
       * Persists the general & branding settings and refreshes the active
       * organization on success.
       *
       * @param {OrganizationSettingsSaveParams} params - Organization id and settings input.
       */
      save: rxMethod<OrganizationSettingsSaveParams>(
        pipe(
          tap(() => patchState(store, { saveCallState: pendingCallState() })),
          switchMap(({ organizationId, input }) =>
            organizationService.update(organizationId, input).pipe(
              tapResponse({
                next: (organization: OrganizationOutput) => {
                  patchState(store, { saveCallState: successCallState(organization) });
                  activeOrganizationStore.setOrganization(organization);
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.organizationUpdated(organization),
                  );
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.saveSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.savedDetail:The organization settings have been updated.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { saveCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.saveFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.saveError:The settings could not be saved.`,
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
       * Method uploadLogo
       * @method uploadLogo
       *
       * @description
       * Uploads a new organization logo and refreshes the active organization
       * with the returned `logoUrl` on success.
       *
       * @param {OrganizationSettingsLogoParams} params - Organization id and logo file.
       */
      uploadLogo: rxMethod<OrganizationSettingsLogoParams>(
        pipe(
          tap(() => patchState(store, { uploadLogoCallState: pendingCallState() })),
          switchMap(({ organizationId, file, fileName }) =>
            organizationService.uploadLogo(organizationId, file, fileName).pipe(
              tapResponse({
                next: (organization: OrganizationOutput) => {
                  patchState(store, { uploadLogoCallState: successCallState(organization) });
                  activeOrganizationStore.setOrganization(organization);
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.organizationUpdated(organization),
                  );
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.logoUploadSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.logoDetail:The organization logo has been updated.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { uploadLogoCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.logoUploadFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.logoError:The logo could not be uploaded.`,
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
       * Method removeLogo
       * @method removeLogo
       *
       * @description
       * Clears the organization logo. The endpoint answers 204 with no body,
       * so the refreshed organization is rebuilt locally from the active copy
       * with `logoUrl` cleared rather than re-fetched — one round trip, and the
       * switcher and header drop the monogram immediately.
       *
       * @param {OrganizationSettingsStatusParams} params - Organization id whose logo to clear.
       */
      removeLogo: rxMethod<OrganizationSettingsStatusParams>(
        pipe(
          tap(() => patchState(store, { removeLogoCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            organizationService.removeLogo(organizationId).pipe(
              tapResponse({
                next: () => {
                  patchState(store, { removeLogoCallState: successCallState(undefined) });

                  const current: OrganizationOutput | null =
                    activeOrganizationStore.selectedOrganization();
                  if (current) {
                    const cleared: OrganizationOutput = { ...current, logoUrl: null };
                    activeOrganizationStore.setOrganization(cleared);
                    dispatcher.dispatch(
                      organizationSettingsStoreEvents.organizationUpdated(cleared),
                    );
                  }

                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.logoRemoveSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.logoRemovedDetail:The organization logo has been removed.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { removeLogoCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.logoRemoveFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.logoRemoveError:The logo could not be removed.`,
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
       * Method transferOwnership
       * @method transferOwnership
       *
       * @description
       * Hands ownership to another active member. Only the current owner may
       * call this and the slug confirmation must match, so a rejection here is
       * routine rather than exceptional — the page shows the error in place and
       * keeps the dialog open.
       *
       * @param {OrganizationSettingsTransferOwnershipParams} params - Organization id, the new owner's user id and the slug confirmation.
       */
      transferOwnership: rxMethod<OrganizationSettingsTransferOwnershipParams>(
        pipe(
          tap(() => patchState(store, { transferOwnershipCallState: pendingCallState() })),
          switchMap(({ organizationId, newOwnerUserId, slug }) =>
            organizationService.transferOwnership(organizationId, { newOwnerUserId, slug }).pipe(
              tapResponse({
                next: (organization: OrganizationOutput) => {
                  patchState(store, {
                    transferOwnershipCallState: successCallState(organization),
                  });
                  activeOrganizationStore.setOrganization(organization);
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.organizationUpdated(organization),
                  );
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.transferOwnershipSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.transferOwnershipDetail:Ownership has been transferred.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { transferOwnershipCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.transferOwnershipFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.transferOwnershipError:Ownership could not be transferred.`,
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
       * Method suspend
       * @method suspend
       *
       * @description
       * Suspends the organization, returning it refreshed. Shares
       * `statusCallState` with {@link restore}: the two are mutually exclusive
       * and never in flight together.
       *
       * @param {OrganizationSettingsStatusParams} params - Organization id to suspend.
       */
      suspend: rxMethod<OrganizationSettingsStatusParams>(
        pipe(
          tap(() => patchState(store, { statusCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            organizationService.suspend(organizationId).pipe(
              tapResponse({
                next: (organization: OrganizationOutput) => {
                  patchState(store, { statusCallState: successCallState(organization) });
                  activeOrganizationStore.setOrganization(organization);
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.organizationUpdated(organization),
                  );
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.statusChangeSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.suspendedDetail:The organization has been suspended.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { statusCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.statusChangeFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.suspendError:The organization could not be suspended.`,
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
       * Method restore
       * @method restore
       *
       * @description
       * Returns the organization to active from suspended or archived — the undo
       * for {@link deleteOrganization}.
       *
       * @param {OrganizationSettingsStatusParams} params - Organization id to restore.
       */
      restore: rxMethod<OrganizationSettingsStatusParams>(
        pipe(
          tap(() => patchState(store, { statusCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            organizationService.restore(organizationId).pipe(
              tapResponse({
                next: (organization: OrganizationOutput) => {
                  patchState(store, { statusCallState: successCallState(organization) });
                  activeOrganizationStore.setOrganization(organization);
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.organizationUpdated(organization),
                  );
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.statusChangeSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.restoredDetail:The organization has been restored.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { statusCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.statusChangeFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.restoreError:The organization could not be restored.`,
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
       * Method leave
       * @method leave
       *
       * @description
       * Deactivates the acting member's own membership. A **409** here is a
       * workflow answer rather than a fault — the caller owns the organization,
       * or is its last administrator — so the page surfaces the backend's own
       * message instead of a generic failure.
       *
       * @param {OrganizationSettingsStatusParams} params - Organization id to leave.
       */
      leave: rxMethod<OrganizationSettingsStatusParams>(
        pipe(
          tap(() => patchState(store, { leaveCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            memberService.leave(organizationId).pipe(
              map(() => undefined),
              tapResponse({
                next: () => {
                  patchState(store, { leaveCallState: successCallState(undefined) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.leaveSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.leftDetail:You have left the organization.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { leaveCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.leaveFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.leaveError:You could not leave this organization.`,
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
       * Method deleteOrganization
       * @method deleteOrganization
       *
       * @description
       * Archives the organization — a reversible soft delete, undone by
       * {@link restore}. On success the page is responsible for clearing the
       * active organization context and navigating away.
       *
       * @param {OrganizationSettingsDeleteParams} params - Organization id and the slug confirmation.
       */
      deleteOrganization: rxMethod<OrganizationSettingsDeleteParams>(
        pipe(
          tap(() => patchState(store, { deleteCallState: pendingCallState() })),
          switchMap(({ organizationId, slug }) =>
            organizationService.remove(organizationId, slug).pipe(
              map(() => undefined),
              tapResponse({
                next: () => {
                  patchState(store, { deleteCallState: successCallState(undefined) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.deleteSucceeded(
                      successFeedback(
                        $localize`:@@org.settings.deletedDetail:The organization has been permanently deleted.`,
                      ),
                    ),
                  );
                },
                error: (err: unknown) => {
                  const storeError = toStoreError(err);
                  patchState(store, { deleteCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationSettingsStoreEvents.deleteFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@org.settings.deleteError:The organization could not be deleted.`,
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
);

/**
 * Type OrganizationSettingsStore
 * @type OrganizationSettingsStore
 *
 * @description
 * Instance type of the {@link OrganizationSettingsStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationSettingsStore = InstanceType<typeof OrganizationSettingsStore>;
