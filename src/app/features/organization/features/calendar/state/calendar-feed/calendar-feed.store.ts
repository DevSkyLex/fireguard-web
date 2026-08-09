import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type {
  CalendarFeedItemOutput,
  CalendarFeedOutput,
} from '@features/organization/features/calendar/models';

/**
 * Interface CalendarFeedLoadCommand
 * @interface CalendarFeedLoadCommand
 *
 * @description
 * One feed read: the organization and the inclusive ISO window to merge.
 *
 * @since 1.0.0
 */
export interface CalendarFeedLoadCommand {
  readonly organizationId: string;
  readonly from: string;
  readonly to: string;
}

/**
 * Store CalendarFeedStore
 * @const CalendarFeedStore
 *
 * @description
 * Component-scoped store of the organization calendar page: exactly one query
 * concern — the unified feed for the displayed window — so `withQueryState`
 * carries the whole lifecycle. `load` uses `switchMap`: paging to another
 * month supersedes the in-flight window.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const CalendarFeedStore = signalStore(
  withQueryState<CalendarFeedOutput>(),
  withComputed((store) => ({
    /** The merged feed entries, empty until the first window resolves. */
    items: computed<readonly CalendarFeedItemOutput[]>(() => store.queryData()?.items ?? []),
  })),
  withMethods((store, service = inject<CalendarService>(CalendarService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Reads the unified feed for one window, superseding any in-flight read.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<CalendarFeedLoadCommand>}
     */
    load: rxMethod<CalendarFeedLoadCommand>(
      pipe(
        switchMap(({ organizationId, from, to }) => {
          patchState(store, setPendingQuery());

          return service.getFeed(organizationId, from, to).pipe(
            tapResponse({
              next: (feed) => patchState(store, setSuccessQuery(feed)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type CalendarFeedStoreType
 *
 * @description
 * Defines the supported calendar feed store type values.
 */
export type CalendarFeedStoreType = InstanceType<typeof CalendarFeedStore>;
