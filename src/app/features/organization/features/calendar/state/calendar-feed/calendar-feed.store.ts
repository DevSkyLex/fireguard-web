import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import { adaptCalendarFeed } from '@features/organization/features/calendar/data-access/adapters/calendar-feed.adapter';
import type { CalendarFeedOutput } from '@features/organization/features/calendar/models';
import type { CalendarEvent } from '@shared/components';

/**
 * What window to load.
 *
 * @since 1.0.0
 */
export interface CalendarFeedRequest {
  readonly organizationId: string;
  readonly from: string;
  readonly to: string;
}

/**
 * Store CalendarFeedStore
 * @const CalendarFeedStore
 *
 * @description
 * Component-scoped store for the merged calendar feed.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const CalendarFeedStore = signalStore(
  //#region State
  withQueryState<CalendarFeedOutput>(),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed events
     *
     * @description
     * The feed in the shared calendar's event shape.
     *
     * @type {Signal<readonly CalendarEvent[]>}
     */
    events: computed<readonly CalendarEvent[]>(() =>
      adaptCalendarFeed(store.queryData()?.items ?? []),
    ),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(CalendarService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads one window of the feed. A `null` request is ignored so callers can
     * bind a computed straight in.
     *
     * @param {CalendarFeedRequest | null} request - The window to load.
     *
     * @returns {void}
     */
    load: rxMethod<CalendarFeedRequest | null>(
      pipe(
        switchMap((request: CalendarFeedRequest | null) => {
          if (request === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.getFeed(request.organizationId, request.from, request.to).pipe(
            tapResponse({
              next: (feed: CalendarFeedOutput) => patchState(store, setSuccessQuery(feed)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type CalendarFeedStoreType
 *
 * @description
 * Injectable instance type of {@link CalendarFeedStore}.
 */
export type CalendarFeedStoreType = InstanceType<typeof CalendarFeedStore>;
