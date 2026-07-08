import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntities, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, EMPTY, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallError,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { INTERVENTION_BOARD_COLUMNS } from '@features/organization/features/interventions/constants';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionBoardBucket,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { interventionBoardStoreEvents } from './events';
import type {
  InterventionBoardLoadMoreCommand,
  InterventionBoardLoadRequest,
  InterventionBoardMoveCommand,
  InterventionBoardState,
} from './models';

/**
 * Constant BOARD_COLUMN_PAGE_SIZE
 * @const BOARD_COLUMN_PAGE_SIZE
 *
 * @description
 * Maximum number of cards fetched per lane in a single page. The lane count
 * badge reads the server total, so a lane can advertise more interventions than
 * it renders until the user reveals further pages through "Load more".
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const BOARD_COLUMN_PAGE_SIZE = 20;

/**
 * Constant COUNTS_PAGE_SIZE
 * @const COUNTS_PAGE_SIZE
 *
 * @description
 * Page size of the lightweight per-status counts fetch: a single item is enough
 * to read `hydra:totalItems` without paying for a full card page, so the metric
 * strip totals can load on any view without the board card fetch.
 *
 * @since 1.1.0
 *
 * @type {number}
 */
const COUNTS_PAGE_SIZE = 1;

/**
 * Constant BOARD_STATUSES
 * @const BOARD_STATUSES
 *
 * @description
 * Flat list of every workflow status backing a lane, queried once each on load.
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionStatus[]}
 */
const BOARD_STATUSES: readonly InterventionStatus[] = INTERVENTION_BOARD_COLUMNS.flatMap(
  (column) => column.statuses,
);

/**
 * Constant ZERO_TOTALS
 * @const ZERO_TOTALS
 *
 * @description
 * Per-status totals reset value.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<InterventionStatus, number>>}
 */
const ZERO_TOTALS: Readonly<Record<InterventionStatus, number>> = {
  draft: 0,
  planned: 0,
  in_progress: 0,
  submitted: 0,
  changes_requested: 0,
  published: 0,
  abandoned: 0,
};

/**
 * Constant ZERO_PAGES
 * @const ZERO_PAGES
 *
 * @description
 * Per-status loaded-page reset value (no page fetched yet).
 *
 * @since 1.1.0
 *
 * @type {Readonly<Record<InterventionStatus, number>>}
 */
const ZERO_PAGES: Readonly<Record<InterventionStatus, number>> = { ...ZERO_TOTALS };

/**
 * Constant FIRST_PAGES
 * @const FIRST_PAGES
 *
 * @description
 * Per-status loaded-page value after a full board load: every status has had
 * its first page fetched.
 *
 * @since 1.1.0
 *
 * @type {Readonly<Record<InterventionStatus, number>>}
 */
const FIRST_PAGES: Readonly<Record<InterventionStatus, number>> = {
  draft: 1,
  planned: 1,
  in_progress: 1,
  submitted: 1,
  changes_requested: 1,
  published: 1,
  abandoned: 1,
};

/**
 * Constant IDLE_LOAD_MORE_STATES
 * @const IDLE_LOAD_MORE_STATES
 *
 * @description
 * Per-lane load-more call-state reset value.
 *
 * @since 1.1.0
 *
 * @type {Readonly<Record<InterventionBoardColumnId, CallState>>}
 */
const IDLE_LOAD_MORE_STATES: InterventionBoardState['loadMoreCallStates'] = {
  draft: idleCallState(),
  planned: idleCallState(),
  in_progress: idleCallState(),
  review: idleCallState(),
  published: idleCallState(),
};

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state for the component-scoped {@link InterventionBoardStore}.
 *
 * @since 1.0.0
 *
 * @type {InterventionBoardState}
 */
const INITIAL_STATE: InterventionBoardState = {
  statusTotals: ZERO_TOTALS,
  statusPages: ZERO_PAGES,
  countsCallState: idleCallState(),
  loadCallState: idleCallState(),
  loadMoreCallStates: IDLE_LOAD_MORE_STATES,
  moveCallState: idleCallState(),
};

