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
  toStoreError,
} from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import { organizationSettingsStoreEvents } from './events';
import type {
  OrganizationSettingsDeleteParams,
  OrganizationSettingsLogoParams,
  OrganizationSettingsSaveParams,
  OrganizationSettingsState,
} from './models';

//#region Initial State
const INITIAL_STATE: OrganizationSettingsState = {
  saveCallState: idleCallState(),
  uploadLogoCallState: idleCallState(),
  deleteCallState: idleCallState(),
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
    isDeleting: computed<boolean>(() => store.deleteCallState().status === 'pending'),
    deleteError: computed<StoreError | null>(() => store.deleteCallState().error),
    deleteSucceeded: computed<boolean>(() => store.deleteCallState().status === 'success'),
  })),

  withMethods(
    (
      store,
      organizationService = inject<OrganizationService>(OrganizationService),
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
                },
                error: (err: unknown) =>
                  patchState(store, { saveCallState: errorCallState(toStoreError(err)) }),
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
                },
                error: (err: unknown) =>
                  patchState(store, { uploadLogoCallState: errorCallState(toStoreError(err)) }),
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
       * Permanently deletes the organization. On success the page is responsible
       * for clearing the active organization context and navigating away.
       *
       * @param {OrganizationSettingsDeleteParams} params - Organization id to delete.
       */
      deleteOrganization: rxMethod<OrganizationSettingsDeleteParams>(
        pipe(
          tap(() => patchState(store, { deleteCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            organizationService.remove(organizationId).pipe(
              map(() => undefined),
              tapResponse({
                next: () => patchState(store, { deleteCallState: successCallState(undefined) }),
                error: (err: unknown) =>
                  patchState(store, { deleteCallState: errorCallState(toStoreError(err)) }),
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
