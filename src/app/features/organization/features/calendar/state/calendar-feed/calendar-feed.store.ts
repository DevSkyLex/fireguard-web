import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, EMPTY, map, mergeMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  resetQuery,
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
  CalendarFeedSourceOutput,
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property from
   * @readonly
   *
   * @description
   * Marks the beginning of the requested calendar feed load range.
   *
   * @access public
   *
   * @type {string}
   */
  readonly from: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Marks the end of the requested calendar feed load range.
   *
   * @access public
   *
   * @type {string}
   */
  readonly to: string;
}

/**
 * Interface CalendarEventCreateCommand
 * @interface CalendarEventCreateCommand
 *
 * @description
 * The organization and the event to create.
 *
 * @since 1.1.0
 */
export interface CalendarEventCreateCommand {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Carries the values submitted to calendar event create.
   *
   * @access public
   *
   * @type {CreateCalendarEventInput}
   */
  readonly input: CreateCalendarEventInput;
}

/**
 * Interface CalendarEventUpdateCommand
 * @interface CalendarEventUpdateCommand
 *
 * @description
 * The organization, the event to update, and its dirty fields only.
 *
 * @since 1.1.0
 */
export interface CalendarEventUpdateCommand {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property eventId
   * @readonly
   *
   * @description
   * Identifies the event associated with this calendar event update.
   *
   * @access public
   *
   * @type {string}
   */
  readonly eventId: string;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Carries the values submitted to calendar event update.
   *
   * @access public
   *
   * @type {UpdateCalendarEventInput}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property eventId
   * @readonly
   *
   * @description
   * Identifies the event associated with this calendar event move.
   *
   * @access public
   *
   * @type {string}
   */
  readonly eventId: string;

  /**
   * Property startsAt
   * @readonly
   *
   * @description
   * Records when this calendar event move starts.
   *
   * @access public
   *
   * @type {string}
   */
  readonly startsAt: string;

  /**
   * Property endsAt
   * @readonly
   *
   * @description
   * Records when this calendar event move ends.
   *
   * @access public
   *
   * @type {string}
   */
  readonly endsAt?: string;
}

/**
 * Interface CalendarEventDeleteCommand
 * @interface CalendarEventDeleteCommand
 *
 * @description
 * The organization and the event to delete.
 *
 * @since 1.1.0
 */
export interface CalendarEventDeleteCommand {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property eventId
   * @readonly
   *
   * @description
   * Identifies the event associated with this calendar event delete.
   *
   * @access public
   *
   * @type {string}
   */
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
  /**
   * Property contextRevision
   * @readonly
   *
   * @description
   * Distinguishes separate organization visits for accepted CRUD writes and queued moves.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {number}
   */
  readonly contextRevision: number;

  /**
   * Property feedRevision
   * @readonly
   *
   * @description
   * Invalidates optimistic snapshots as soon as a window read starts or resolves.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {number}
   */
  readonly feedRevision: number;

  /**
   * Property createEventCallState
   * @readonly
   *
   * @description
   * Tracks the request state for create event.
   *
   * @access public
   *
   * @type {CallState<CalendarEventOutput>}
   */
  readonly createEventCallState: CallState<CalendarEventOutput>;

  /**
   * Property updateEventCallState
   * @readonly
   *
   * @description
   * Tracks the request state for update event.
   *
   * @access public
   *
   * @type {CallState<CalendarEventOutput>}
   */
  readonly updateEventCallState: CallState<CalendarEventOutput>;

  /**
   * Property deleteEventCallState
   * @readonly
   *
   * @description
   * Tracks the request state for delete event.
   *
   * @access public
   *
   * @type {CallState<null>}
   */
  readonly deleteEventCallState: CallState<null>;

  /**
   * Property moveEventCallState
   * @readonly
   *
   * @description
   * Tracks the request state for move event.
   *
   * @access public
   *
   * @type {CallState<CalendarEventOutput>}
   */
  readonly moveEventCallState: CallState<CalendarEventOutput>;

  /**
   * Property lastLoadCommand
   * @readonly
   *
   * @description
   * Retains the last calendar range so the store can repeat the same load after invalidation.
   *
   * @access public
   *
   * @type {CalendarFeedLoadCommand | null}
   */
  readonly lastLoadCommand: CalendarFeedLoadCommand | null;
}

