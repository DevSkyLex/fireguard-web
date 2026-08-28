import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { debounceTime, EMPTY, map, pipe, switchMap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationSearchHitOutput,
  OrganizationSearchOutput,
} from '@features/organization/models';

/**
 * Constant SEARCH_DEBOUNCE_MS
 *
 * @description
 * How long a keystroke settles before the palette dials the backend — the
 * same 300 ms the list pages' search boxes use.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const SEARCH_DEBOUNCE_MS: number = 300;

/**
 * Constant MIN_QUERY_LENGTH
 *
 * @description
 * The backend's own lower bound: a trimmed term shorter than this is a 400,
 * so the store never dials for it — it resets to idle instead.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const MIN_QUERY_LENGTH: number = 2;

/**
 * Store OrganizationSearchStore
 * @const OrganizationSearchStore
 *
 * @description
 * Component-scoped NgRx SignalStore behind the global command palette
 * (`GET /organizations/{organizationId}/search`). One primary query, so
 * `withQueryState` — the palette is a typeahead: each settled keystroke is
 * one whole-payload fetch that replaces the previous one (`switchMap`), so a
 * dedicated multi-call slice would buy nothing (`ARCHITECTURE.md` §10.11).
 *
 * The 300 ms debounce and the `< 2 characters → no call, reset to idle`
 * guard both live here rather than in the component, so every consumer of
 * the store gets the backend's contract (400 below 2 characters) enforced
 * for free.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationSearchStore = signalStore(
  withQueryState<OrganizationSearchOutput>(),

  withComputed((store) => ({
    /**
     * Property hits
     * @description The flat hit list of the last successful search, empty until one lands.
     * @access public
     * @since 1.0.0
     * @type {Signal<readonly OrganizationSearchHitOutput[]>}
     */
    hits: computed<readonly OrganizationSearchHitOutput[]>(() => store.queryData()?.results ?? []),
  })),

  withMethods((store, service = inject<OrganizationService>(OrganizationService)) => ({
    /**
     * Method search
     * @method search
     *
     * @description
     * Debounces the raw palette input 300 ms, then either resets to idle
     * (trimmed term under 2 characters — the backend would answer 400) or
     * fetches the hit list, cancelling any in-flight request.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<{ organizationId: string; term: string }>}
     */
    search: rxMethod<{ readonly organizationId: string; readonly term: string }>(
      pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(({ organizationId, term }) => ({ organizationId, term: term.trim() })),
        switchMap(({ organizationId, term }) => {
          if (term.length < MIN_QUERY_LENGTH) {
            patchState(store, {
              _queryStatus: 'idle' as const,
              _queryError: null,
              _queryData: null,
            });

            return EMPTY;
          }

          patchState(store, setPendingQuery());

          return service.search(organizationId, term).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err: unknown) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),

    /**
     * Method reset
     * @method reset
     *
     * @description
     * Drops the last results and error — called when the palette closes so
     * the next opening starts blank.
     *
     * @access public
     * @since 1.0.0
     *
     * @returns {void}
     */
    reset(): void {
      patchState(store, {
        _queryStatus: 'idle' as const,
        _queryError: null,
        _queryData: null,
      });
    },
  })),
);

/**
 * Type OrganizationSearchStoreType
 * @type OrganizationSearchStoreType
 *
 * @description
 * Injectable instance type exposed by {@link OrganizationSearchStore}.
 *
 * @since 1.0.0
 */
export type OrganizationSearchStoreType = InstanceType<typeof OrganizationSearchStore>;
