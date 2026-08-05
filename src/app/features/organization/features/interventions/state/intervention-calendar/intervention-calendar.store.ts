import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, map, of, pipe, switchMap, tap, type Observable } from 'rxjs';
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
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { interventionCalendarStoreEvents } from './events';
import type { InterventionCalendarLoadRequest, InterventionCalendarState } from './models';

/**
 * Internal load result merged into the store state.
 */
interface CalendarLoadResult {
  readonly interventions: readonly InterventionOutput[];
  readonly currentMemberIri: string | null;
}

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state for the component-scoped {@link InterventionCalendarStore}.
 *
 * @since 1.0.0
 *
 * @type {InterventionCalendarState}
 */
const INITIAL_STATE: InterventionCalendarState = {
  interventions: [],
  currentMemberIri: null,
  loadCallState: idleCallState(),
};

/**
 * Store InterventionCalendarStore
 * @const InterventionCalendarStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the organization intervention
 * calendar. A single {@link load} fetches the interventions inside a bounded
 * date window (the visible month ± one month, via
 * {@link InterventionService.listCalendarWindow}) together with the current
 * member IRI, so the page can switch the All/Mine scope client-side without
 * refetching and never loads the whole organization history at once. The member
 * IRI is resolved once per organization and reused across window refetches.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionCalendarStore = signalStore(
  withState<InterventionCalendarState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Computed loading.
     *
     * @description
     * True while the calendar data is loading.
     */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /**
     * Computed loadError.
     *
     * @description
     * Normalized error of the last load when it failed, otherwise `null`. Lets
     * the page distinguish an empty calendar from a failed fetch.
     */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();
      return isCallError(state) ? state.error : null;
    }),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      service = inject<InterventionService>(InterventionService),
      members = inject<OrganizationMemberService>(OrganizationMemberService),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Loads the interventions inside the requested date window for the given
       * organization and resolves the current member IRI used by the "Mine"
       * scope filter (reusing an already-resolved IRI for the same organization
       * so month navigation does not refetch the profile). Resolves to an empty
       * calendar when no organization is active. A failed member-profile lookup
       * degrades gracefully (interventions shown, "Mine" scope disabled), but a
       * failed list fetch surfaces as an error call state and a dispatched
       * failure event (toast) rather than a silently empty calendar.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<InterventionCalendarLoadRequest>}
       */
      load: rxMethod<InterventionCalendarLoadRequest>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(({ organizationId, window, filters }) => {
            if (!organizationId) {
              patchState(store, {
                interventions: [],
                currentMemberIri: null,
                loadCallState: successCallState(null),
              });
              return EMPTY;
            }

            const memberPrefix = `/api/organizations/${organizationId}/members/`;
            const cachedMemberIri: string | null = store.currentMemberIri();
            const memberIri$: Observable<string | null> = cachedMemberIri?.startsWith(memberPrefix)
              ? of<string | null>(cachedMemberIri)
              : members.getCurrentProfile(organizationId).pipe(
                  map((profile): string | null => `${memberPrefix}${profile.id}`),
                  catchError(() => of<string | null>(null)),
                );

            return service
              .listCalendarWindow(organizationId, window.after, window.before, filters)
              .pipe(
                switchMap((interventions) =>
                  memberIri$.pipe(
                    map((currentMemberIri): CalendarLoadResult => ({
                      interventions,
                      currentMemberIri,
                    })),
                  ),
                ),
                tapResponse({
                  next: ({ interventions, currentMemberIri }: CalendarLoadResult) =>
                    patchState(store, {
                      interventions,
                      currentMemberIri,
                      loadCallState: successCallState(null),
                    }),
                  error: (error: unknown) => {
                    const storeError = toStoreError(error);
                    patchState(store, {
                      interventions: [],
                      currentMemberIri: null,
                      loadCallState: errorCallState(storeError),
                    });
                    dispatcher.dispatch(
                      interventionCalendarStoreEvents.loadFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load the calendar'),
                      ),
                    );
                  },
                }),
              );
          }),
        ),
      ),
    }),
  ),
);

/**
 * Type InterventionCalendarStoreType
 * @type InterventionCalendarStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionCalendarStore}.
 *
 * @since 1.0.0
 */
export type InterventionCalendarStoreType = InstanceType<typeof InterventionCalendarStore>;