/**
 * Constant INITIAL_WRITE_STATE
 *
 * @description
 * Initializes calendar event write states and revision counters before any event mutation runs.
 *
 * @access public
 *
 * @type {CalendarFeedWriteState}
 */
const INITIAL_WRITE_STATE: CalendarFeedWriteState = {
  contextRevision: 0,
  feedRevision: 0,
  createEventCallState: idleCallState(),
  updateEventCallState: idleCallState(),
  deleteEventCallState: idleCallState(),
  moveEventCallState: idleCallState(),
  lastLoadCommand: null,
};

/**
 * Constant CalendarFeedStore
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
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @constant CalendarFeedStore
 */
export const CalendarFeedStore = signalStore(
  withQueryState<CalendarFeedOutput>(),
  withState<CalendarFeedWriteState>(INITIAL_WRITE_STATE),
  withComputed((store) => ({
    /**
     * @description
     * The merged feed entries, empty until the first window resolves.
     */
    items: computed<readonly CalendarFeedItemOutput[]>(() => store.queryData()?.items ?? []),

    /**
     * Property isComplete
     * @readonly
     *
     * @description
     * Whether every authorized source returned its complete bounded window.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    isComplete: computed<boolean>(() => store.queryData()?.complete !== false),

    /**
     * Property partialSources
     * @readonly
     *
     * @description
     * Server-declared unavailable or truncated contributors.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<readonly CalendarFeedSourceOutput[]>}
     */
    partialSources: computed<readonly CalendarFeedSourceOutput[]>(() =>
      (store.queryData()?.sources ?? []).filter((source) => !source.available || source.truncated),
    ),

    /**
     * Property hasTruncation
     * @readonly
     *
     * @description
     * Whether reducing the date range can recover omitted entries.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {Signal<boolean>}
     */
    hasTruncation: computed<boolean>(() =>
      (store.queryData()?.sources ?? []).some((source) => source.truncated),
    ),
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
        tap((command) => {
          if (store.lastLoadCommand()?.organizationId !== command.organizationId) {
            patchState(store, resetQuery(), {
              contextRevision: store.contextRevision() + 1,
              createEventCallState: idleCallState(),
              updateEventCallState: idleCallState(),
              deleteEventCallState: idleCallState(),
              moveEventCallState: idleCallState(),
            });
          }
          patchState(store, { lastLoadCommand: command, feedRevision: store.feedRevision() + 1 });
        }),
        switchMap((command) => {
          patchState(store, setPendingQuery());

          return service.getFeed(command.organizationId, command.from, command.to).pipe(
            tapResponse({
              next: (feed) =>
                patchState(store, setSuccessQuery(feed), {
                  feedRevision: store.feedRevision() + 1,
                }),
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
          map((command) => ({ command, contextRevision: store.contextRevision() })),
          mergeMap(({ command, contextRevision }) => {
            if (store.createEventCallState().status === 'pending') return EMPTY;
            if (
              store.lastLoadCommand() !== null &&
              store.lastLoadCommand()?.organizationId !== command.organizationId
            )
              return EMPTY;
            patchState(store, { createEventCallState: pendingCallState() });
            return service.createEvent(command.organizationId, command.input).pipe(
              tapResponse({
                next: (event) => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { createEventCallState: successCallState(event) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { createEventCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
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
          map((command) => ({ command, contextRevision: store.contextRevision() })),
          mergeMap(({ command, contextRevision }) => {
            if (store.updateEventCallState().status === 'pending') return EMPTY;
            if (
              store.lastLoadCommand() !== null &&
              store.lastLoadCommand()?.organizationId !== command.organizationId
            )
              return EMPTY;
            patchState(store, { updateEventCallState: pendingCallState() });
            return service.updateEvent(command.organizationId, command.eventId, command.input).pipe(
              tapResponse({
                next: (event) => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { updateEventCallState: successCallState(event) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { updateEventCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
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
          map((command) => ({ command, contextRevision: store.contextRevision() })),
          mergeMap(({ command, contextRevision }) => {
            if (store.deleteEventCallState().status === 'pending') return EMPTY;
            if (
              store.lastLoadCommand() !== null &&
              store.lastLoadCommand()?.organizationId !== command.organizationId
            )
              return EMPTY;
            patchState(store, { deleteEventCallState: pendingCallState() });
            return service.deleteEvent(command.organizationId, command.eventId).pipe(
              tapResponse({
                next: () => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { deleteEventCallState: successCallState(null) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { deleteEventCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
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
       * guess; failure restores only that entry while its feed revision is current,
       * and dispatches {@link calendarFeedStoreEvents.moveEventFailed}
       * for the app-wide toast. This is the feature's one sanctioned
       * exception to the refresh-after-write invariant (`FEATURE.md`) — a
       * dropped chip snapping back to its old day for a round-trip would
       * read as a failed drop. `concatMap`: a second drop queues behind the
       * first instead of racing its rollback snapshot. Context is captured before queuing;
       * commands and results from an abandoned organization visit are ignored.
       *
       * @access public
       * @since 1.2.0
       *
       * @type {RxMethod<CalendarEventMoveCommand>}
       */
      moveEvent: rxMethod<CalendarEventMoveCommand>(
        pipe(
          map((command) => ({
            command,
            contextRevision: store.contextRevision(),
            feedRevision: store.feedRevision(),
          })),
          concatMap(({ command, contextRevision, feedRevision }) => {
            if (
              contextRevision !== store.contextRevision() ||
              (store.lastLoadCommand() !== null &&
                store.lastLoadCommand()?.organizationId !== command.organizationId)
            )
              return EMPTY;
            const feed = store.queryData();
            const previous =
              feedRevision === store.feedRevision() && !store.isQueryLoading()
                ? feed?.items.find(
                    (item) => item.sourceKey === 'calendar_event' && item.id === command.eventId,
                  )
                : undefined;
            const input: UpdateCalendarEventInput = {
              startsAt: command.startsAt,
              ...(command.endsAt !== undefined ? { endsAt: command.endsAt } : {}),
            };

            patchState(store, { moveEventCallState: pendingCallState() });
            if (feed !== null && previous !== undefined) {
              const moved: CalendarFeedItemOutput = { ...previous, ...input };
              const optimistic: CalendarFeedOutput = {
                ...feed,
                items: feed.items.map((item: CalendarFeedItemOutput): CalendarFeedItemOutput =>
                  item.sourceKey === 'calendar_event' && item.id === command.eventId ? moved : item,
                ),
              };
              patchState(store, setSuccessQuery(optimistic));
            }

            return service.updateEvent(command.organizationId, command.eventId, input).pipe(
              tapResponse({
                next: (event) => {
                  if (contextRevision !== store.contextRevision()) return;
                  patchState(store, { moveEventCallState: successCallState(event) });
                  refreshLastWindow(store);
                },
                error: (error: unknown) => {
                  if (contextRevision !== store.contextRevision()) return;
                  const storeError: StoreError = toStoreError(error);
                  const currentFeed = store.queryData();
                  if (
                    previous !== undefined &&
                    currentFeed !== null &&
                    feedRevision === store.feedRevision()
                  ) {
                    patchState(
                      store,
                      setSuccessQuery<CalendarFeedOutput>({
                        ...currentFeed,
                        items: currentFeed.items.map((item) =>
                          item.sourceKey === 'calendar_event' && item.id === command.eventId
                            ? previous
                            : item,
                        ),
                      }),
                    );
                  }
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
       * Clears settled write states before reopening a dialog, while retaining accepted pending
       * operations until they finish.
       *
       * @access public
       * @since 1.1.0
       *
       * @returns {void}
       */
      resetWriteCallStates(): void {
        patchState(store, {
          createEventCallState:
            store.createEventCallState().status === 'pending'
              ? store.createEventCallState()
              : idleCallState(),
          updateEventCallState:
            store.updateEventCallState().status === 'pending'
              ? store.updateEventCallState()
              : idleCallState(),
          deleteEventCallState:
            store.deleteEventCallState().status === 'pending'
              ? store.deleteEventCallState()
              : idleCallState(),
          moveEventCallState:
            store.moveEventCallState().status === 'pending'
              ? store.moveEventCallState()
              : idleCallState(),
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
 *
 * @type
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
  /**
   * Property lastLoadCommand
   * @readonly
   *
   * @description
   * Retains the last calendar range so the store can repeat the same load after invalidation.
   *
   * @access public
   *
   * @type {() => CalendarFeedLoadCommand | null}
   */
  readonly lastLoadCommand: () => CalendarFeedLoadCommand | null;

  /**
   * Property load
   * @readonly
   *
   * @description
   * Reloads the calendar feed using the supplied organization and date range.
   *
   * @access public
   *
   * @type {(command: CalendarFeedLoadCommand) => void}
   */
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
