import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, map, of, pipe, switchMap, tap, type Observable } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
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
  loading: false,
};

/**
 * Store InterventionCalendarStore
 * @const InterventionCalendarStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the organization intervention
 * calendar. A single {@link load} fetches every intervention for the active
 * organization (auto-paginated via {@link InterventionService.listAll}) together
 * with the current member IRI, so the page can switch the All/Mine scope
 * client-side without refetching.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionCalendarStore = signalStore(
  withState<InterventionCalendarState>(INITIAL_STATE),
  withMethods(
    (
      store,
      service = inject<InterventionService>(InterventionService),
      members = inject<OrganizationMemberService>(OrganizationMemberService),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Loads every intervention for the given organization and resolves the
       * current member IRI used by the "Mine" scope filter. Resolves to an empty
       * calendar when no organization is active or the request fails.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<InterventionCalendarLoadRequest>}
       */
      load: rxMethod<InterventionCalendarLoadRequest>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap(({ organizationId }): Observable<CalendarLoadResult> => {
            if (!organizationId) {
              return of<CalendarLoadResult>({ interventions: [], currentMemberIri: null });
            }

            return service.listAll(organizationId).pipe(
              switchMap((interventions) =>
                members.getCurrentProfile(organizationId).pipe(
                  map(
                    (profile): CalendarLoadResult => ({
                      interventions,
                      currentMemberIri: `/api/organizations/${organizationId}/members/${profile.id}`,
                    }),
                  ),
                  catchError(() =>
                    of<CalendarLoadResult>({ interventions, currentMemberIri: null }),
                  ),
                ),
              ),
              catchError(() =>
                of<CalendarLoadResult>({ interventions: [], currentMemberIri: null }),
              ),
            );
          }),
          tapResponse({
            next: ({ interventions, currentMemberIri }: CalendarLoadResult) =>
              patchState(store, { interventions, currentMemberIri, loading: false }),
            error: () =>
              patchState(store, { interventions: [], currentMemberIri: null, loading: false }),
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
