import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  successCallState,
  toStoreError,
  withQueryState,
  type CallState,
} from '@core/request-state';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type {
  CalendarEventOutput,
  CalendarFeedItemOutput,
  CalendarFeedOutput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
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
  readonly lastLoadCommand: CalendarFeedLoadCommand | null;
}

const INITIAL_WRITE_STATE: CalendarFeedWriteState = {
  createEventCallState: idleCallState(),
  updateEventCallState: idleCallState(),
  deleteEventCallState: idleCallState(),
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
 * window (`FEATURE.md` "Refresh after write").
 *
 * @version 1.1.0
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
  withMethods((store, service = inject<CalendarService>(CalendarService)) => ({
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
      });
    },
  })),
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