/**
 * Function shiftTotals
 *
 * @description
 * Returns a copy of the per-status totals with one intervention moved from
 * `from` to `to`, clamping the source at zero.
 *
 * @param {Readonly<Record<InterventionStatus, number>>} totals - Current totals.
 * @param {InterventionStatus} from - Source status.
 * @param {InterventionStatus} to - Target status.
 *
 * @returns {Record<InterventionStatus, number>} Adjusted totals.
 *
 * @since 1.0.0
 */
function shiftTotals(
  totals: Readonly<Record<InterventionStatus, number>>,
  from: InterventionStatus,
  to: InterventionStatus,
): Record<InterventionStatus, number> {
  if (from === to) return { ...totals };

  return {
    ...totals,
    [from]: Math.max(0, totals[from] - 1),
    [to]: totals[to] + 1,
  };
}

/**
 * Store InterventionBoardStore
 * @const InterventionBoardStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the intervention pipeline board.
 * Totals feeding the metric strip come from a lightweight {@link loadCounts}
 * fetch (one `itemsPerPage=1` query per status) that can run on any view, while
 * the heavier {@link load} fetches a bounded page of cards per lane and runs
 * only on the board view. {@link loadMore} reveals the next bounded page for a
 * single lane by fetching the next page of each backing status and appending it
 * (de-duped by id, order preserved), and {@link move} applies an optimistic
 * status transition with rollback on failure. Cards are held in a flat
 * `withEntities` collection and grouped into lanes by the {@link columns}
 * computed, so an optimistic move re-buckets the card with no extra bookkeeping.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionBoardStore = signalStore(
  withEntities({ entity: type<InterventionOutput>(), collection: 'intervention' }),
  withState<InterventionBoardState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Computed columns.
     *
     * @description
     * Lanes in display order, each carrying its grouped cards, server total and
     * whether an incremental "load more" fetch is currently in flight for it.
     */
    columns: computed<readonly InterventionBoardBucket[]>(() => {
      const interventions: readonly InterventionOutput[] = store.interventionEntities();
      const totals: Readonly<Record<InterventionStatus, number>> = store.statusTotals();
      const loadMoreStates: InterventionBoardState['loadMoreCallStates'] =
        store.loadMoreCallStates();

      return INTERVENTION_BOARD_COLUMNS.map(
        (column): InterventionBoardBucket => ({
          id: column.id,
          items: interventions.filter((intervention) =>
            column.statuses.includes(intervention.status),
          ),
          total: column.statuses.reduce((sum, status) => sum + totals[status], 0),
          loadingMore: loadMoreStates[column.id].status === 'pending',
        }),
      );
    }),

    /**
     * Computed loading.
     *
     * @description
     * True while the board cards are loading.
     */
    loading: computed<boolean>(() => store.loadCallState().status === 'pending'),

    /**
     * Computed countsLoading.
     *
     * @description
     * True while the lightweight per-status counts feeding the metric strip are
     * loading. Distinct from {@link loading}, which tracks the board card fetch.
     */
    countsLoading: computed<boolean>(() => store.countsCallState().status === 'pending'),

    /**
     * Computed loadError.
     *
     * @description
     * Normalized error from the last failed board card load, or `null` when the
     * load is idle, pending or successful. Lets the page tell a genuine failure
     * apart from a legitimately empty board.
     */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();

      return isCallError(state) ? state.error : null;
    }),

    /**
     * Computed isEmpty.
     *
     * @description
     * True only when the board has no cards and the last card load neither is in
     * flight nor failed — a failed load surfaces an error, not the empty state.
     */
    isEmpty: computed<boolean>(() => {
      const status = store.loadCallState().status;

      return store.interventionIds().length === 0 && status !== 'pending' && status !== 'error';
    }),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      service = inject<InterventionService>(InterventionService),
    ) => ({
      /**
       * Method loadCounts
       * @method loadCounts
       *
       * @description
       * Refreshes the per-status server totals feeding the metric strip through a
       * lightweight fetch (one `itemsPerPage=1` query per status reading only
       * `hydra:totalItems`). Runs on every view so switching to the list or
       * calendar view keeps the metric strip populated without paying for the
       * board card data. Resolves to zero totals when no organization is active.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<InterventionBoardLoadRequest>}
       */
      loadCounts: rxMethod<InterventionBoardLoadRequest>(
        pipe(
          tap(() => patchState(store, { countsCallState: pendingCallState() })),
          switchMap(({ organizationId }) => {
            if (!organizationId) {
              patchState(store, {
                statusTotals: ZERO_TOTALS,
                countsCallState: successCallState(null),
              });

              return EMPTY;
            }

            return forkJoin(
              BOARD_STATUSES.map((status) =>
                service.list(organizationId, { status, itemsPerPage: COUNTS_PAGE_SIZE }),
              ),
            ).pipe(
              tapResponse({
                next: (collections) => {
                  const statusTotals: Record<InterventionStatus, number> = { ...ZERO_TOTALS };
                  BOARD_STATUSES.forEach((status, index) => {
                    statusTotals[status] = collections[index].totalItems;
                  });

                  patchState(store, {
                    statusTotals,
                    countsCallState: successCallState(null),
                  });
                },
                error: (error: unknown) =>
                  patchState(store, { countsCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method load
       * @method load
       *
       * @description
       * Loads the first bounded page of cards for every lane plus the per-status
       * totals, resetting each status to page 1. Runs on the board view only.
       * Resolves to an empty board when no organization is active.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<InterventionBoardLoadRequest>}
       */
      load: rxMethod<InterventionBoardLoadRequest>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(({ organizationId }) => {
            if (!organizationId) {
              patchState(
                store,
                setAllEntities([] as InterventionOutput[], { collection: 'intervention' }),
                {
                  statusTotals: ZERO_TOTALS,
                  statusPages: ZERO_PAGES,
                  loadMoreCallStates: IDLE_LOAD_MORE_STATES,
                  loadCallState: successCallState(null),
                },
              );

              return EMPTY;
            }

            return forkJoin(
              BOARD_STATUSES.map((status) =>
                service.list(organizationId, {
                  status,
                  itemsPerPage: BOARD_COLUMN_PAGE_SIZE,
                  order: { updatedAt: 'desc' },
                }),
              ),
            ).pipe(
              tapResponse({
                next: (collections) => {
                  const members: InterventionOutput[] = collections.flatMap(
                    (collection) => collection.member,
                  );
                  const statusTotals: Record<InterventionStatus, number> = { ...ZERO_TOTALS };
                  BOARD_STATUSES.forEach((status, index) => {
                    statusTotals[status] = collections[index].totalItems;
                  });

                  patchState(store, setAllEntities(members, { collection: 'intervention' }), {
                    statusTotals,
                    statusPages: FIRST_PAGES,
                    loadMoreCallStates: IDLE_LOAD_MORE_STATES,
                    loadCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { loadCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionBoardStoreEvents.loadFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        'Failed to load the intervention board',
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
       * Method loadMore
       * @method loadMore
       *
       * @description
       * Reveals the next bounded page of one lane: for every workflow status
       * backing the lane that still has un-loaded cards
       * (`loadedPages * pageSize < total`), the next page is fetched and appended
       * to the flat collection — de-duped by id (existing cards are kept, so a
       * pending optimistic move is never clobbered) and order-preserving, since
       * `addEntities` appends only new ids. The per-lane call state tracks the
       * request; fetches are serialized to keep the appended state consistent.
       *
       * @access public
       * @since 1.1.0
       *
       * @type {RxMethod<InterventionBoardLoadMoreCommand>}
       */
      loadMore: rxMethod<InterventionBoardLoadMoreCommand>(
        pipe(
          concatMap(({ organizationId, columnId }) => {
            const column = INTERVENTION_BOARD_COLUMNS.find(
              (candidate) => candidate.id === columnId,
            );
            if (!organizationId || !column) return EMPTY;

            const totals: Readonly<Record<InterventionStatus, number>> = store.statusTotals();
            const pages: Readonly<Record<InterventionStatus, number>> = store.statusPages();
            const pending: readonly InterventionStatus[] = column.statuses.filter(
              (status) => pages[status] * BOARD_COLUMN_PAGE_SIZE < totals[status],
            );
            if (pending.length === 0) return EMPTY;

            patchState(store, {
              loadMoreCallStates: {
                ...store.loadMoreCallStates(),
                [columnId]: pendingCallState(),
              },
            });

            return forkJoin(
              pending.map((status) =>
                service.list(organizationId, {
                  status,
                  page: pages[status] + 1,
                  itemsPerPage: BOARD_COLUMN_PAGE_SIZE,
                  order: { updatedAt: 'desc' },
                }),
              ),
            ).pipe(
              tapResponse({
                next: (collections) => {
                  const members: InterventionOutput[] = collections.flatMap(
                    (collection) => collection.member,
                  );
                  const nextTotals: Record<InterventionStatus, number> = {
                    ...store.statusTotals(),
                  };
                  const nextPages: Record<InterventionStatus, number> = { ...store.statusPages() };
                  pending.forEach((status, index) => {
                    nextTotals[status] = collections[index].totalItems;
                    nextPages[status] = pages[status] + 1;
                  });

                  patchState(store, addEntities(members, { collection: 'intervention' }), {
                    statusTotals: nextTotals,
                    statusPages: nextPages,
                    loadMoreCallStates: {
                      ...store.loadMoreCallStates(),
                      [columnId]: successCallState(null),
                    },
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, {
                    loadMoreCallStates: {
                      ...store.loadMoreCallStates(),
                      [columnId]: errorCallState(storeError),
                    },
                  });
                  dispatcher.dispatch(
                    interventionBoardStoreEvents.loadMoreFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load more interventions'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method move
       * @method move
       *
       * @description
       * Applies an optimistic status transition: the card re-buckets immediately
       * and the lane totals shift, then the server PATCH confirms (replacing the
       * card with the returned revision) or the change is rolled back and a
       * failure event is dispatched. Moves are serialized to keep the optimistic
       * state consistent.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<InterventionBoardMoveCommand>}
       */
      move: rxMethod<InterventionBoardMoveCommand>(
        pipe(
          concatMap(({ intervention, toStatus }) => {
            const previousTotals: Readonly<Record<InterventionStatus, number>> =
              store.statusTotals();

            patchState(
              store,
              updateEntity(
                { id: intervention.id, changes: { status: toStatus } },
                { collection: 'intervention' },
              ),
              {
                statusTotals: shiftTotals(previousTotals, intervention.status, toStatus),
                moveCallState: pendingCallState(),
              },
            );

            return service
              .update(intervention.id, { status: toStatus }, intervention.revision)
              .pipe(
                tapResponse({
                  next: (updated: InterventionOutput) =>
                    patchState(
                      store,
                      updateEntity(
                        { id: updated.id, changes: updated },
                        { collection: 'intervention' },
                      ),
                      { moveCallState: successCallState(null) },
                    ),
                  error: (error: unknown) => {
                    const storeError = toStoreError(error);
                    patchState(
                      store,
                      updateEntity(
                        { id: intervention.id, changes: intervention },
                        { collection: 'intervention' },
                      ),
                      { statusTotals: previousTotals, moveCallState: errorCallState(storeError) },
                    );
                    dispatcher.dispatch(
                      interventionBoardStoreEvents.moveFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to move intervention'),
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
 * Type InterventionBoardStoreType
 * @type InterventionBoardStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionBoardStore}.
 *
 * @since 1.0.0
 */
export type InterventionBoardStoreType = InstanceType<typeof InterventionBoardStore>;
