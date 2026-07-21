import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { CalendarEventService } from '@features/organization/features/calendar/data-access';
import type {
  CalendarEventOutput,
  CreateCalendarEventInput,
} from '@features/organization/features/calendar/models';
import { calendarEventsStoreEvents } from './events';
import type { CalendarEventsState } from './models';

//#region Initial State
const INITIAL_STATE: CalendarEventsState = {
  createCallState: idleCallState(),
};
//#endregion

/**
 * Store CalendarEventsStore
 * @const CalendarEventsStore
 *
 * @description
 * Component-scoped store for standalone calendar event mutations. Creation
 * only for now — the feed remains read-only for edit/delete
 * (`Calendar/MODULE.md`'s CRUD covers PATCH/DELETE, not yet wired here).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const CalendarEventsStore = signalStore(
  //#region State
  withState<CalendarEventsState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** True while the create request is in-flight. */
    isCreating: computed<boolean>(() => isCallPending(store.createCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      service: CalendarEventService = inject<CalendarEventService>(CalendarEventService),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method create
       * @method create
       *
       * @description
       * Creates a standalone calendar event. Uses `exhaustMap` to prevent
       * concurrent submissions from the drawer's submit button.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; input: CreateCalendarEventInput }>}
       */
      create: rxMethod<{ organizationId: string; input: CreateCalendarEventInput }>(
        pipe(
          tap((): void => {
            patchState(store, { createCallState: pendingCallState() });
          }),
          exhaustMap(({ organizationId, input }) =>
            service.create(organizationId, input).pipe(
              tapResponse({
                next: (event: CalendarEventOutput): void => {
                  patchState(store, { createCallState: successCallState(event) });
                  dispatcher.dispatch(
                    calendarEventsStoreEvents.createSucceeded(
                      successFeedback($localize`:@@calendar.event.toast.created:Event created`),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    calendarEventsStoreEvents.createFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to create event'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method resetCreateOperation
       * @method resetCreateOperation
       *
       * @description
       * Resets the create operation back to idle, so the drawer can be
       * reopened without carrying a stale success/error state.
       *
       * @since 1.0.0
       *
       * @returns {void}
       */
      resetCreateOperation(): void {
        patchState(store, { createCallState: idleCallState() });
      },
    }),
  ),
  //#endregion
);

/**
 * Type CalendarEventsStoreType
 *
 * @description
 * Injectable instance type of {@link CalendarEventsStore}.
 */
export type CalendarEventsStoreType = InstanceType<typeof CalendarEventsStore>;
