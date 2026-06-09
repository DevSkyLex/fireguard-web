import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationLegalProfileOutput,
  UpsertOrganizationLegalProfileInput,
} from '@features/organization/models';

/**
 * State owned by the organization legal profile workflow.
 */
interface OrganizationLegalProfileState {
  /** Request state for legal profile loading. */
  readonly loadCallState: CallState<OrganizationLegalProfileOutput | null>;
  /** Request state for legal profile saving. */
  readonly saveCallState: CallState<OrganizationLegalProfileOutput | null>;
}

/**
 * Initial legal profile workflow state.
 */
const INITIAL_STATE: OrganizationLegalProfileState = {
  loadCallState: idleCallState(),
  saveCallState: idleCallState(),
};

/**
 * Store OrganizationLegalProfileStore
 *
 * @description
 * Component-scoped workflow store that loads and saves an organization's
 * legal profile.
 *
 * @since 1.0.0
 */
export const OrganizationLegalProfileStore = signalStore(
  withState(INITIAL_STATE),
  withComputed((store) => ({
    /** Most recently loaded or saved legal profile. */
    profile: computed(() => store.saveCallState().data ?? store.loadCallState().data),
    /** Whether the legal profile is loading. */
    isLoading: computed(() => store.loadCallState().status === 'pending'),
    /** Whether the legal profile is saving. */
    isSaving: computed(() => store.saveCallState().status === 'pending'),
    /** Error from the last legal profile load. */
    loadError: computed(() => store.loadCallState().error),
    /** Error from the last legal profile save. */
    saveError: computed(() => store.saveCallState().error),
  })),
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    /** Loads one organization legal profile. */
    load: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loadCallState: pendingCallState() })),
        switchMap((organizationId) =>
          organizationService.getLegalProfile(organizationId).pipe(
            tapResponse({
              next: (profile) => patchState(store, { loadCallState: successCallState(profile) }),
              error: (error: unknown) =>
                patchState(store, { loadCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),
    /** Creates or updates one organization legal profile. */
    save: rxMethod<{ organizationId: string; input: UpsertOrganizationLegalProfileInput }>(
      pipe(
        tap(() => patchState(store, { saveCallState: pendingCallState() })),
        exhaustMap(({ organizationId, input }) =>
          organizationService.upsertLegalProfile(organizationId, input).pipe(
            tapResponse({
              next: (profile) => patchState(store, { saveCallState: successCallState(profile) }),
              error: (error: unknown) =>
                patchState(store, { saveCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),
  })),
);

/**
 * Injectable instance type exposed by {@link OrganizationLegalProfileStore}.
 */
export type OrganizationLegalProfileStore = InstanceType<typeof OrganizationLegalProfileStore>;
