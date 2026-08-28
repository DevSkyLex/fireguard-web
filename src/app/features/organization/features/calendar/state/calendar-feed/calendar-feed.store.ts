import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  withQueryState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type {
  CalendarEventOutput,
  CalendarFeedItemOutput,
  CalendarFeedOutput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@features/organization/features/calendar/models';
import { calendarFeedStoreEvents } from './events/events';

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
 * Interface CalendarEventCreateCommand
 * @interface CalendarEventCreateCommand
 *
 * @description The organization and the event to create.
 * @since 1.1.0
 */
export interface CalendarEventCreateCommand {
  readonly organizationId: string;
  readonly input: CreateCalendarEventInput;
}

/**
 * Interface CalendarEventUpdateCommand
 * @interface CalendarEventUpdateCommand
 *
 * @description The organization, the event to update, and its dirty fields only.
 * @since 1.1.0
 */
export interface CalendarEventUpdateCommand {
  readonly organizationId: string;
  readonly eventId: string;
  readonly input: UpdateCalendarEventInput;
}

/**
 * Interface CalendarEventMoveCommand
 * @interface CalendarEventMoveCommand
 *
 * @description
 * A drag-reschedule of a standalone event: the organization, the event, its
 * new start instant, and — only when the event has an end — the end shifted
 * by the same delta. An `undefined` `endsAt` is **omitted** from the
 * merge-patch (leave unchanged), never sent as `null` (which would clear it).
 *
 * @since 1.2.0
 */
export interface CalendarEventMoveCommand {
  readonly organizationId: string;
  readonly eventId: string;
  readonly startsAt: string;
  readonly endsAt?: string;
}

/**
 * Interface CalendarEventDeleteCommand
 * @interface CalendarEventDeleteCommand
 *
 * @description The organization and the event to delete.
 * @since 1.1.0
 */
export interface CalendarEventDeleteCommand {
  readonly organizationId: string;
  readonly eventId: string;
}

/**
 * Interface CalendarFeedWriteState
 * @interface CalendarFeedWriteState
 *
 * @description
 * The three standalone-event writes' independent call states, plus the last
 * successful feed read's command — kept so a write's success can re-run the
 * exact same window without the page having to remember it too.
 *
 * @since 1.1.0
 */
interface CalendarFeedWriteState {
  readonly createEventCallState: CallState<CalendarEventOutput>;
  readonly updateEventCallState: CallState<CalendarEventOutput>;
  readonly deleteEventCallState: CallState<null>;
  readonly moveEventCallState: CallState<CalendarEventOutput>;
  readonly lastLoadCommand: CalendarFeedLoadCommand | null;
}

const INITIAL_WRITE_STATE: CalendarFeedWriteState = {
  createEventCallState: idleCallState(),
  updateEventCallState: idleCallState(),
  deleteEventCallState: idleCallState(),
  moveEventCallState: idleCallState(),
  lastLoadCommand: null,
};

/**
 * Store CalendarFeedStore
 * @const CalendarFeedStore
 *
 * @description
 * Component-scoped store of the organization calendar page: the unified
 * feed for the displayed window (`withQueryState`, its one primary read),
 * plus the three standalone-event writes as named `CallState` fields since
 * each reports independently. A write never patches the loaded feed items
 * in place — the feed merges four sources and reconstructing one entry's
 * shape client-side would drift from the server's own merge/sort — instead,
 * a successful create/update/delete simply re-runs {@link load}'s last
 * window (`FEATURE.md` "Refresh after write"). The one sanctioned exception
 * is `moveEvent`, the drag-reschedule: it repositions the matching entry
 * optimistically before the patch, rolls it back on failure, and still
 * reconciles through the window re-read on success.
 *
 * @version 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const CalendarFeedStore = signalStore(
  withQueryState<CalendarFeedOutput>(),
  withState<CalendarFeedWriteState>(INITIAL_WRITE_STATE),
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
     * Reads the unified feed for one window, superseding any in-flight read,
     * and remembers the command so a later write's success can re-run it.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<CalendarFeedLoadCommand>}
     */
    load: rxMethod<CalendarFeedLoadCommand>(
      pipe(
        tap((command) => patchState(store, { lastLoadCommand: command })),
        switchMap((command) => {
          patchState(store, setPendingQuery());

          return service.getFeed(command.organizationId, command.from, command.to).pipe(
            tapResponse({
              next: (feed) => patchState(store, setSuccessQuery(feed)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
  withMethods(
    (
      store,
      service = inject<CalendarService>(CalendarService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method createEvent
       * @method createEvent
       *
       * @description
       * Creates a standalone event, then re-reads the last loaded window on
       * success so the new entry appears alongside the other three sources.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<CalendarEventCreateCommand>}
       */
      createEvent: rxMethod<CalendarEventCreateCommand>(
        pipe(
          tap(() => patchState(store, { createEventCallState: pendingCallState() })),
          switchMap((command) =>
            service.createEvent(command.organizationId, command.input).pipe(
              tapResponse({
                next: (event) => {
                  patchState(store, { createEventCallState: successCallState(event) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) =>
                  patchState(store, { createEventCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method updateEvent
       * @method updateEvent
       *
       * @description
       * Merge-patches a standalone event, then re-reads the last loaded window
       * on success.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<CalendarEventUpdateCommand>}
       */
      updateEvent: rxMethod<CalendarEventUpdateCommand>(
        pipe(
          tap(() => patchState(store, { updateEventCallState: pendingCallState() })),
          switchMap((command) =>
            service.updateEvent(command.organizationId, command.eventId, command.input).pipe(
              tapResponse({
                next: (event) => {
                  patchState(store, { updateEventCallState: successCallState(event) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) =>
                  patchState(store, { updateEventCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method deleteEvent
       * @method deleteEvent
       *
       * @description
       * Deletes a standalone event, then re-reads the last loaded window on
       * success.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<CalendarEventDeleteCommand>}
       */
      deleteEvent: rxMethod<CalendarEventDeleteCommand>(
        pipe(
          tap(() => patchState(store, { deleteEventCallState: pendingCallState() })),
          switchMap((command) =>
            service.deleteEvent(command.organizationId, command.eventId).pipe(
              tapResponse({
                next: () => {
                  patchState(store, { deleteEventCallState: successCallState(null) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) =>
                  patchState(store, { deleteEventCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method moveEvent
       * @method moveEvent
       *
       * @description
       * Drag-reschedules a standalone event: the loaded feed's matching
       * entry is **optimistically** repositioned onto its new instants
       * first, then the merge-patch (`startsAt`, plus `endsAt` only when the
       * command carries one) is sent. Success still re-reads the last loaded
       * window, so the server's own merge/sort reconciles the optimistic
       * guess; failure rolls the entry back to the snapshot taken before the
       * patch and dispatches {@link calendarFeedStoreEvents.moveEventFailed}
       * for the app-wide toast. This is the feature's one sanctioned
       * exception to the refresh-after-write invariant (`FEATURE.md`) — a
       * dropped chip snapping back to its old day for a round-trip would
       * read as a failed drop. `concatMap`: a second drop queues behind the
       * first instead of racing its rollback snapshot.
       *
       * @access public
       * @since 1.2.0
       *
       * @type {RxMethod<CalendarEventMoveCommand>}
       */
      moveEvent: rxMethod<CalendarEventMoveCommand>(
        pipe(
          concatMap((command) => {
            const previous: CalendarFeedOutput | null = store.queryData();
            const input: UpdateCalendarEventInput = {
              startsAt: command.startsAt,
              ...(command.endsAt !== undefined ? { endsAt: command.endsAt } : {}),
            };

            patchState(store, { moveEventCallState: pendingCallState() });
            if (previous !== null) {
              const optimistic: CalendarFeedOutput = {
                ...previous,
                items: previous.items.map((item: CalendarFeedItemOutput): CalendarFeedItemOutput =>
                  item.sourceKey === 'calendar_event' && item.id === command.eventId
                    ? { ...item, ...input }
                    : item,
                ),
              };
              patchState(store, setSuccessQuery(optimistic));
            }

            return service.updateEvent(command.organizationId, command.eventId, input).pipe(
              tapResponse({
                next: (event) => {
                  patchState(store, { moveEventCallState: successCallState(event) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);

                  if (previous !== null) patchState(store, setSuccessQuery(previous));
                  patchState(store, { moveEventCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    calendarFeedStoreEvents.moveEventFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        $localize`:@@calendar.moveError:The event could not be moved.`,
                      ),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method resetWriteCallStates
       * @method resetWriteCallStates
       *
       * @description
       * Idles the three write call states — called once a dialog that surfaced
       * a rejection is dismissed, so re-opening it never shows a stale error.
       *
       * @access public
       * @since 1.1.0
       *
       * @returns {void}
       */
      resetWriteCallStates(): void {
        patchState(store, {
          createEventCallState: idleCallState(),
          updateEventCallState: idleCallState(),
          deleteEventCallState: idleCallState(),
          moveEventCallState: idleCallState(),
        });
      },
    }),
  ),
);

/**
 * Type CalendarFeedStoreType
 *
 * @description
 * Defines the supported calendar feed store type values.
 */
export type CalendarFeedStoreType = InstanceType<typeof CalendarFeedStore>;

/**
 * Interface CalendarFeedLoadCapable
 * @interface CalendarFeedLoadCapable
 *
 * @description
 * The slice of {@link CalendarFeedStoreType} {@link refreshLastWindow} needs —
 * narrower than the full store type since it runs from inside the second
 * `withMethods` block, before that block's own methods exist on the `store`
 * parameter it closes over.
 *
 * @since 1.1.0
 */
interface CalendarFeedLoadCapable {
  readonly lastLoadCommand: () => CalendarFeedLoadCommand | null;
  readonly load: (command: CalendarFeedLoadCommand) => void;
}

/**
 * Function refreshLastWindow
 *
 * @description
 * Re-invokes {@link CalendarFeedStore}'s `load` with the last command it
 * remembered, when the store has read at least once. A component-scoped
 * store instance always has an active `load` subscription by the time a
 * write can succeed, since the page's constructor effect fires it
 * immediately on mount.
 *
 * @access private
 * @since 1.1.0
 *
 * @param {CalendarFeedLoadCapable} store - The store instance mid-`withMethods`.
 *
 * @returns {void}
 */
function refreshLastWindow(store: CalendarFeedLoadCapable): void {
  const command: CalendarFeedLoadCommand | null = store.lastLoadCommand();
  if (command === null) return;

  store.load(command);
}
